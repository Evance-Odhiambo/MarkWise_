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
    const assignment = await this.prisma.lecturerUnit.findFirst({
      where: { lecturerId, unit: { code: unitCode } },
    });
    if (!assignment) throw new Error("UNIT_NOT_ASSIGNED");
    const expiresAt = new Date(input.expiresAt).getTime();
    const durationMs = Math.min(
      Math.max(expiresAt - Date.now(), 60_000),
      MAX_IN_PERSON_SESSION_MINUTES * 60_000,
    );
    const sessionStart = new Date(Math.floor(Date.now() / 1000) * 1000);
    const unit = await this.prisma.unit.findFirst({
      where: { code: unitCode },
      select: { bleId: true },
    });
    const session = await this.prisma.conductedSession.create({
      data: {
        lecturerId,
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

  async getPublicSessionByBleNonce(nonce: number) {
    const session = await this.prisma.conductedSession.findFirst({
      where: { sessionNonce: BigInt(nonce), sessionEnd: null },
      orderBy: { sessionStart: "desc" },
    });
    return session ? this.getPublicSession(session.id) : null;
  }

  async getActiveSessionByUnit(unitCode: string, studentId: string) {
    const normalizedCode = normalizeUnitCode(unitCode);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, unit: { code: normalizedCode } },
      select: { unitId: true },
    });
    if (!enrollment) return null;

    const session = await this.prisma.conductedSession.findFirst({
      where: {
        unitCode: normalizedCode,
        sessionEnd: null,
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
