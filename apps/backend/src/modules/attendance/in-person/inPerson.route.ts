import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../../plugins/index.js";
import { InPersonService } from "./inPerson.service.js";
import { sendPushNotification } from "../../notification/notification.service.js";
import {
  PIN_ROTATION_SECONDS as PIN_WINDOW_SECONDS,
  validateCreateInPersonSession,
  validateLecturerAssistedMark,
  validateSubmitInPersonAttendance,
} from "./inPerson.schema.js";
import type { InPersonMethod } from "./index.js";

const METHOD_LABELS: Record<string, string> = {
  qr: "QR code",
  ble: "Bluetooth signal",
  pin: "PIN",
};

// Human-readable text for every rejection reason verifyPin/verify/verifyBle/
// verifyRelay/verifyLecturerAssisted can throw — students should never see a
// raw code like RELAY_SELF_MARK in a notification.
const REJECTION_REASON_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: "the session could not be found",
  SESSION_EXPIRED: "the session had already ended",
  SESSION_NOT_OWNED: "the session could not be found",
  SESSION_TIME_MISMATCH: "the session details didn't match — try again",
  SCAN_TIME_INVALID: "the scan time didn't match — check your device clock",
  SESSION_MISMATCH: "the code was for a different session",
  BLE_SESSION_MISMATCH: "the code was for a different session",
  UNIT_MISMATCH: "the code was for a different unit",
  REQUEST_UNIT_MISMATCH: "the code was for a different unit",
  NONCE_MISMATCH: "the code didn't match this session — try scanning again",
  ISSUED_AT_INVALID: "the code had expired — try the current one",
  COUNTER_DRIFT: "the code had expired — try the current one",
  PIN_COUNTER_DRIFT: "the PIN had expired — try the current one",
  RELAY_COUNTER_DRIFT: "the shared code had expired — try the current one",
  SIGNATURE_INVALID: "the code could not be verified",
  BLE_FORMAT_INVALID: "the Bluetooth signal could not be read",
  PIN_FORMAT_INVALID: "the PIN was not in a valid format",
  PIN_INVALID: "the PIN entered was incorrect",
  RELAY_FORMAT_INVALID: "the shared code was not in a valid format",
  RELAY_SELF_MARK: "you can't use your own relay code",
  RELAY_PARENT_NOT_VERIFIED:
    "the classmate who shared this code hasn't been verified yet",
  RELAY_PARENT_INVALID: "the shared code is no longer valid",
  RELAY_DEVICE_NOT_REGISTERED:
    "the sharing device isn't registered — ask them to reconnect once online",
  RELAY_SIGNATURE_INVALID: "the shared code could not be verified",
  METHOD_MISMATCH: "this method isn't available for this code",
  UNIT_NOT_FOUND: "this unit could not be found",
  NOT_ENROLLED: "you're not enrolled in this unit",
  DEVICE_CONFLICT:
    "this device is already linked to another student's attendance",
};

const humanizeRejectionReason = (reason?: string) =>
  (reason && REJECTION_REASON_MESSAGES[reason]) ||
  "attendance could not be verified";

export const inPersonRoutes: FastifyPluginAsync = async (app) => {
  const service = new InPersonService(app.prisma);
  const PIN_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

  // Background sync (queued offline records synced later, or a session that
  // hasn't been claimed by the server yet) means a student's device can show
  // local "success" before the server has actually verified anything. This
  // is the only thing that closes that loop for every method, not just PIN —
  // without it, a background rejection is silent and the student has no way
  // to know they aren't actually marked present.
  //
  // A single logical attendance attempt can legitimately reach this twice —
  // e.g. an immediate sync() call racing a background syncPending() sweep of
  // the same queued record — so skip re-notifying an identical outcome for
  // the same session/method the caller already just reported.
  const NOTIFY_DEDUPE_WINDOW_MS = 5 * 60 * 1000;
  const notifyAttendanceOutcome = async (
    studentId: string,
    method: InPersonMethod | string,
    success: boolean,
    sessionId: string,
    reason?: string
  ) => {
    const outcome = success ? "verified" : "rejected";
    const recent = await app.prisma.notification
      .findFirst({
        where: {
          userId: studentId,
          type: "attendance",
          createdAt: { gte: new Date(Date.now() - NOTIFY_DEDUPE_WINDOW_MS) },
          AND: [
            { data: { path: ["sessionId"], equals: sessionId } },
            { data: { path: ["method"], equals: method } },
            { data: { path: ["outcome"], equals: outcome } },
          ],
        },
        select: { id: true },
      })
      .catch(() => null);
    if (recent) return;
    const label = METHOD_LABELS[method] || "attendance";
    // Best-effort — a notification is still worth sending (with just the
    // unit code, or none at all) if this lookup fails for any reason.
    const session = await app.prisma.conductedSession
      .findUnique({
        where: { id: sessionId },
        select: { unitCode: true, institutionId: true },
      })
      .catch(() => null);
    const unitCode = session?.unitCode;
    const unit = unitCode
      ? await app.prisma.unit
          .findFirst({
            where: {
              code: unitCode,
              institutionId: session!.institutionId,
            },
            select: { name: true },
          })
          .catch(() => null)
      : null;
    const unitDisplay = unit?.name
      ? `${unit.name} (${unitCode})`
      : unitCode || "your unit";
    const notification = await app.prisma.notification
      .create({
        data: {
          userId: studentId,
          userType: "student",
          type: "attendance",
          title: success
            ? `Attendance marked${unitCode ? ` — ${unitCode}` : ""}`
            : `Attendance not marked${unitCode ? ` — ${unitCode}` : ""}`,
          // The reason clause is deliberately last — the list preview
          // truncates to a few words, so a rejection's actual reason only
          // shows once the student opens the notification.
          message: success
            ? `Verified via ${label} for ${unitDisplay}.`
            : `${label} was not accepted for ${unitDisplay}: ${humanizeRejectionReason(reason)}.`,
          data: {
            sessionId,
            method,
            outcome: success ? "verified" : "rejected",
            reason: reason ?? null,
            unitCode: unitCode ?? null,
            unitName: unit?.name ?? null,
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
            // Scope to the student's own institution so a student from
            // institution A can never match a session run at institution B.
            institutionId: request.user.institutionId ?? undefined,
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
              unit: {
                code: unitCode,
                institutionId: request.user.institutionId ?? undefined,
              },
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
              manifest: undefined,
            };
        }
      }
      if (!session)
        return reply.code(202).send({
          success: true,
          data: { status: "queued" as const },
        });
      const currentCounter = Math.floor(
        scannedAt / 1000 / PIN_WINDOW_SECONDS
      );
      const rawPayload = `MWPIN1:${session.id}:${pin}:${currentCounter}`;
      try {
        const result = await service.submitPin(request.user.id, {
          studentId: request.user.id,
          sessionId: session.id,
          unitCode,
          sessionStart: session.sessionStart,
          scannedAt,
          method: "pin",
          rawPayload,
          deviceId: body.deviceId,
        });
        await notifyAttendanceOutcome(
          request.user.id,
          "pin",
          result.status === "verified" || result.status === "duplicate",
          session.id
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "VERIFICATION_FAILED";
        await notifyAttendanceOutcome(request.user.id, "pin", false, session.id, reason);
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
        const reason = error instanceof Error ? error.message : undefined;
        if (reason === "SESSION_OWNERSHIP_CONFLICT")
          return reply.code(409).send({
            error: "This session id is already claimed by another lecturer",
            reason,
          });
        if (reason === "SESSION_ALREADY_EXISTS")
          return reply.code(409).send({
            error: "A session already exists for this unit and start time",
            reason,
          });
        request.log.error({ err: error }, "Unable to create in-person session");
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
      // Pass the caller's institutionId so a nonce shared across institutions
      // always resolves to the correct institution's session.
      const session = await service.getPublicSessionByBleNonce(
        nonce,
        request.user.institutionId ?? undefined
      );
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
              body.rawPayload.startsWith("MWIR1:")
            ? await service.submitRelay(request.user.id, body)
            : await service.submit(request.user.id, body);
        if (body.sessionId)
          await notifyAttendanceOutcome(
            request.user.id,
            body.method,
            result.status === "verified" || result.status === "duplicate",
            body.sessionId
          );
        return reply.send({ success: true, data: result });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "VERIFICATION_FAILED";
        // A session that hasn't been claimed by the server yet is expected
        // and transient (see sessions.claim/offline-session identity) — the
        // client will retry once it's claimed, so don't spam a notification
        // for something that isn't a real rejection yet.
        if (body.sessionId && reason !== "SESSION_NOT_FOUND")
          await notifyAttendanceOutcome(request.user.id, body.method, false, body.sessionId, reason);
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

  // The opaque relay code (MWR1, an 8-hex-char typed/read-aloud code minted
  // server-side via these two routes) has been superseded by the peer
  // helper PIN (verifyPin's peer fallback) for BLE/QR-incapable students —
  // same offline-first goal, but generated entirely on-device from the
  // student's own relay key instead of needing a live mint call, and reuses
  // the existing PIN entry flow instead of a dedicated one. Removed.

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
          .code(reason === "SESSION_NOT_FOUND" ? 404 : 403)
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
            const result = await service.submit(request.user.id, record);
            if (record.sessionId)
              await notifyAttendanceOutcome(
                request.user.id,
                record.method,
                result.status === "verified" || result.status === "duplicate",
                record.sessionId
              );
            return result;
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "VERIFICATION_FAILED";
            if (record.sessionId && reason !== "SESSION_NOT_FOUND")
              await notifyAttendanceOutcome(
                request.user.id,
                record.method,
                false,
                record.sessionId,
                reason
              );
            return { status: "rejected", reason };
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
