import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";
import { AttendanceService } from "./attendance.service.js";
import { WebAuthnService } from "./webauthn.service.js";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  validateCreateOnlineSession,
  type AttendanceSessionParams,
  type CreateOnlineSessionBody,
  type SubmitOnlineAttendanceBody,
  type WebAuthnResponseBody,
} from "./attendance.schema.js";

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  const attendance = new AttendanceService(app.prisma, app.redis);
  const webauthn = new WebAuthnService(app.prisma);

  app.get(
    "/student/summary",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const studentId = request.user.id;
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const student = await app.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          year: true,
          course: {
            select: {
              years: {
                orderBy: { yearNumber: "desc" },
                select: { yearNumber: true, semester: { orderBy: { semesterNumber: "desc" }, select: { name: true, units: { select: { id: true } } } } },
              },
            },
          },
        },
      });
      if (!student) return reply.code(404).send({ error: "Student record not found" });
      const currentYear = student.course.years.find(({ yearNumber }) => yearNumber === student.year) ?? student.course.years[0];
      const currentSemester = currentYear?.semester[0];
      const enrolledUnits = await app.prisma.enrollment.findMany({ where: { studentId }, select: { unit: { select: { id: true, code: true, name: true } } } });
      const enrolledUnitCodes = enrolledUnits.map(({ unit }) => unit.code);

      const [inPersonCount, onlineCount, recentInPerson, recentOnline, weeklyInPerson, weeklyOnline, unitInPerson, unitOnline, conductedInPerson, conductedOnline] = await Promise.all([
        app.prisma.inPersonAttendanceRecord.count({ where: { studentId } }),
        app.prisma.onlineAttendanceRecord.count({ where: { studentId } }),
        app.prisma.inPersonAttendanceRecord.findMany({
          where: { studentId }, orderBy: { scannedAt: "desc" }, take: 5,
          select: { id: true, unitCode: true, scannedAt: true, verificationStatus: true, method: true },
        }),
        app.prisma.onlineAttendanceRecord.findMany({
          where: { studentId }, orderBy: { markedAt: "desc" }, take: 5,
          select: { id: true, unitCode: true, markedAt: true },
        }),
        app.prisma.inPersonAttendanceRecord.findMany({ where: { studentId, scannedAt: { gte: since } }, select: { scannedAt: true } }),
        app.prisma.onlineAttendanceRecord.findMany({ where: { studentId, markedAt: { gte: since } }, select: { markedAt: true } }),
        app.prisma.inPersonAttendanceRecord.findMany({ where: { studentId }, select: { unitCode: true } }),
        app.prisma.onlineAttendanceRecord.findMany({ where: { studentId }, select: { unitCode: true } }),
        app.prisma.conductedSession.findMany({ where: { unitCode: { in: enrolledUnitCodes } }, select: { unitCode: true } }),
        app.prisma.onlineAttendanceSession.findMany({ where: { unitCode: { in: enrolledUnitCodes } }, select: { unitCode: true } }),
      ]);

      const recent = [
        ...recentInPerson.map((record) => ({ id: record.id, unitCode: record.unitCode, markedAt: record.scannedAt, method: record.method, status: record.verificationStatus })),
        ...recentOnline.map((record) => ({ id: record.id, unitCode: record.unitCode, markedAt: record.markedAt, method: "online", status: "verified" })),
      ].sort((a, b) => b.markedAt.getTime() - a.markedAt.getTime()).slice(0, 6);

      const trend = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(since);
        day.setDate(since.getDate() + index);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        const count = weeklyInPerson.filter(({ scannedAt }) => scannedAt >= day && scannedAt < nextDay).length
          + weeklyOnline.filter(({ markedAt }) => markedAt >= day && markedAt < nextDay).length;
        return { date: day.toISOString().slice(0, 10), count };
      });

      const unitTotals = new Map<string, number>();
      [...unitInPerson, ...unitOnline].forEach(({ unitCode }) => unitTotals.set(unitCode, (unitTotals.get(unitCode) ?? 0) + 1));
      const units = [...unitTotals.entries()].sort((a, b) => b[1] - a[1]).map(([unitCode, count]) => ({ unitCode, count }));
      const attended = inPersonCount + onlineCount;
      const conducted = conductedInPerson.length + conductedOnline.length;
      const missed = Math.max(conducted - attended, 0);
      const conductedByUnit = new Map<string, number>();
      [...conductedInPerson, ...conductedOnline].forEach(({ unitCode }) => conductedByUnit.set(unitCode, (conductedByUnit.get(unitCode) ?? 0) + 1));
      const attendedByUnit = new Map<string, number>();
      [...unitInPerson, ...unitOnline].forEach(({ unitCode }) => attendedByUnit.set(unitCode, (attendedByUnit.get(unitCode) ?? 0) + 1));
      const unitHealth = enrolledUnits.map(({ unit }) => {
        const unitConducted = conductedByUnit.get(unit.code) ?? 0;
        const unitAttended = attendedByUnit.get(unit.code) ?? 0;
        const unitMissed = Math.max(unitConducted - unitAttended, 0);
        const percentage = unitConducted > 0 ? Math.round((unitAttended / unitConducted) * 100) : 0;
        return { unitCode: unit.code, unitName: unit.name, conducted: unitConducted, attended: unitAttended, missed: unitMissed, percentage, status: unitConducted === 0 ? "No data" : percentage < 75 ? "At risk" : "On track" };
      });
      const attendanceDates = new Set([...weeklyInPerson.map(({ scannedAt }) => scannedAt.toISOString().slice(0, 10)), ...weeklyOnline.map(({ markedAt }) => markedAt.toISOString().slice(0, 10))]);
      let streak = 0;
      const streakDay = new Date();
      streakDay.setHours(0, 0, 0, 0);
      while (attendanceDates.has(streakDay.toISOString().slice(0, 10))) { streak += 1; streakDay.setDate(streakDay.getDate() - 1); }

      return reply.send({
        total: inPersonCount + onlineCount,
        inPerson: inPersonCount,
        online: onlineCount,
        trend,
        units,
        currentSemester: {
          name: currentSemester?.name ?? "Current semester",
          unitsTotal: currentSemester?.units.length ?? 0,
          unitsEnrolled: enrolledUnits.filter(({ unit }) => currentSemester?.units.some(({ id }) => id === unit.id)).length,
        },
        health: { conducted, attended, missed, projectedPercentage: conducted > 0 ? Math.round((attended / conducted) * 100) : 0, goalPercentage: 75, streak },
        unitHealth,
        recent,
      });
    },
  );

  app.post(
    "/online/passkey/register/options",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 5, timeWindow: "5 minutes" } },
    },
    async (request, reply) => {
      const options = await webauthn.registrationOptions(request.user.id);
      if (!options) return reply.code(404).send({ error: "Student not found" });
      return reply.send({ success: true, data: options });
    },
  );

  app.post<{ Body: WebAuthnResponseBody }>(
    "/online/passkey/register/verify",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 5, timeWindow: "5 minutes" } },
    },
    async (request, reply) => {
      if (!request.body.response || typeof request.body.response !== "object")
        return reply.code(400).send({ error: "Passkey response is required" });
      try {
        const result = await webauthn.verifyRegistration(
          request.user.id,
          request.body.response as RegistrationResponseJSON,
        );
        if (!result.verified)
          return reply
            .code(400)
            .send({
              error: "Passkey registration could not be verified",
              reason: result.reason,
            });
        return reply.send({ success: true });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        )
          return reply
            .code(409)
            .send({
              error: "A passkey is already registered for this account",
            });
        throw error;
      }
    },
  );

  app.post<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId/passkey/options",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const options = await webauthn.attendanceOptions(
        request.user.id,
        request.params.sessionId,
      );
      if (!options)
        return reply.code(404).send({ error: "Session not found or closed" });
      if ("noCredential" in options)
        return reply
          .code(409)
          .send({
            error: "Register a passkey before marking attendance",
            code: "PASSKEY_REQUIRED",
          });
      return reply.send({ success: true, data: options });
    },
  );

  app.post<{ Params: AttendanceSessionParams; Body: WebAuthnResponseBody }>(
    "/online/sessions/:sessionId/passkey/verify",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (!request.body.response || typeof request.body.response !== "object")
        return reply.code(400).send({ error: "Passkey response is required" });
      let proof;
      try {
        proof = await webauthn.verifyAttendance(
          request.user.id,
          request.params.sessionId,
          request.body.response as AuthenticationResponseJSON,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "ASSERTION_FAILED";
        await attendance.audit({
          event: "ONLINE_PASSKEY_VERIFY",
          actorId: request.user.id,
          role: "student",
          sessionId: request.params.sessionId,
          success: false,
          reason,
          ipAddress: request.ip,
        });
        return reply
          .code(400)
          .send({ error: "Passkey verification failed", reason });
      }
      if (!proof.verified) {
        await attendance.audit({
          event: "ONLINE_PASSKEY_VERIFY",
          actorId: request.user.id,
          role: "student",
          sessionId: request.params.sessionId,
          success: false,
          reason: proof.reason,
          ipAddress: request.ip,
        });
        return reply
          .code(403)
          .send({ error: "Passkey verification failed", reason: proof.reason });
      }
      const result = await attendance.submitOnlineAttendance({
        sessionId: request.params.sessionId,
        studentId: request.user.id,
        deviceId: proof.deviceId,
        deviceVerified: true,
        ipAddress: request.ip,
      });
      if (result.blocked) return reply.code(403).send(result);
      if (result.duplicate) return reply.code(409).send(result);
      return reply.send(result);
    },
  );

  app.post<{ Body: CreateOnlineSessionBody }>(
    "/online/sessions",
    {
      preHandler: requireAttendanceRole("lecturer"),
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const errors = validateCreateOnlineSession(request.body);
      if (Object.keys(errors).length > 0) {
        return reply
          .code(400)
          .send({ error: "Invalid attendance session", errors });
      }

      const expiresAt = new Date(request.body.expiresAt);

      let session;
      try {
        session = await attendance.createOnlineSession({
          lecturerId: request.user.id,
          unitCode: request.body.unitCode,
          expiresAt,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "You are not assigned to this unit"
        ) {
          return reply.code(403).send({ error: error.message });
        }
        throw error;
      }
      return reply.code(201).send({ success: true, data: session });
    },
  );

  app.get(
    "/online/sessions",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const sessions = await attendance.getLecturerOnlineSessions(
        request.user.id,
      );
      return reply.send({ success: true, data: sessions });
    },
  );

  app.get<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const session = await attendance.getOnlineSession(
        request.params.sessionId,
      );
      if (!session)
        return reply.code(404).send({ error: "Attendance session not found" });
      return reply.send({ success: true, data: session });
    },
  );

  app.post<{
    Params: AttendanceSessionParams;
    Body: SubmitOnlineAttendanceBody;
  }>(
    "/online/sessions/:sessionId/submit",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const result = await attendance.submitOnlineAttendance({
        sessionId: request.params.sessionId,
        studentId: request.user.id,
        deviceId: request.body.deviceId,
        ipAddress: request.ip,
      });

      if (result.blocked) return reply.code(403).send(result);
      if (result.duplicate) return reply.code(409).send(result);
      return reply.send(result);
    },
  );

  app.post<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId/end",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const result = await attendance.endOnlineSession(
        request.params.sessionId,
        request.user.id,
      );
      if (result.count === 0)
        return reply
          .code(404)
          .send({ error: "Session not found or not owned by lecturer" });
      return reply.send({ success: true });
    },
  );

  app.get<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId/attendees",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const attendees = await attendance.getOnlineSessionAttendees(
        request.params.sessionId,
        request.user.id,
      );
      if (!attendees)
        return reply
          .code(404)
          .send({ error: "Session not found or not owned by lecturer" });
      return reply.send({ success: true, data: attendees });
    },
  );
};
