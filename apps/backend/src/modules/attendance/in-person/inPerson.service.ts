import crypto from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import {
  BLE_ROTATION_SECONDS,
  MAX_IN_PERSON_SESSION_MINUTES,
  normalizeUnitCode,
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from "./inPerson.schema.js";
import type { CreateInPersonSessionBody } from "./index.js";
import { InPersonVerificationService } from "./inPerson.verification.service.js";
import {
  MANIFEST_PROTOCOL_VERSION,
  manifestValues,
  signManifest,
} from "./sessionManifest.js";

export class InPersonService {
  private readonly verifier: InPersonVerificationService;
  constructor(private readonly prisma: PrismaClient) {
    this.verifier = new InPersonVerificationService(prisma);
  }

  async createSession(lecturerId: string, input: CreateInPersonSessionBody) {
    const requestedUnitCode = normalizeUnitCode(input.unitCode);
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      select: { institutionId: true },
    });
    if (!lecturer) throw new Error("LECTURER_NOT_FOUND");

    console.log(`Creating session for unit ${requestedUnitCode} at institution ${lecturer.institutionId}`);

    // Lecturers choose any unit belonging to their institution when starting
    // attendance; they are not required to have a pre-assigned unit record.
    const institutionUnits = await this.prisma.unit.findMany({
      where: {
        institutionId: lecturer.institutionId,
      },
      select: { code: true, bleId: true },
    });
    const matchedUnit = institutionUnits.find(
      candidate => normalizeUnitCode(candidate.code) === requestedUnitCode,
    );
    // Keep the institution's canonical spelling (for example, SBT 2170)
    // because attendance verification also resolves the unit by its code.
    const unitCode = matchedUnit?.code ?? requestedUnitCode;
    let unit = matchedUnit ? { bleId: matchedUnit.bleId } : null;
    
    if (unit) {
      console.log(`Found unit in Unit table with bleId: ${unit.bleId}`);
    }
    
    // If unit not found in Unit table, try BleMapping as fallback
    if (!unit) {
      console.log(`Unit not in Unit table, checking BleMapping...`);
      const bleMappings = await this.prisma.bleMapping.findMany({
        where: {
          // Older mapping rows may also contain spaces or different casing;
          // match them using the same canonical normalization as Unit records.
          institutionId: lecturer.institutionId,
          NOT: {
            unitCode: null, // Exclude null unitCodes
          },
        },
        select: { unitBleId: true, unitCode: true },
      });
      const normalizedMapping = bleMappings.find(
        mapping => normalizeUnitCode(mapping.unitCode || '') === requestedUnitCode,
      );
      
      if (normalizedMapping) {
        console.log(`Found in BleMapping: unitCode=${normalizedMapping.unitCode}, unitBleId=${normalizedMapping.unitBleId}`);
      } else {
        console.log(`Not found in BleMapping either`);
        
        // Check if ANY bleMappings exist for this institution
        const count = await this.prisma.bleMapping.count({
          where: { institutionId: lecturer.institutionId },
        });
        console.log(`Total BleMapping entries for institution: ${count}`);
      }
      
      if (normalizedMapping && normalizedMapping.unitBleId) {
        // Use BLE mapping - session can still be created
        unit = { bleId: normalizedMapping.unitBleId };
      } else {
        // Unit not found in either table - but allow session creation anyway
        // The lecturer can still use QR code and PIN methods
        console.warn(`Unit ${requestedUnitCode} not found in Unit or BleMapping tables for institution ${lecturer.institutionId}. Creating session without BLE.`);
        unit = { bleId: null };
      }
    }

    const expiresAt = new Date(input.expiresAt).getTime();

    // A client-supplied identity means the lecturer device already started
    // broadcasting offline and is now "claiming" that exact session server
    // side — reuse its id/nonce/secret/start verbatim (not regenerated) so
    // every QR/PIN/BLE payload already emitted, and every attendance record
    // already queued against that id, stays valid once the claim succeeds.
    const hasClientIdentity = input.id !== undefined;
    const sessionStart = hasClientIdentity
      ? new Date(input.sessionStart!)
      : new Date(Math.floor(Date.now() / 1000) * 1000);

    // Duration must be the fixed interval the client already committed to
    // (expiresAt - sessionStart), not (expiresAt - now). A claim can land
    // any amount of time after sessionStart — network delay, or a lecturer
    // reconnecting minutes after starting offline — and anchoring duration
    // to "now" would silently shrink the session below what's already
    // signed into every broadcast QR/PIN/BLE payload, desyncing the
    // server's expiry from what students are scanning and causing every
    // subsequent scan to fail with SESSION_TIME_MISMATCH.
    const durationMs = Math.min(
      Math.max(expiresAt - sessionStart.getTime(), 60_000),
      MAX_IN_PERSON_SESSION_MINUTES * 60_000,
    );
    const sessionData = {
      lecturerId,
      institutionId: lecturer.institutionId,
      unitCode,
      sessionStart,
      sessionDuration: Math.floor(durationMs / 1000),
      sessionNonce: hasClientIdentity
        ? BigInt(input.sessionNonce!)
        : BigInt(`0x${crypto.randomBytes(4).toString("hex")}`),
      sessionKey: hasClientIdentity
        ? input.sessionSecret!
        : crypto.randomBytes(32).toString("hex"),
      // A claiming client that already committed to a *real* bleUnitId (it's
      // already broadcasting BLE beacons under that id) must have it honored
      // verbatim — already-emitted beacons and already-cached manifests on
      // student devices have to stay consistent with what the server signs.
      // But a client-supplied `null` only means "my local unit-mapping cache
      // didn't have this unit's BLE id yet" (e.g. never synced on this
      // device) — it is not a commitment to omit BLE, and nothing has been
      // broadcast under it. Falling back to the server's own Unit-table
      // lookup here, instead of locking the session out of BLE forever,
      // recovers BLE the moment the claim round-trip lands.
      bleUnitId:
        hasClientIdentity && input.bleUnitId != null
          ? String(input.bleUnitId)
          : unit?.bleId ?? null,
    };

    let session;
    if (hasClientIdentity) {
      try {
        session = await this.prisma.conductedSession.create({
          data: { id: input.id, ...sessionData },
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          // Idempotent retry: the claim may have already succeeded on a
          // previous attempt (e.g. the response was lost to a flaky
          // connection). Return the existing row rather than erroring.
          const existing = await this.prisma.conductedSession.findUnique({
            where: { id: input.id },
          });
          if (!existing) throw new Error("SESSION_ALREADY_EXISTS");
          if (existing.lecturerId !== lecturerId)
            throw new Error("SESSION_OWNERSHIP_CONFLICT");
          session = existing;
        } else {
          throw error;
        }
      }
    } else {
      session = await this.prisma.conductedSession.create({ data: sessionData });
    }
    const publicSession = await this.getPublicSession(session.id);
    return {
      id: session.id,
      unitCode: session.unitCode,
      sessionStart: session.sessionStart.getTime(),
      expiresAt:
        session.sessionStart.getTime() + session.sessionDuration * 1000,
      sessionNonce: Number(session.sessionNonce),
      sessionSecret: session.sessionKey,
      status: "active" as const,
      manifest: publicSession?.manifest,
    };
  }

  endSession(sessionId: string, lecturerId: string) {
    return this.prisma.conductedSession.updateMany({
      where: { id: sessionId, lecturerId, sessionEnd: null },
      data: { sessionEnd: new Date() },
    });
  }

  async getPublicSession(sessionId: string) {
    const session = await this.prisma.conductedSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;
    const sessionStart = session.sessionStart.getTime();
    const expiresAt = sessionStart + session.sessionDuration * 1000;
    const issuedAt = Date.now();
    // A manifest is issued whenever the server can sign one, regardless of
    // whether this unit has a BLE mapping — without it, QR/PIN can never be
    // offline-trusted either, since the manifest is the only signed anchor
    // a client can verify without a live server round-trip.
    const bleUnitId = session.bleUnitId ? Number(session.bleUnitId) : null;
    const manifestInput = {
      sessionId: session.id,
      unitCode: session.unitCode,
      bleUnitId,
      sessionNonce: Number(session.sessionNonce),
      sessionStart,
      expiresAt,
      issuedAt,
    };
    return {
      id: session.id,
      unitCode: session.unitCode,
      sessionStart,
      expiresAt,
      sessionNonce: Number(session.sessionNonce),
      bleUnitId,
      status: session.sessionEnd
        ? ("ended" as const)
          : Date.now() > expiresAt
          ? ("expired" as const)
          : ("active" as const),
      manifest: process.env.ATTENDANCE_MANIFEST_PRIVATE_KEY ? {
        protocolVersion: MANIFEST_PROTOCOL_VERSION,
        sessionId: session.id,
        unitCode: normalizeUnitCode(session.unitCode),
        bleUnitId,
        sessionNonce: Number(session.sessionNonce),
        sessionStart,
        expiresAt,
        issuedAt,
        bleRotationSeconds: BLE_ROTATION_SECONDS,
        qrRotationSeconds: QR_ROTATION_SECONDS,
        pinRotationSeconds: PIN_ROTATION_SECONDS,
        issuerId: session.lecturerId,
        keyId: `session:${session.id}`,
        signature: signManifest(manifestValues(manifestInput)),
      } : undefined,
    };
  }

  async getPublicSessionByBleNonce(nonce: number, institutionId?: string) {
    const where: {
      sessionNonce: bigint;
      sessionEnd: null;
      institutionId?: string;
    } = {
      sessionNonce: BigInt(nonce),
      sessionEnd: null,
    };
    // If the caller's institution is known, scope the lookup so a nonce
    // collision between two institutions always resolves to the right one.
    if (institutionId) where.institutionId = institutionId;

    const session = await this.prisma.conductedSession.findFirst({
      where,
      orderBy: { sessionStart: "desc" },
    });
    return session ? this.getPublicSession(session.id) : null;
  }

  async getActiveSessionByUnit(unitCode: string, studentId: string) {
    const normalizedCode = normalizeUnitCode(unitCode);

    // Resolve the student's institutionId from the DB so we never rely on
    // caller-supplied data for the institution boundary check.
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { institutionId: true },
    });
    if (!student) return null;

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        unit: {
          code: normalizedCode,
          institutionId: student.institutionId,
        },
      },
      select: { unitId: true },
    });
    if (!enrollment) return null;

    // Scope the session lookup to the student's institution via the lecturer
    // relation so unit code collisions across institutions are harmless.
    const session = await this.prisma.conductedSession.findFirst({
      where: {
        unitCode: normalizedCode,
        sessionEnd: null,
        institutionId: student.institutionId,
      },
      orderBy: { sessionStart: "desc" },
    });
    if (!session) return null;

    const publicSession = await this.getPublicSession(session.id);
    return publicSession?.status === "active" ? publicSession : null;
  }

  submit(
    studentId: string,
    input: Parameters<InPersonVerificationService["verify"]>[0],
  ) {
    return this.verifier.verify({ ...input, studentId });
  }

  submitPin(
    studentId: string,
    input: Parameters<InPersonVerificationService["verifyPin"]>[0],
  ) {
    return this.verifier.verifyPin({ ...input, studentId });
  }

  submitRelay(
    studentId: string,
    input: Parameters<InPersonVerificationService["verifyRelay"]>[0],
  ) {
    return this.verifier.verifyRelay({ ...input, studentId });
  }

  submitAssisted(
    lecturerId: string,
    input: Parameters<InPersonVerificationService["verifyLecturerAssisted"]>[1],
  ) {
    return this.verifier.verifyLecturerAssisted(lecturerId, input);
  }
}
