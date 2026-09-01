import crypto from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import type {
  InPersonMethod,
  LecturerAssistedMarkBody,
  SubmitInPersonAttendanceBody,
} from "./index.js";
import {
  BLE_ROTATION_SECONDS as BLE_WINDOW_SECONDS,
  normalizeUnitCode,
  PIN_ROTATION_SECONDS as PIN_WINDOW_SECONDS,
  QR_ROTATION_SECONDS as QR_WINDOW_SECONDS,
} from "./inPerson.schema.js";

const MAX_PIN_DRIFT = 1;

const safeEqualHex = (expected: string, received: string) => {
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const decodeRelay = (raw: string) => {
  if (!raw.startsWith("MWIR1:")) throw new Error("RELAY_FORMAT_INVALID");
  const value = JSON.parse(
    Buffer.from(raw.slice(6), "base64").toString("utf8")
  ) as {
    version: number;
    parentPayload: string;
    relayerId: string;
    counter: number;
    signature: string;
  };
  if (
    value.version !== 1 ||
    !value.parentPayload ||
    !value.relayerId ||
    !Number.isInteger(value.counter)
  )
    throw new Error("RELAY_FORMAT_INVALID");
  return value;
};

// The 9-byte compact BLE wire format has no room for an HMAC — it's a
// deliberate size/power tradeoff for BLE advertising payloads. This means a
// captured beacon could in principle be rebroadcast by anyone with BLE
// hardware within its rotation window. Accepted residual risk, mitigated by:
// the short rotation window (BLE_WINDOW_SECONDS), relay election (avoids
// blindly trusting every relay), motion-verification on the mobile client,
// and manifest-anchored trust for discovery. QR and PIN carry a real HMAC
// signature and don't share this limitation.
const decodeBle = (raw: string) => {
  if (!raw.startsWith("MWBLE1:")) throw new Error("BLE_FORMAT_INVALID");
  const bytes = Buffer.from(raw.slice(7), "base64");
  if (bytes.length !== 9 || bytes.readUInt8(8) !== 1)
    throw new Error("BLE_FORMAT_INVALID");
  return {
    nonce: bytes.readUInt32BE(0),
    counter: bytes.readUInt16BE(4),
    unitId: bytes.readUInt16BE(6),
  };
};

interface SignedPayload {
  version: 1;
  sessionId: string;
  unitCode: string;
  sessionNonce: number;
  sessionStart: number;
  expiresAt: number;
  counter: number;
  issuedAt: number;
  signature: string;
}

const canonical = (payload: Omit<SignedPayload, "signature">) =>
  [
    payload.version,
    payload.sessionId,
    payload.unitCode,
    payload.sessionNonce,
    payload.sessionStart,
    payload.expiresAt,
    payload.counter,
    payload.issuedAt,
  ].join("|");

const decodePayload = (raw: string): SignedPayload => {
  if (!raw.startsWith("MWIP1:"))
    throw new Error("Unsupported attendance payload");
  const payload = JSON.parse(
    Buffer.from(raw.slice(6), "base64").toString("utf8")
  ) as SignedPayload;
  if (
    payload.version !== 1 ||
    !payload.sessionId ||
    !Number.isFinite(payload.sessionStart) ||
    !Number.isFinite(payload.expiresAt) ||
    !payload.signature
  )
    throw new Error("Malformed attendance payload");
  return payload;
};

export class InPersonVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * One device marking multiple different student accounts present is a
   * strong fraud signal. Every verification path checks this — not just the
   * original QR path — before a record is created.
   */
  private async assertNoDeviceConflict(
    conductedSessionId: string,
    deviceId: string | undefined,
    studentId: string
  ) {
    if (!deviceId) return;
    const deviceUse = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { conductedSessionId, deviceId },
    });
    if (deviceUse && deviceUse.studentId !== studentId)
      throw new Error("DEVICE_CONFLICT");
  }

  async verify(
    input: SubmitInPersonAttendanceBody & { studentId: string },
    allowEndedSession = false
  ) {
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const now = Date.now();
    const sessionStart = session.sessionStart.getTime();
    const expiry = sessionStart + session.sessionDuration * 1000;
    if (
      (!allowEndedSession && session.sessionEnd) ||
      now < sessionStart - 15_000 ||
      (!allowEndedSession && now > expiry + 15_000)
    )
      throw new Error("SESSION_EXPIRED");

    const scannedAt = new Date(input.scannedAt).getTime();
    if (
      !Number.isFinite(scannedAt) ||
      scannedAt > now + 15_000 ||
      scannedAt < sessionStart - 15_000
    )
      throw new Error("SCAN_TIME_INVALID");
    if (input.method === "ble") return this.verifyBle(input);
    const payload = decodePayload(input.rawPayload);
    if (payload.sessionId !== session.id) throw new Error("SESSION_MISMATCH");
    if (
      normalizeUnitCode(payload.unitCode) !==
      normalizeUnitCode(session.unitCode)
    )
      throw new Error("UNIT_MISMATCH");
    if (
      normalizeUnitCode(input.unitCode) !== normalizeUnitCode(session.unitCode)
    )
      throw new Error("REQUEST_UNIT_MISMATCH");
    if (BigInt(payload.sessionNonce) !== session.sessionNonce)
      throw new Error("NONCE_MISMATCH");
    if (
      !Number.isFinite(payload.issuedAt) ||
      payload.issuedAt < sessionStart - 15_000 ||
      payload.issuedAt > expiry + 15_000
    )
      throw new Error("ISSUED_AT_INVALID");
    if (
      Math.abs(payload.sessionStart - sessionStart) > 15_000 ||
      Math.abs(payload.expiresAt - expiry) > 15_000
    )
      throw new Error("SESSION_TIME_MISMATCH");

    const expected = crypto
      .createHmac("sha256", session.sessionKey || "")
      .update(canonical(payload))
      .digest("hex");
    if (!session.sessionKey || !safeEqualHex(expected, payload.signature)) {
      throw new Error("SIGNATURE_INVALID");
    }

    const expectedCounter = Math.floor(
      payload.issuedAt / 1000 / QR_WINDOW_SECONDS
    );
    if (Math.abs(payload.counter - expectedCounter) > 3)
      throw new Error("COUNTER_DRIFT");

    if (input.method !== "qr") throw new Error("METHOD_MISMATCH");

    const unit = await this.prisma.unit.findFirst({
      where: {
        code: session.unitCode,
        semester: {
          courseYear: {
            course: { institution: { lecturers: { some: { id: session.lecturerId } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!unit) throw new Error("UNIT_NOT_FOUND");
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_unitId: { studentId: input.studentId, unitId: unit.id },
      },
    });
    if (!enrollment) throw new Error("NOT_ENROLLED");

    const duplicate = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { studentId: input.studentId, conductedSessionId: session.id },
    });
    if (duplicate)
      return { status: "duplicate" as const, recordId: duplicate.id };

    await this.assertNoDeviceConflict(session.id, input.deviceId, input.studentId);

    const record = await this.prisma.inPersonAttendanceRecord.create({
      data: {
        studentId: input.studentId,
        unitCode: normalizeUnitCode(session.unitCode),
        sessionStart: session.sessionStart,
        scannedAt: new Date(scannedAt),
        deviceId: input.deviceId,
        rawPayload: input.rawPayload,
        method: input.method as InPersonMethod,
        conductedSessionId: session.id,
        counter: payload.counter,
        submittedNonce: BigInt(payload.sessionNonce),
        verificationStatus: "verified",
      },
    });
    return { status: "verified" as const, recordId: record.id };
  }

  private async verifyBle(
    input: SubmitInPersonAttendanceBody & { studentId: string }
  ) {
    const beacon = decodeBle(input.rawPayload);
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");
    const now = Date.now();
    const start = session.sessionStart.getTime();
    const end = start + session.sessionDuration * 1000;
    if (session.sessionEnd || now < start - 15_000 || now > end + 15_000)
      throw new Error("SESSION_EXPIRED");
    if (
      beacon.nonce !== Number(session.sessionNonce) ||
      beacon.unitId !== Number(session.bleUnitId)
    )
      throw new Error("BLE_SESSION_MISMATCH");
    const expectedCounter =
      Math.floor(Number(input.scannedAt) / 1000 / BLE_WINDOW_SECONDS) & 0xffff;
    const counterDistance = Math.min(
      Math.abs(beacon.counter - expectedCounter),
      0x10000 - Math.abs(beacon.counter - expectedCounter)
    );
    if (counterDistance > 3)
      throw new Error("COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: {
        code: session.unitCode,
        semester: {
          courseYear: {
            course: { institution: { lecturers: { some: { id: session.lecturerId } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!unit) throw new Error("UNIT_NOT_FOUND");
    const enrolled = await this.prisma.enrollment.findUnique({
      where: {
        studentId_unitId: { studentId: input.studentId, unitId: unit.id },
      },
    });
    if (!enrolled) throw new Error("NOT_ENROLLED");
    const duplicate = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { studentId: input.studentId, conductedSessionId: session.id },
    });
    if (duplicate)
      return { status: "duplicate" as const, recordId: duplicate.id };
    await this.assertNoDeviceConflict(session.id, input.deviceId, input.studentId);
    const scannedAt = new Date(input.scannedAt);
    const record = await this.prisma.inPersonAttendanceRecord.create({
      data: {
        studentId: input.studentId,
        unitCode: normalizeUnitCode(session.unitCode),
        sessionStart: session.sessionStart,
        scannedAt,
        deviceId: input.deviceId,
        rawPayload: input.rawPayload,
        method: "ble",
        conductedSessionId: session.id,
        counter: beacon.counter,
        submittedNonce: BigInt(beacon.nonce),
        verificationStatus: "verified",
      },
    });
    return { status: "verified" as const, recordId: record.id };
  }

  async verifyPin(input: SubmitInPersonAttendanceBody & { studentId: string }) {
    if (input.method !== "pin" || !input.rawPayload.startsWith("MWPIN1:"))
      throw new Error("PIN_FORMAT_INVALID");
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");
    const now = Date.now();
    const start = session.sessionStart.getTime();
    const end = start + session.sessionDuration * 1000;
    const scannedAt = new Date(input.scannedAt).getTime();
    if (
      !Number.isFinite(scannedAt) ||
      scannedAt > now + 15_000 ||
      scannedAt < start - 15_000
    )
      throw new Error("SCAN_TIME_INVALID");
    if (scannedAt > end + 15_000) throw new Error("SESSION_EXPIRED");
    const parts = input.rawPayload.split(":");
    if (
      parts.length !== 4 ||
      parts[1] !== session.id ||
      !/^\d{6}$/.test(parts[2]) ||
      !/^\d+$/.test(parts[3])
    )
      throw new Error("PIN_FORMAT_INVALID");
    const receivedPin = parts[2]!;
    const receivedCounter = Number(parts[3]);
    const expectedCounter = Math.floor(
      scannedAt / 1000 / PIN_WINDOW_SECONDS
    );
    if (Math.abs(receivedCounter - expectedCounter) > MAX_PIN_DRIFT)
      throw new Error("PIN_COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: {
        code: session.unitCode,
        semester: {
          courseYear: {
            course: { institution: { lecturers: { some: { id: session.lecturerId } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!unit) throw new Error("UNIT_NOT_FOUND");
    const enrolled = await this.prisma.enrollment.findUnique({
      where: {
        studentId_unitId: { studentId: input.studentId, unitId: unit.id },
      },
    });
    if (!enrolled) throw new Error("NOT_ENROLLED");
    const duplicate = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { studentId: input.studentId, conductedSessionId: session.id },
    });
    if (duplicate)
      return { status: "duplicate" as const, recordId: duplicate.id };
    const message = [
      session.id,
      normalizeUnitCode(session.unitCode),
      session.sessionNonce.toString(),
      receivedCounter,
    ].join("|");
    const digest = crypto
      .createHmac("sha256", session.sessionKey || "")
      .update(message)
      .digest("hex");
    const expectedPin = String(
      (parseInt(digest.slice(0, 8), 16) >>> 0) % 1_000_000
    ).padStart(6, "0");
    if (!session.sessionKey || expectedPin !== receivedPin) {
      // Not the lecturer's PIN — try a peer "helper PIN" instead. Any
      // student already BLE/QR-*server*-verified for this exact session can
      // generate one fully offline from their own relay device key (the
      // same key already used to sign BLE/QR relay proofs); we can't know
      // in advance which student's key a given code came from, so check
      // against all of them. Server-side "verified" is the only signal this
      // side can act on — it has no visibility into a student's local/
      // optimistic state, and PIN-origin marks are deliberately excluded
      // (PIN correctness is never confirmed except by the server itself, so
      // a PIN-marked student can't yet be trusted to vouch for someone
      // else). Two queries regardless of roster size, not one per candidate.
      //
      // Accepting a match against any of N verified students' codes instead
      // of exactly one lecturer code trades random-guess resistance from
      // 1-in-1,000,000 down to roughly N-in-1,000,000 per submission — N
      // bounded by this session's roster, behind an authenticated per-
      // student request. Same trust model as PIN-sharing already relies on
      // today, just multiplied by roster size.
      const helpers = await this.prisma.inPersonAttendanceRecord.findMany({
        where: {
          conductedSessionId: session.id,
          verificationStatus: "verified",
          method: { in: ["ble", "qr"] },
        },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      let matched = false;
      if (helpers.length) {
        const keys = await this.prisma.studentDevice.findMany({
          where: {
            userId: { in: helpers.map((h) => h.studentId) },
            role: "student",
          },
          orderBy: { lastUsedAt: "desc" },
        });
        const keyByStudent = new Map<string, string>();
        for (const key of keys)
          if (!keyByStudent.has(key.userId))
            keyByStudent.set(key.userId, key.deviceKey);
        for (const [helperId, deviceKey] of keyByStudent) {
          const peerMessage = [session.id, helperId, receivedCounter].join("|");
          const peerDigest = crypto
            .createHmac("sha256", deviceKey)
            .update(peerMessage)
            .digest("hex");
          const peerExpected = String(
            (parseInt(peerDigest.slice(0, 8), 16) >>> 0) % 1_000_000
          ).padStart(6, "0");
          if (peerExpected === receivedPin) {
            matched = true;
            break;
          }
        }
      }
      if (!matched) throw new Error("PIN_INVALID");
    }
    await this.assertNoDeviceConflict(session.id, input.deviceId, input.studentId);
    const record = await this.prisma.inPersonAttendanceRecord.create({
      data: {
        studentId: input.studentId,
        unitCode: normalizeUnitCode(session.unitCode),
        sessionStart: session.sessionStart,
        scannedAt: new Date(scannedAt),
        deviceId: input.deviceId,
        rawPayload: input.rawPayload,
        method: "pin",
        conductedSessionId: session.id,
        pinCounter: receivedCounter,
        submittedNonce: session.sessionNonce,
        verificationStatus: "verified",
      },
    });
    return { status: "verified" as const, recordId: record.id };
  }

  async verifyRelay(
    input: SubmitInPersonAttendanceBody & { studentId: string }
  ) {
    const relay = decodeRelay(input.rawPayload);
    if (relay.relayerId === input.studentId) throw new Error("RELAY_SELF_MARK");
    if (!["qr", "ble"].includes(input.method))
      throw new Error("METHOD_MISMATCH");
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");
    const relayerRecord = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: {
        studentId: relay.relayerId,
        conductedSessionId: session.id,
        verificationStatus: "verified",
      },
      select: { id: true },
    });
    if (!relayerRecord) throw new Error("RELAY_PARENT_NOT_VERIFIED");
    // A relayer's own evidence can itself be a relay envelope (student A ->
    // B -> C, arbitrarily deep) — re-verifying a *nested* MWIR1 payload as a
    // raw QR/BLE/PIN artifact isn't possible (verify()/verifyPin() only
    // decode session-level formats) and isn't necessary: relayerRecord above
    // already independently confirms the relayer has a server-verified
    // record for this exact session, regardless of how many hops produced
    // it, and the signature/counter-drift checks below already guarantee
    // this specific relay hop is live and genuinely signed by the relayer's
    // own device key. Re-verifying the raw parent artifact is only possible
    // (and only adds anything) for a first-hop relay.
    const parentMethod = relay.parentPayload.startsWith("MWBLE1:")
      ? "ble"
      : relay.parentPayload.startsWith("MWPIN1:")
      ? "pin"
      : relay.parentPayload.startsWith("MWIR1:")
      ? "relay"
      : "qr";
    const parent =
      parentMethod === "relay"
        ? { status: "verified" as const }
        : parentMethod === "pin"
        ? await this.verifyPin({
            ...input,
            rawPayload: relay.parentPayload,
            method: "pin",
            studentId: relay.relayerId,
          })
        : await this.verify({
            ...input,
            rawPayload: relay.parentPayload,
            method: parentMethod,
            studentId: relay.relayerId,
          });
    if (parent.status !== "verified" && parent.status !== "duplicate")
      throw new Error("RELAY_PARENT_INVALID");
    const key = await this.prisma.studentDevice.findFirst({
      where: { userId: relay.relayerId, role: "student" },
      orderBy: { lastUsedAt: "desc" },
    });
    if (!key) throw new Error("RELAY_DEVICE_NOT_REGISTERED");
    const message = [
      relay.parentPayload,
      relay.counter,
      relay.relayerId,
      session.id,
    ].join("|");
    const expected = crypto
      .createHmac("sha256", key.deviceKey)
      .update(message)
      .digest("hex");
    if (!safeEqualHex(expected, relay.signature))
      throw new Error("RELAY_SIGNATURE_INVALID");
    // Relays also carry the absolute QR rotation window. Keeping this
    // calculation epoch-based makes relayed beacons interoperable across
    // devices and avoids session-start clock drift.
    const expectedCounter = Math.floor(
      Date.now() / 1000 / QR_WINDOW_SECONDS
    );
    if (Math.abs(relay.counter - expectedCounter) > 3)
      throw new Error("RELAY_COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: {
        code: session.unitCode,
        semester: {
          courseYear: {
            course: { institution: { lecturers: { some: { id: session.lecturerId } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!unit) throw new Error("UNIT_NOT_FOUND");
    const enrolled = await this.prisma.enrollment.findUnique({
      where: {
        studentId_unitId: { studentId: input.studentId, unitId: unit.id },
      },
    });
    if (!enrolled) throw new Error("NOT_ENROLLED");
    const duplicate = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { studentId: input.studentId, conductedSessionId: session.id },
    });
    if (duplicate)
      return { status: "duplicate" as const, recordId: duplicate.id };
    await this.assertNoDeviceConflict(session.id, input.deviceId, input.studentId);
    const record = await this.prisma.inPersonAttendanceRecord.create({
      data: {
        studentId: input.studentId,
        unitCode: normalizeUnitCode(session.unitCode),
        sessionStart: session.sessionStart,
        scannedAt: new Date(input.scannedAt),
        deviceId: input.deviceId,
        rawPayload: input.rawPayload,
        method: input.method,
        conductedSessionId: session.id,
        counter: relay.counter,
        submittedNonce: session.sessionNonce,
        verificationStatus: "verified",
      },
    });
    await this.prisma.studentDevice.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    return { status: "verified" as const, recordId: record.id };
  }

  async verifyLecturerAssisted(
    lecturerId: string,
    input: LecturerAssistedMarkBody
  ) {
    // Split into two checks (rather than one findFirst filtering on both
    // id and lecturerId) so the caller can tell "not claimed by the server
    // yet" — transient while a locally-started session is still being
    // claimed — from "exists but isn't yours" — a real, permanent error.
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.lecturerId !== lecturerId) throw new Error("SESSION_NOT_OWNED");
    const scannedAt = new Date(input.scannedAt).getTime();
    const expiry =
      session.sessionStart.getTime() + session.sessionDuration * 1000;
    if (
      !Number.isFinite(scannedAt) ||
      scannedAt < session.sessionStart.getTime() - 15_000 ||
      scannedAt > expiry + 15_000
    )
      throw new Error("SCAN_TIME_INVALID");
    const result = await this.verify(
      {
        ...input,
        unitCode: session.unitCode,
        sessionStart: session.sessionStart.getTime(),
        method: "qr",
        studentId: input.studentId,
      },
      true
    );
    if (result.status !== "verified") return result;
    await this.prisma.inPersonAttendanceRecord.update({
      where: { id: result.recordId },
      data: { method: "manual_lecturer", markedByLecturerId: lecturerId },
    });
    return result;
  }
}
