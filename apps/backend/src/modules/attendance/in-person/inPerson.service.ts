import crypto from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import {
  MAX_IN_PERSON_SESSION_MINUTES,
  normalizeUnitCode,
} from "./inPerson.schema.js";
import type { CreateInPersonSessionBody } from "./inPerson.types.js";
import { InPersonVerificationService } from "./inPerson.verification.service.js";

export class InPersonService {
  private readonly verifier: InPersonVerificationService;
  constructor(private readonly prisma: PrismaClient) {
    this.verifier = new InPersonVerificationService(prisma);
  }

  async createSession(lecturerId: string, input: CreateInPersonSessionBody) {
    const unitCode = normalizeUnitCode(input.unitCode);
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      select: { institutionId: true },
    });
    if (!lecturer) throw new Error("LECTURER_NOT_FOUND");

    // Lecturers choose any unit belonging to their institution when starting
    // attendance; they are not required to have a pre-assigned unit record.
    const unit = await this.prisma.unit.findFirst({
      where: {
        code: unitCode,
        semester: {
          courseYear: { course: { institutionId: lecturer.institutionId } },
        },
      },
      select: { bleId: true },
    });
    if (!unit) throw new Error("UNIT_NOT_IN_INSTITUTION");

    const expiresAt = new Date(input.expiresAt).getTime();
    const durationMs = Math.min(
      Math.max(expiresAt - Date.now(), 60_000),
      MAX_IN_PERSON_SESSION_MINUTES * 60_000,
    );
    const sessionStart = new Date(Math.floor(Date.now() / 1000) * 1000);
    const session = await this.prisma.conductedSession.create({
      data: {
        lecturerId,
        institutionId: lecturer.institutionId,
        unitCode,
        sessionStart,
        sessionDuration: Math.floor(durationMs / 1000),
        sessionNonce: BigInt(`0x${crypto.randomBytes(4).toString("hex")}`),
        sessionKey: crypto.randomBytes(32).toString("hex"),
        bleUnitId: unit?.bleId ?? null,
      },
    });
    return {
      id: session.id,
      unitCode: session.unitCode,
      sessionStart: session.sessionStart.getTime(),
      expiresAt:
        session.sessionStart.getTime() + session.sessionDuration * 1000,
      sessionNonce: Number(session.sessionNonce),
      sessionSecret: session.sessionKey,
      status: "active" as const,
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
    return {
      id: session.id,
      unitCode: session.unitCode,
      sessionStart,
      expiresAt,
      sessionNonce: Number(session.sessionNonce),
      bleUnitId: session.bleUnitId ? Number(session.bleUnitId) : null,
      status: session.sessionEnd
        ? ("ended" as const)
        : Date.now() > expiresAt
          ? ("expired" as const)
          : ("active" as const),
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
          semester: {
            courseYear: {
              course: { institutionId: student.institutionId },
            },
          },
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
        lecturer: { institutionId: student.institutionId },
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

  submitOpaqueRelay(
    studentId: string,
    input: Parameters<InPersonVerificationService["verifyOpaqueRelay"]>[0],
  ) {
    return this.verifier.verifyOpaqueRelay({ ...input, studentId });
  }

  submitAssisted(
    lecturerId: string,
    input: Parameters<InPersonVerificationService["verifyLecturerAssisted"]>[1],
  ) {
    return this.verifier.verifyLecturerAssisted(lecturerId, input);
  }
}
