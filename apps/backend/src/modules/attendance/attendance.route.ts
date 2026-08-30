import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { requireAttendanceRole } from "../../plugins/index.js";
import { AttendanceService } from "./attendance.service.js";
import { WebAuthnService } from "./webauthn.service.js";
import { sendPushNotification } from "../notification/notification.service.js";
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

const ATTENDANCE_GOAL = 75;

type LecturerAtRiskStudent = {
  id: string;
  name: string;
  admissionNumber: string;
  unitCode: string;
  attendanceRate: number;
  missedCount: number;
};

async function getLecturerSummary(prisma: PrismaClient, lecturerId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const selectedUnits = await prisma.lecturerUnit.findMany({
    where: { lecturerId },
    select: {
      unit: {
        select: {
          code: true,
          name: true,
          semester: { select: { name: true } },
          enrollments: {
            select: {
              student: {
                select: { id: true, name: true, admissionNumber: true },
              },
            },
          },
        },
      },
    },
  });
  const selectedCodes = new Set(
    selectedUnits.map(({ unit }) => unit.code.toUpperCase()),
  );
  const unitCodes = selectedUnits.map(({ unit }) => unit.code);
  const studentIds = [
    ...new Set(
      selectedUnits.flatMap(({ unit }) =>
        unit.enrollments.map(({ student }) => student.id),
      ),
    ),
  ];

  // Resolve the lecturer's institutionId once, used to scope attendance record
  // queries so unit-code collisions across institutions don't pollute counts.
  const lecturerRow = await prisma.lecturer.findUnique({
    where: { id: lecturerId },
    select: { institutionId: true },
  });
  const institutionId = lecturerRow?.institutionId;

  const [inPersonSessions, onlineSessions, inPersonRecords, onlineRecords] =
    await Promise.all([
      prisma.conductedSession.findMany({
        where: { lecturerId },
        select: {
          unitCode: true,
          sessionStart: true,
          attendanceRecords: { select: { id: true } },
        },
      }),
      prisma.onlineAttendanceSession.findMany({
        where: { lecturerId },
        select: {
          unitCode: true,
          createdAt: true,
          records: { select: { id: true } },
        },
      }),
      studentIds.length === 0
        ? Promise.resolve([])
        : prisma.inPersonAttendanceRecord.findMany({
            where: {
              studentId: { in: studentIds },
              unitCode: { in: unitCodes },
              // Scope to sessions belonging to this institution so unit code
              // collisions with other institutions don't pollute the counts.
              ...(institutionId
                ? { conductedSession: { institutionId } }
                : {}),
            },
            select: { studentId: true, unitCode: true },
          }),
      studentIds.length === 0
        ? Promise.resolve([])
        : prisma.onlineAttendanceRecord.findMany({
            where: {
              studentId: { in: studentIds },
              unitCode: { in: unitCodes },
              // Same institution scoping for online records.
              ...(institutionId
                ? { session: { institutionId } }
                : {}),
            },
            select: { studentId: true, unitCode: true },
          }),
    ]);

  const sessions = [
    ...inPersonSessions.map((session) => ({
      unitCode: session.unitCode,
      date: session.sessionStart,
      checkIns: session.attendanceRecords.length,
      method: "inPerson",
    })),
    ...onlineSessions.map((session) => ({
      unitCode: session.unitCode,
      date: session.createdAt,
      checkIns: session.records.length,
      method: "online",
    })),
  ].filter((session) => selectedCodes.has(session.unitCode.toUpperCase()));

  const trend = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(since);
    day.setDate(since.getDate() + index);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const daySessions = sessions.filter(
      (session) => session.date >= day && session.date < nextDay,
    );
    return {
      date: day.toISOString().slice(0, 10),
      sessions: daySessions.length,
      checkIns: daySessions.reduce((sum, session) => sum + session.checkIns, 0),
    };
  });

  const attendedByStudentUnit = new Map<string, number>();
  [...inPersonRecords, ...onlineRecords].forEach(({ studentId, unitCode }) => {
    const key = `${studentId}:${unitCode.toUpperCase()}`;
    attendedByStudentUnit.set(key, (attendedByStudentUnit.get(key) ?? 0) + 1);
  });

  const atRiskStudents: LecturerAtRiskStudent[] = [];
  const unitStats = selectedUnits.map(({ unit }) => {
    const unitSessions = sessions.filter(
      (session) => session.unitCode.toUpperCase() === unit.code.toUpperCase(),
    );
    const checkIns = unitSessions.reduce((sum, session) => sum + session.checkIns, 0);
    const conducted = unitSessions.length;
    const enrolled = unit.enrollments.length;
    const studentRates = unit.enrollments.map(({ student }) => {
      const attended =
        attendedByStudentUnit.get(`${student.id}:${unit.code.toUpperCase()}`) ??
        0;
      const missed = Math.max(conducted - attended, 0);
      const attendanceRate =
        conducted > 0 ? Math.round((attended / conducted) * 100) : 0;
      if (conducted > 0 && attendanceRate < ATTENDANCE_GOAL) {
        atRiskStudents.push({
          id: student.id,
          name: student.name,
          admissionNumber: student.admissionNumber,
          unitCode: unit.code,
          attendanceRate,
          missedCount: missed,
        });
      }
      return attendanceRate;
    });
    const attendanceRate =
      conducted > 0 && enrolled > 0
        ? Math.round(
            studentRates.reduce((sum, rate) => sum + rate, 0) / enrolled,
          )
        : 0;
    const atRiskCount = unit.enrollments.filter(({ student }) => {
      const attended =
        attendedByStudentUnit.get(`${student.id}:${unit.code.toUpperCase()}`) ??
        0;
      const rate = conducted > 0 ? Math.round((attended / conducted) * 100) : 0;
      return conducted > 0 && rate < ATTENDANCE_GOAL;
    }).length;
    const status =
      conducted === 0
        ? "No data"
        : attendanceRate >= 90
          ? "Optimal"
          : attendanceRate >= ATTENDANCE_GOAL
            ? "Compliant"
            : "Watchlist";

    return {
      unitCode: unit.code,
      unitName: unit.name,
      semesterName: unit.semester.name,
      enrolled,
      sessions: conducted,
      checkIns,
      averageAttendance: conducted ? Math.round(checkIns / conducted) : 0,
      attendanceRate,
      atRiskCount,
      status,
    };
  });

  const methodStats = ["inPerson", "online"].map((method) => ({
    method,
    sessions: sessions.filter((session) => session.method === method).length,
    checkIns: sessions
      .filter((session) => session.method === method)
      .reduce((sum, session) => sum + session.checkIns, 0),
  }));
  const usedUnits = unitStats.filter((unit) => unit.sessions > 0).length;
  const rankedUnits = [...unitStats]
    .filter((unit) => unit.sessions > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate);
  const totalCheckIns = sessions.reduce((sum, session) => sum + session.checkIns, 0);
  const scoredUnits = unitStats.filter((unit) => unit.sessions > 0);
  const overallComplianceRate =
    scoredUnits.length > 0
      ? Math.round(
          scoredUnits.reduce((sum, unit) => sum + unit.attendanceRate, 0) /
            scoredUnits.length,
        )
      : 0;
  const termName =
    selectedUnits[0]?.unit.semester.name ?? "Current teaching term";

  atRiskStudents.sort((a, b) => a.attendanceRate - b.attendanceRate);

  return {
    trend,
    units: unitStats,
    methods: methodStats,
    totals: { sessions: sessions.length, checkIns: totalCheckIns },
    coverage: { selected: selectedUnits.length, used: usedUnits },
    insights: {
      highestUnit: rankedUnits[0]?.unitCode ?? null,
      lowestUnit: rankedUnits.at(-1)?.unitCode ?? null,
    },
    overallComplianceRate,
    atRiskStudents,
    currentTerm: termName,
  };
}

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  const attendance = new AttendanceService(app.prisma, app.redis);
  const webauthn = new WebAuthnService(app.prisma);

  app.get(
    "/lecturer/summary",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      return reply.send(await getLecturerSummary(app.prisma, request.user.id));
    },
  );

  app.post<{ Body: { studentIds?: string[] } }>(
    "/lecturer/warnings",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const summary = await getLecturerSummary(app.prisma, request.user.id);
      const requestedIds = Array.isArray(request.body?.studentIds)
        ? new Set(
            request.body.studentIds.filter(
              (id): id is string => typeof id === "string",
            ),
          )
        : null;
      const targets = summary.atRiskStudents.filter((student) =>
        requestedIds ? requestedIds.has(student.id) : true,
      );
      if (targets.length === 0)
        return reply
          .code(400)
          .send({ error: "No at-risk students matched the request" });

      const uniqueKeys = new Set<string>();
      let notified = 0;
      for (const student of targets) {
        const key = `${student.id}:${student.unitCode}`;
        if (uniqueKeys.has(key)) continue;
        uniqueKeys.add(key);
        const title = "Attendance advisory";
        const message = `Your attendance in ${student.unitCode} is currently ${student.attendanceRate}%. The exam threshold is ${ATTENDANCE_GOAL}%. Please attend remaining sessions.`;
        const notification = await app.prisma.notification.create({
          data: {
            userId: student.id,
            userType: "student",
            type: "ATTENDANCE",
            title,
            message,
            data: {
              unitCode: student.unitCode,
              attendanceRate: student.attendanceRate,
            },
          },
        });
        await sendPushNotification(app.prisma, {
          userId: student.id,
          userType: "student",
          title: notification.title,
          body: notification.message,
          data: notification.data as Record<string, unknown> | undefined,
        });
        notified += 1;
      }

      return reply.send({ success: true, notified });
    },
  );

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
                select: { yearNumber: true, semester: { orderBy: { semesterNumber: "desc" }, select: { id: true, name: true, units: { select: { id: true } } } } },
              },
            },
          },
        },
      });
      if (!student) return reply.code(404).send({ error: "Student record not found" });
      const currentYear = student.course.years.find(({ yearNumber }) => yearNumber === student.year) ?? student.course.years[0];
      const fallbackSemester = currentYear?.semester[0];
      const enrolledUnits = await app.prisma.enrollment.findMany({ where: { studentId }, select: { unit: { select: { id: true, code: true, name: true, semesterId: true } } } });
      const semesterCounts = new Map<string, number>();
      enrolledUnits.forEach(({ unit }) => semesterCounts.set(unit.semesterId, (semesterCounts.get(unit.semesterId) ?? 0) + 1));
      const selectedSemesterId = [...semesterCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const selectedSemester = student.course.years.flatMap(({ semester }) => semester).find(({ id }) => id === selectedSemesterId) ?? fallbackSemester;
      const selectedSemesterUnitCount = enrolledUnits.filter(({ unit }) => unit.semesterId === selectedSemester?.id).length;
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
        // Scope conducted-session counts to this student's institution so unit
        // code collisions with other institutions don't inflate the denominator.
        app.prisma.conductedSession.findMany({
          where: {
            unitCode: { in: enrolledUnitCodes },
            institutionId: request.user.institutionId ?? undefined,
          },
          select: { unitCode: true },
        }),
        app.prisma.onlineAttendanceSession.findMany({
          where: {
            unitCode: { in: enrolledUnitCodes },
            institutionId: request.user.institutionId ?? undefined,
          },
          select: { unitCode: true },
        }),
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
          name: selectedSemester?.name ?? "Current semester",
          unitsTotal: selectedSemester?.units.length ?? 0,
          unitsEnrolled: selectedSemester ? selectedSemesterUnitCount : enrolledUnits.length,
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
      try {
        const options = await webauthn.attendanceOptions(
          request.user.id,
          request.params.sessionId,
        );
        if (!options)
          return reply.code(404).send({ error: "Session not found or closed" });
        if ("noCredential" in options) return reply.send({ noCredential: true });
        return reply.send({ success: true, data: options });
      } catch (error) {
        request.log.error({ error, userId: request.user.id, sessionId: request.params.sessionId }, "Error generating passkey options");
        return reply.code(400).send({ 
          error: "Failed to generate passkey options",
          detail: error instanceof Error ? error.message : "Unknown error"
        });
      }
    },
  );

  app.post<{ Params: AttendanceSessionParams; Body: WebAuthnResponseBody }>(
    "/online/sessions/:sessionId/passkey/verify",
    {
      preHandler: requireAttendanceRole("student"),
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      // Debug logging
      request.log.info({ 
        body: request.body, 
        hasResponse: !!request.body?.response,
        responseType: typeof request.body?.response,
        bodyKeys: request.body ? Object.keys(request.body) : []
      }, "Passkey verify request received");
      
      if (!request.body.response || typeof request.body.response !== "object")
        return reply.code(400).send({ 
          error: "Passkey response is required",
          debug: {
            hasBody: !!request.body,
            hasResponse: !!request.body?.response,
            responseType: typeof request.body?.response,
            bodyKeys: request.body ? Object.keys(request.body) : []
          }
        });
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
