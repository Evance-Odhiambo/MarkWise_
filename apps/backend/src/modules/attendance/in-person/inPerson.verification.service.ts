import crypto from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import type {
  InPersonMethod,
  LecturerAssistedMarkBody,
  SubmitInPersonAttendanceBody,
} from "./inPerson.types.js";
import { normalizeUnitCode } from "./inPerson.schema.js";

const PIN_WINDOW_SECONDS = 30;
const QR_WINDOW_SECONDS = 3;
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
    Buffer.from(raw.slice(6), "base64").toString("utf8"),
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

const decodeOpaqueRelay = (raw: string) => {
  if (!raw.startsWith("MWIR2:")) throw new Error("RELAY_FORMAT_INVALID");
  const bytes = Buffer.from(raw.slice(6), "base64");
  if (
    bytes.length !== 9 ||
    bytes.subarray(0, 4).toString("ascii") !== "MWI2" ||
    bytes.readUInt8(8) !== 1
  )
    throw new Error("RELAY_FORMAT_INVALID");
  return { token: bytes.subarray(4).toString("hex") };
};

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
    payload.counter,
    payload.issuedAt,
  ].join("|");

const decodePayload = (raw: string): SignedPayload => {
  if (!raw.startsWith("MWIP1:"))
    throw new Error("Unsupported attendance payload");
  const payload = JSON.parse(
    Buffer.from(raw.slice(6), "base64").toString("utf8"),
  ) as SignedPayload;
  if (payload.version !== 1 || !payload.sessionId || !payload.signature)
    throw new Error("Malformed attendance payload");
  return payload;
};

export class InPersonVerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async verify(input: SubmitInPersonAttendanceBody & { studentId: string }) {
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: input.sessionId },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const now = Date.now();
    const sessionStart = session.sessionStart.getTime();
    const expiry = sessionStart + session.sessionDuration * 1000;
    if (
      session.sessionEnd ||
      now < sessionStart - 15_000 ||
      now > expiry + 15_000
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

    const expected = crypto
      .createHmac("sha256", session.sessionKey || "")
      .update(canonical(payload))
      .digest("hex");
    if (!session.sessionKey || !safeEqualHex(expected, payload.signature)) {
      throw new Error("SIGNATURE_INVALID");
    }

    const expectedCounter =
      Math.floor(now / 1000 / QR_WINDOW_SECONDS) -
      Math.floor(sessionStart / 1000 / QR_WINDOW_SECONDS);
    if (Math.abs(payload.counter - expectedCounter) > 3)
      throw new Error("COUNTER_DRIFT");

    if (input.method !== "qr") throw new Error("METHOD_MISMATCH");

    const unit = await this.prisma.unit.findFirst({
      where: { code: session.unitCode },
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

    if (input.deviceId) {
      const deviceUse = await this.prisma.inPersonAttendanceRecord.findFirst({
        where: { conductedSessionId: session.id, deviceId: input.deviceId },
      });
      if (deviceUse && deviceUse.studentId !== input.studentId)
        throw new Error("DEVICE_CONFLICT");
    }

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
    input: SubmitInPersonAttendanceBody & { studentId: string },
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
      Math.floor(now / 1000 / QR_WINDOW_SECONDS) -
      Math.floor(start / 1000 / QR_WINDOW_SECONDS);
    if (Math.abs(beacon.counter - expectedCounter) > 3)
      throw new Error("COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: { code: session.unitCode },
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
    if (session.sessionEnd || now < start - 15_000 || now > end + 15_000)
      throw new Error("SESSION_EXPIRED");
    const scannedAt = new Date(input.scannedAt).getTime();
    if (
      !Number.isFinite(scannedAt) ||
      scannedAt > now + 15_000 ||
      scannedAt < start - 15_000
    )
      throw new Error("SCAN_TIME_INVALID");
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
    const relativeStart = Math.floor(start / 1000 / PIN_WINDOW_SECONDS);
    const expectedCounter =
      Math.floor(now / 1000 / PIN_WINDOW_SECONDS) - relativeStart;
    if (Math.abs(receivedCounter - expectedCounter) > MAX_PIN_DRIFT)
      throw new Error("PIN_COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: { code: session.unitCode },
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
      (parseInt(digest.slice(0, 8), 16) >>> 0) % 1_000_000,
    ).padStart(6, "0");
    if (!session.sessionKey || expectedPin !== receivedPin)
      throw new Error("PIN_INVALID");
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
    input: SubmitInPersonAttendanceBody & { studentId: string },
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
    const parentMethod = relay.parentPayload.startsWith("MWBLE1:")
      ? "ble"
      : relay.parentPayload.startsWith("MWPIN1:")
        ? "pin"
        : "qr";
    const parent =
      parentMethod === "pin"
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
    const expectedCounter =
      Math.floor(Date.now() / 1000 / QR_WINDOW_SECONDS) -
      Math.floor(session.sessionStart.getTime() / 1000 / QR_WINDOW_SECONDS);
    if (Math.abs(relay.counter - expectedCounter) > 3)
      throw new Error("RELAY_COUNTER_DRIFT");
    const unit = await this.prisma.unit.findFirst({
      where: { code: session.unitCode },
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

  async verifyOpaqueRelay(
    input: SubmitInPersonAttendanceBody & { studentId: string },
  ) {
    const relay = decodeOpaqueRelay(input.rawPayload);
    if (!["qr", "ble"].includes(input.method))
      throw new Error("METHOD_MISMATCH");
    const parent = await this.prisma.inPersonAttendanceRecord.findFirst({
      where: { token: relay.token, verificationStatus: "verified" },
      include: { conductedSession: true },
    });
    if (
      !parent?.conductedSession ||
      parent.conductedSession.id !== input.sessionId
    )
      throw new Error("RELAY_PARENT_INVALID");
    if (parent.studentId === input.studentId)
      throw new Error("RELAY_SELF_MARK");
    const session = parent.conductedSession;
    const now = Date.now();
    const end = session.sessionStart.getTime() + session.sessionDuration * 1000;
    if (
      session.sessionEnd ||
      now < session.sessionStart.getTime() - 15_000 ||
      now > end + 15_000
    )
      throw new Error("SESSION_EXPIRED");
    const scannedAt = new Date(input.scannedAt).getTime();
    if (
      !Number.isFinite(scannedAt) ||
      scannedAt > now + 15_000 ||
      scannedAt < session.sessionStart.getTime() - 15_000
    )
      throw new Error("SCAN_TIME_INVALID");
    const unit = await this.prisma.unit.findFirst({
      where: { code: session.unitCode },
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
    const record = await this.prisma.inPersonAttendanceRecord.create({
      data: {
        studentId: input.studentId,
        unitCode: normalizeUnitCode(session.unitCode),
        sessionStart: session.sessionStart,
        scannedAt: new Date(scannedAt),
        deviceId: input.deviceId,
        rawPayload: input.rawPayload,
        method: input.method,
        conductedSessionId: session.id,
        submittedNonce: session.sessionNonce,
        verificationStatus: "verified",
      },
    });
    return { status: "verified" as const, recordId: record.id };
  }

  async verifyLecturerAssisted(
    lecturerId: string,
    input: LecturerAssistedMarkBody,
  ) {
    const session = await this.prisma.conductedSession.findFirst({
      where: { id: input.sessionId, lecturerId, sessionEnd: null },
    });
    if (!session) throw new Error("SESSION_NOT_FOUND_OR_NOT_OWNED");
    const result = await this.verify({
      ...input,
      unitCode: session.unitCode,
      sessionStart: session.sessionStart.getTime(),
      method: "qr",
      studentId: input.studentId,
    });
    if (result.status !== "verified") return result;
    await this.prisma.inPersonAttendanceRecord.update({
      where: { id: result.recordId },
      data: { method: "manual_lecturer", markedByLecturerId: lecturerId },
    });
    return result;
  }
}
