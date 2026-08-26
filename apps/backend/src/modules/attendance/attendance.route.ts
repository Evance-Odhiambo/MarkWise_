import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";
import { AttendanceService } from "./attendance.service.js";
import { WebAuthnService } from "./webauthn.service.js";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
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

  app.post(
    "/online/passkey/register/options",
    { preHandler: requireAttendanceRole("student"), config: { rateLimit: { max: 5, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      const options = await webauthn.registrationOptions(request.user.id);
      if (!options) return reply.code(404).send({ error: "Student not found" });
      return reply.send({ success: true, data: options });
    },
  );

  app.post<{ Body: WebAuthnResponseBody }>(
    "/online/passkey/register/verify",
    { preHandler: requireAttendanceRole("student"), config: { rateLimit: { max: 5, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      if (!request.body.response || typeof request.body.response !== "object") return reply.code(400).send({ error: "Passkey response is required" });
      try {
        const result = await webauthn.verifyRegistration(request.user.id, request.body.response as RegistrationResponseJSON);
        if (!result.verified) return reply.code(400).send({ error: "Passkey registration could not be verified", reason: result.reason });
        return reply.send({ success: true });
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return reply.code(409).send({ error: "A passkey is already registered for this account" });
        throw error;
      }
    },
  );

  app.post<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId/passkey/options",
    { preHandler: requireAttendanceRole("student"), config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const options = await webauthn.attendanceOptions(request.user.id, request.params.sessionId);
      if (!options) return reply.code(404).send({ error: "Session not found or closed" });
      if ("noCredential" in options) return reply.code(409).send({ error: "Register a passkey before marking attendance", code: "PASSKEY_REQUIRED" });
      return reply.send({ success: true, data: options });
    },
  );

  app.post<{ Params: AttendanceSessionParams; Body: WebAuthnResponseBody }>(
    "/online/sessions/:sessionId/passkey/verify",
    { preHandler: requireAttendanceRole("student"), config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!request.body.response || typeof request.body.response !== "object") return reply.code(400).send({ error: "Passkey response is required" });
      let proof;
      try {
        proof = await webauthn.verifyAttendance(request.user.id, request.params.sessionId, request.body.response as AuthenticationResponseJSON);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "ASSERTION_FAILED";
        await attendance.audit({ event: "ONLINE_PASSKEY_VERIFY", actorId: request.user.id, role: "student", sessionId: request.params.sessionId, success: false, reason, ipAddress: request.ip });
        return reply.code(400).send({ error: "Passkey verification failed", reason });
      }
      if (!proof.verified) {
        await attendance.audit({ event: "ONLINE_PASSKEY_VERIFY", actorId: request.user.id, role: "student", sessionId: request.params.sessionId, success: false, reason: proof.reason, ipAddress: request.ip });
        return reply.code(403).send({ error: "Passkey verification failed", reason: proof.reason });
      }
      const result = await attendance.submitOnlineAttendance({ sessionId: request.params.sessionId, studentId: request.user.id, deviceId: proof.deviceId, deviceVerified: true, ipAddress: request.ip });
      if (result.blocked) return reply.code(403).send(result);
      if (result.duplicate) return reply.code(409).send(result);
      return reply.send(result);
    },
  );

  app.post<{ Body: CreateOnlineSessionBody }>(
    "/online/sessions",
    { preHandler: requireAttendanceRole("lecturer"), config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const errors = validateCreateOnlineSession(request.body);
      if (Object.keys(errors).length > 0) {
        return reply.code(400).send({ error: "Invalid attendance session", errors });
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
        if (error instanceof Error && error.message === "You are not assigned to this unit") {
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
      const sessions = await attendance.getLecturerOnlineSessions(request.user.id);
      return reply.send({ success: true, data: sessions });
    },
  );

  app.get<{ Params: AttendanceSessionParams }>(
    "/online/sessions/:sessionId",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const session = await attendance.getOnlineSession(request.params.sessionId);
      if (!session) return reply.code(404).send({ error: "Attendance session not found" });
      return reply.send({ success: true, data: session });
    },
  );

  app.post<{ Params: AttendanceSessionParams; Body: SubmitOnlineAttendanceBody }>(
    "/online/sessions/:sessionId/submit",
    { preHandler: requireAttendanceRole("student"), config: { rateLimit: { max: 3, timeWindow: "1 minute" } } },
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
      const result = await attendance.endOnlineSession(request.params.sessionId, request.user.id);
      if (result.count === 0) return reply.code(404).send({ error: "Session not found or not owned by lecturer" });
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
      if (!attendees) return reply.code(404).send({ error: "Session not found or not owned by lecturer" });
      return reply.send({ success: true, data: attendees });
    },
  );
};
