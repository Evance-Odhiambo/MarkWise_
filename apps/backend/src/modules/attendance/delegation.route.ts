import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";
import { sendPushNotification } from "../notification/notification.service.js";
import { InPersonService } from "./in-person/inPerson.service.js";

const GRANT_TTL_MS = 15 * 60 * 1000;

const hashGrant = (grant: string) =>
  crypto.createHash("sha256").update(grant).digest("hex");

const normalizeUnitCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const delegationRoutes: FastifyPluginAsync = async (app) => {
  const service = new InPersonService(app.prisma);
  app.post(
    "/",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const body = (request.body || {}) as {
        studentId?: string;
        unitCode?: string;
      };
      const studentId = String(body.studentId || "").trim();
      const unitCode = normalizeUnitCode(body.unitCode);
      if (!studentId || !unitCode)
        return reply
          .code(400)
          .send({ error: "studentId and unitCode are required" });

      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true, fullName: true },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer was not found" });
      const student = await app.prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, institutionId: true },
      });
      const unit = await app.prisma.unit.findFirst({
        where: {
          code: unitCode,
          semester: {
            courseYear: { course: { institutionId: lecturer.institutionId } },
          },
        },
        select: { id: true, name: true, bleId: true },
      });
      if (!student || !unit || student.institutionId !== lecturer.institutionId)
        return reply.code(404).send({ error: "Student or unit was not found" });

      const enrolled = await app.prisma.enrollment.findFirst({
        where: { studentId, unitId: unit.id },
        select: { id: true },
      });
      if (!enrolled)
        return reply
          .code(403)
          .send({ error: "Student is not enrolled in this unit" });

      const grant = crypto.randomBytes(32).toString("base64url");
      const validUntil = Date.now() + GRANT_TTL_MS;
      const delegation = await app.prisma.delegation.create({
        data: {
          sessionRef: `delegated-${crypto.randomUUID()}`,
          institutionId: lecturer.institutionId,
          unitCode,
          unitId: Number.isFinite(Number(unit.bleId)) ? Number(unit.bleId) : 0,
          leaderStudentId: studentId,
          validFrom: BigInt(Date.now()),
          validUntil: BigInt(validUntil),
          sessionToken: hashGrant(grant),
          createdBy: request.user.id,
        },
      });

      const title = "Attendance session authorization";
      const message = `${lecturer.fullName} authorized you to start attendance for ${unitCode} - ${unit.name}.`;
      const data = {
        delegationId: delegation.id,
        grantToken: grant,
        unitCode,
        unitName: unit.name,
        validUntil: String(validUntil),
        action: "accept-attendance-delegation",
      };
      await app.prisma.notification.create({
        data: {
          userId: studentId,
          userType: "student",
          type: "attendance",
          title,
          message,
          data,
        },
      });
      await sendPushNotification(app.prisma, {
        userId: studentId,
        userType: "student",
        title,
        body: message,
        data,
      });
      return reply.code(201).send({
        success: true,
        data: {
          id: delegation.id,
          unitCode,
          unitName: unit.name,
          studentName: student.name,
          validUntil,
        },
      });
    }
  );

  app.get(
    "/",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      const now = BigInt(Date.now());
      const rows = await app.prisma.delegation.findMany({
        where:
          request.user.role === "student"
            ? {
                leaderStudentId: request.user.id,
                validUntil: { gte: now },
                endedAt: null,
              }
            : {
                createdBy: request.user.id,
                validUntil: { gte: now },
                endedAt: null,
              },
        orderBy: { createdAt: "desc" },
      });
      return {
        delegations: rows.map((row) => ({
          id: row.id,
          unitCode: row.unitCode,
          validFrom: Number(row.validFrom),
          validUntil: Number(row.validUntil),
          startedAt: row.startedAt?.getTime() ?? null,
          used: row.used,
        })),
      };
    }
  );

  app.post<{ Params: { id: string }; Body: { grantToken?: string } }>(
    "/:id/accept",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const grantToken = String(request.body?.grantToken || "");
      const delegation = await app.prisma.delegation.findUnique({
        where: { id: request.params.id },
      });
      const storedHash = Buffer.from(delegation?.sessionToken || "");
      const receivedHash = Buffer.from(hashGrant(grantToken));
      const tokenMatches =
        storedHash.length === receivedHash.length &&
        crypto.timingSafeEqual(storedHash, receivedHash);
      if (
        !delegation ||
        delegation.leaderStudentId !== request.user.id ||
        delegation.endedAt ||
        delegation.used ||
        Date.now() < Number(delegation.validFrom) ||
        Date.now() > Number(delegation.validUntil) ||
        !tokenMatches
      )
        return reply
          .code(403)
          .send({ error: "Delegation is invalid or expired" });

      const unit = await app.prisma.unit.findFirst({
        where: {
          code: delegation.unitCode,
          semester: {
            courseYear: {
              course: { institutionId: delegation.institutionId || undefined },
            },
          },
        },
        select: { name: true, bleId: true },
      });
      if (!unit)
        return reply.code(404).send({ error: "Delegation unit was not found" });

      const sessionStart = new Date(Math.floor(Date.now() / 1000) * 1000);
      const sessionDuration = 10 * 60;

      // Resolve the delegation creator's institution for the session record.
      const delegationLecturer = await app.prisma.lecturer.findUnique({
        where: { id: delegation.createdBy },
        select: { institutionId: true },
      });
      if (!delegationLecturer)
        return reply.code(404).send({ error: "Delegation lecturer not found" });

      const session = await app.prisma.$transaction(async (tx) => {
        const created = await tx.conductedSession.create({
          data: {
            lecturerId: delegation.createdBy,
            institutionId: delegationLecturer.institutionId,
            unitCode: delegation.unitCode,
            sessionStart,
            sessionDuration,
            sessionNonce: BigInt(`0x${crypto.randomBytes(4).toString("hex")}`),
            sessionKey: crypto.randomBytes(32).toString("hex"),
            bleUnitId: unit.bleId,
          },
        });
        await tx.delegation.update({
          where: { id: delegation.id },
          data: { used: true, startedAt: sessionStart, sessionRef: created.id },
        });
        return created;
      });
      return reply.send({
        success: true,
        data: {
          id: delegation.id,
          unitCode: delegation.unitCode,
          unitName: unit.name,
          validUntil: Number(delegation.validUntil),
          grantToken,
          session: {
            id: session.id,
            unitCode: session.unitCode,
            sessionStart: session.sessionStart.getTime(),
            expiresAt: session.sessionStart.getTime() + sessionDuration * 1000,
            sessionNonce: Number(session.sessionNonce),
            bleUnitId: session.bleUnitId ? Number(session.bleUnitId) : null,
            sessionSecret: session.sessionKey,
            status: "active" as const,
          },
        },
      });
    }
  );

  // A delegated student may perform the same manual mark as the lecturer,
  // but only for the one session and one-time grant they accepted.
  app.post<{
    Params: { id: string };
    Body: {
      delegationId?: string;
      grantToken?: string;
      sessionId?: string;
      studentId?: string;
      rawPayload?: string;
      scannedAt?: string | number;
      deviceId?: string;
    };
  }>(
    "/:id/assisted-mark",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const body = request.body || {};
      const delegation = await app.prisma.delegation.findUnique({
        where: { id: request.params.id },
      });
      const receivedHash = Buffer.from(
        hashGrant(String(body.grantToken || ""))
      );
      const storedHash = Buffer.from(delegation?.sessionToken || "");
      const validGrant =
        storedHash.length === receivedHash.length &&
        crypto.timingSafeEqual(storedHash, receivedHash);
      const session = delegation?.sessionRef
        ? await app.prisma.conductedSession.findUnique({
            where: { id: delegation.sessionRef },
          })
        : null;
      const now = Date.now();
      if (
        !delegation ||
        !validGrant ||
        delegation.leaderStudentId !== request.user.id ||
        !delegation.used ||
        delegation.endedAt ||
        !session ||
        session.id !== String(body.sessionId || "") ||
        now > session.sessionStart.getTime() + session.sessionDuration * 1000
      )
        return reply
          .code(403)
          .send({ error: "Delegated session is invalid or expired" });

      const studentId = String(body.studentId || "").trim();
      const rawPayload = String(body.rawPayload || "").trim();
      const scannedAt = Number(body.scannedAt);
      if (!studentId || !rawPayload || !Number.isFinite(scannedAt))
        return reply.code(400).send({ error: "Invalid assisted mark" });
      const result = await service.submitAssisted(delegation.createdBy, {
        sessionId: session.id,
        studentId,
        rawPayload,
        scannedAt,
        deviceId: body.deviceId,
      });
      if (result.status === "verified") {
        await app.prisma.inPersonAttendanceRecord.update({
          where: { id: result.recordId },
          data: { delegationId: delegation.id },
        });
      }
      return reply.send({ success: true, data: result });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/:id/revoke",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const result = await app.prisma.delegation.updateMany({
        where: {
          id: request.params.id,
          createdBy: request.user.id,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });
      if (!result.count)
        return reply.code(404).send({ error: "Delegation not found" });
      return reply.send({ success: true });
    }
  );
};
