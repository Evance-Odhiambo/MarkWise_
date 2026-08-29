import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { requireAttendanceRole } from "../../../plugins/index.js";
import { InPersonService } from "./inPerson.service.js";
import { sendPushNotification } from "../../notification/notification.service.js";
import {
  validateCreateInPersonSession,
  validateLecturerAssistedMark,
  validateSubmitInPersonAttendance,
} from "./inPerson.schema.js";

export const inPersonRoutes: FastifyPluginAsync = async (app) => {
  const service = new InPersonService(app.prisma);
  const PIN_WINDOW_SECONDS = 30;
  const PIN_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

  const notifyPin = async (
    studentId: string,
    success: boolean,
    sessionId: string,
    reason?: string
  ) => {
    const notification = await app.prisma.notification
      .create({
        data: {
          userId: studentId,
          userType: "student",
          type: "attendance",
          title: success
            ? "Attendance PIN accepted"
            : "Attendance PIN rejected",
          message: success
            ? "Your attendance PIN was verified by the server."
            : `Your attendance PIN was rejected${reason ? `: ${reason}` : "."}`,
          data: {
            sessionId,
            outcome: success ? "verified" : "rejected",
            reason: reason ?? null,
          },
        },
      })
      .catch(() => undefined);
    if (notification)
      await sendPushNotification(app.prisma, {
        userId: studentId,
        userType: "student",
        title: notification.title,
        body: notification.message,
        data: notification.data as Record<string, unknown> | undefined,
      });
  };

  app.post(
    "/pin-submit",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const body = (request.body || {}) as {
        unitCode?: string;
        pin?: string;
        scannedAt?: string | number;
        deviceId?: string;
      };
      const unitCode = String(body.unitCode || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
      const pin = String(body.pin || "").trim();
      const scannedAt = Number(body.scannedAt);
      if (!unitCode || !/^\d{6}$/.test(pin) || !Number.isFinite(scannedAt))
        return reply.code(400).send({
          error: "Unit code, six-digit PIN, and scan time are required",
        });

      if (Date.now() - scannedAt > PIN_PENDING_TTL_MS)
        return reply
          .code(410)
          .send({ error: "This PIN submission has expired" });

      let session = await service.getActiveSessionByUnit(
        unitCode,
        request.user.id
      );
      if (!session) {
        const candidates = await app.prisma.conductedSession.findMany({
          where: {
            unitCode,
            sessionStart: {
              gte: new Date(scannedAt - 60 * 60 * 1000),
              lte: new Date(scannedAt + 15_000),
            },
          },
          orderBy: { sessionStart: "desc" },
          take: 20,
        });
        const candidate = candidates.find((row) => {
          const start = row.sessionStart.getTime();
          const end = start + row.sessionDuration * 1000;
          return scannedAt >= start - 15_000 && scannedAt <= end + 15_000;
        });
        if (candidate) {
          const enrolled = await app.prisma.enrollment.findFirst({
            where: {
              studentId: request.user.id,
              unit: { code: unitCode },
            },
          });
          if (enrolled)
            session = {
              id: candidate.id,
              unitCode: candidate.unitCode,
              sessionStart: candidate.sessionStart.getTime(),
              expiresAt:
                candidate.sessionStart.getTime() +
                candidate.sessionDuration * 1000,
              sessionNonce: Number(candidate.sessionNonce),
              bleUnitId: candidate.bleUnitId
                ? Number(candidate.bleUnitId)
                : null,
              status: "active" as const,
            };
        }
      }
      if (!session)
        return reply.code(202).send({
          success: true,
          data: { status: "queued" as const },
        });
      const startCounter = Math.floor(
        session.sessionStart / 1000 / PIN_WINDOW_SECONDS
      );
      const currentCounter =
        Math.floor(scannedAt / 1000 / PIN_WINDOW_SECONDS) - startCounter;
      const rawPayload = `MWPIN1:${session.id}:${pin}:${currentCounter}`;
      try {
        const result = await service.submitPin(request.user.id, {
          sessionId: session.id,
          unitCode,
          sessionStart: session.sessionStart,
          scannedAt,
          method: "pin",
          rawPayload,
          deviceId: body.deviceId,
        });
        await notifyPin(
          request.user.id,
          result.status === "verified" || result.status === "duplicate",
          session.id
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "VERIFICATION_FAILED";
        await notifyPin(request.user.id, false, session.id, reason);
        return reply
          .code(403)
          .send({ error: "Attendance verification failed", reason });
      }
    }
  );

  app.post(
    "/sessions",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const errors = validateCreateInPersonSession(request.body as any);
      if (Object.keys(errors).length)
        return reply
          .code(400)
          .send({ error: "Invalid in-person session", errors });
      try {
        return reply.code(201).send({
          success: true,
          data: await service.createSession(
            request.user.id,
            request.body as any
          ),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "UNIT_NOT_IN_INSTITUTION"
        )
          return reply.code(403).send({
            error: "The selected unit is not available at your institution",
          });
        throw error;
      }
    }
  );

  app.post<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId/end",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const result = await service.endSession(
        request.params.sessionId,
        request.user.id
      );
      if (!result.count)
        return reply
          .code(404)
          .send({ error: "Session not found or not owned by lecturer" });
      return reply.send({ success: true });
    }
  );

  app.get<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const session = await service.getPublicSession(request.params.sessionId);
      if (!session)
        return reply.code(404).send({ error: "Attendance session not found" });
      return reply.send({ success: true, data: session });
    }
  );

  app.get<{ Params: { nonce: string } }>(
    "/sessions/by-ble/:nonce",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const nonce = Number(request.params.nonce);
      if (!Number.isSafeInteger(nonce) || nonce < 0)
        return reply.code(400).send({ error: "Invalid BLE nonce" });
      const session = await service.getPublicSessionByBleNonce(nonce);
      if (!session)
        return reply.code(404).send({ error: "BLE session not found" });
      return reply.send({ success: true, data: session });
    }
  );

  app.get<{ Params: { unitCode: string } }>(
    "/sessions/by-unit/:unitCode",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const session = await service.getActiveSessionByUnit(
        request.params.unitCode,
        request.user.id
      );
      if (!session)
        return reply
          .code(404)
          .send({ error: "No active attendance session for this unit" });
      return reply.send({ success: true, data: session });
    }
  );

  app.post(
    "/submit",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const body = request.body as any;
      const errors = validateSubmitInPersonAttendance(body);
      if (Object.keys(errors).length)
        return reply
          .code(400)
          .send({ error: "Invalid attendance submission", errors });
      try {
        const result =
          body.method === "pin"
            ? await service.submitPin(request.user.id, body)
            : typeof body.rawPayload === "string" &&
              (body.rawPayload.startsWith("MWIR1:") ||
                body.rawPayload.startsWith("MWIR2:"))
            ? body.rawPayload.startsWith("MWIR2:")
              ? await service.submitOpaqueRelay(request.user.id, body)
              : await service.submitRelay(request.user.id, body)
            : await service.submit(request.user.id, body);
        if (body.method === "pin")
          await notifyPin(
            request.user.id,
            result.status === "verified" || result.status === "duplicate",
            body.sessionId
          );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "VERIFICATION_FAILED";
        if (body.method === "pin" && body.sessionId)
          await notifyPin(request.user.id, false, body.sessionId, reason);
        return reply
          .code(reason === "SESSION_NOT_FOUND" ? 404 : 403)
          .send({ error: "Attendance verification failed", reason });
      }
    }
  );

  app.post(
    "/relay/register-device",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const deviceKey = String((request.body as any)?.deviceKey || "");
      if (!/^[0-9a-f]{64}$/i.test(deviceKey))
        return reply
          .code(400)
          .send({ error: "deviceKey must be a 256-bit hex key" });
      await app.prisma.studentDevice.upsert({
        where: { userId_deviceKey: { userId: request.user.id, deviceKey } },
        update: { lastUsedAt: new Date() },
        create: { userId: request.user.id, deviceKey, role: "student" },
      });
      return reply.code(201).send({ success: true });
    }
  );

  // Server-issued opaque relay proofs are compact enough for BLE. They can
  // only be created after this student's attendance is verified.
  app.post<{ Body: { sessionId?: string } }>(
    "/relay/create-token",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const sessionId = String(request.body?.sessionId || "");
      if (!sessionId)
        return reply.code(400).send({ error: "sessionId is required" });
      const parent = await app.prisma.inPersonAttendanceRecord.findFirst({
        where: {
          studentId: request.user.id,
          conductedSessionId: sessionId,
          verificationStatus: "verified",
        },
        orderBy: { createdAt: "desc" },
      });
      if (!parent)
        return reply.code(403).send({
          error:
            "Attendance must be server verified before relay can be enabled",
          reason: "RELAY_PARENT_NOT_VERIFIED",
        });
      const relayToken = crypto.randomBytes(4).toString("hex");
      await app.prisma.inPersonAttendanceRecord.update({
        where: { id: parent.id },
        data: { token: relayToken },
      });
      const bytes = Buffer.concat([
        Buffer.from("MWI2", "ascii"),
        Buffer.from(relayToken, "hex"),
        Buffer.from([1]),
      ]);
      return reply.code(201).send({
        success: true,
        data: { payload: `MWIR2:${bytes.toString("base64")}` },
      });
    }
  );

  app.get<{ Params: { token: string } }>(
    "/sessions/by-relay/:token",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      if (!/^[0-9a-f]{8}$/i.test(request.params.token))
        return reply.code(400).send({ error: "Invalid relay token" });
      const parent = await app.prisma.inPersonAttendanceRecord.findFirst({
        where: { token: request.params.token },
        select: { conductedSessionId: true },
      });
      if (!parent?.conductedSessionId)
        return reply.code(404).send({ error: "Relay session not found" });
      const session = await service.getPublicSession(parent.conductedSessionId);
      if (!session)
        return reply.code(404).send({ error: "Relay session not found" });
      return reply.send({ success: true, data: session });
    }
  );

  app.post(
    "/assisted-mark",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const body = request.body as any;
      const errors = validateLecturerAssistedMark(body);
      if (Object.keys(errors).length)
        return reply.code(400).send({ error: "Invalid assisted mark", errors });
      try {
        const result = await service.submitAssisted(request.user.id, body);
        return reply.send({ success: true, data: result });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "VERIFICATION_FAILED";
        return reply
          .code(reason === "SESSION_NOT_FOUND_OR_NOT_OWNED" ? 404 : 403)
          .send({ error: "Assisted attendance verification failed", reason });
      }
    }
  );

  app.post(
    "/batch-sync",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const records = Array.isArray((request.body as any)?.records)
        ? (request.body as any).records
        : [];
      if (!records.length || records.length > 50)
        return reply
          .code(400)
          .send({ error: "records must contain between 1 and 50 items" });
      const results = await Promise.all(
        records.map(async (record: any) => {
          const errors = validateSubmitInPersonAttendance(record);
          if (Object.keys(errors).length)
            return { status: "rejected", reason: "INVALID_REQUEST" };
          try {
            return await service.submit(request.user.id, record);
          } catch (error) {
            return {
              status: "rejected",
              reason:
                error instanceof Error ? error.message : "VERIFICATION_FAILED",
            };
          }
        })
      );
      return reply.send({
        success: true,
        data: {
          verified: results.filter((result) => result.status === "verified")
            .length,
          duplicate: results.filter((result) => result.status === "duplicate")
            .length,
          rejected: results.filter((result) => result.status === "rejected")
            .length,
        },
      });
    }
  );
};
