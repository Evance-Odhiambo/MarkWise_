import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";
import type { PrismaClient } from "../../generated/prisma/client.js";

const BIN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// No scheduled-job infrastructure exists in this backend (confirmed —
// nothing anywhere registers a cron/interval job), so a background 30-day
// auto-purge isn't available without adding new infra. Purging lazily,
// scoped to this user, whenever either of their own notification lists is
// actually read needs none: it guarantees a notification is gone within 30
// days of being deleted, just not necessarily on the exact day if the user
// never opens the app.
const purgeExpiredNotifications = (prisma: PrismaClient, userId: string) =>
  prisma.notification
    .deleteMany({
      where: { userId, deletedAt: { lt: new Date(Date.now() - BIN_RETENTION_MS) } },
    })
    .catch(() => undefined);

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { token?: string } }>(
    "/device-token",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const token = String(request.body?.token || "").trim();
      if (!token || token.length > 4096)
        return reply.code(400).send({ error: "A valid device token is required" });

      if (request.user.role === "student")
        await app.prisma.student.update({
          where: { id: request.user.id },
          data: { pushToken: token },
        });
      else
        await app.prisma.lecturer.update({
          where: { id: request.user.id },
          data: { fcmToken: token },
        });
      return reply.send({ success: true });
    },
  );

  app.get(
    "/",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      await purgeExpiredNotifications(app.prisma, request.user.id);
      const rows = await app.prisma.notification.findMany({
        where: { userId: request.user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return {
        notifications: rows,
        unreadCount: rows.filter((row) => !row.read).length,
        hasMore: false,
      };
    },
  );

  app.get(
    "/bin",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      await purgeExpiredNotifications(app.prisma, request.user.id);
      const rows = await app.prisma.notification.findMany({
        where: { userId: request.user.id, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
      return {
        notifications: rows.map((row) => ({
          ...row,
          daysRemaining: Math.max(
            0,
            Math.ceil(
              (row.deletedAt!.getTime() + BIN_RETENTION_MS - Date.now()) /
                (24 * 60 * 60 * 1000)
            )
          ),
        })),
      };
    },
  );

  app.post(
    "/:id/delete",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const result = await app.prisma.notification.updateMany({
        where: {
          id: (request.params as { id: string }).id,
          userId: request.user.id,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      if (!result.count)
        return reply.code(404).send({ error: "Notification not found" });
      return { success: true };
    },
  );

  app.post<{ Body: { ids?: string[] } }>(
    "/delete-bulk",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      const ids = Array.isArray(request.body?.ids)
        ? request.body.ids.filter((id) => typeof id === "string")
        : undefined;
      // Omitting ids deletes every currently-active notification — the
      // "select all" / "delete all" path, same call either way.
      const result = await app.prisma.notification.updateMany({
        where: {
          userId: request.user.id,
          deletedAt: null,
          ...(ids ? { id: { in: ids } } : {}),
        },
        data: { deletedAt: new Date() },
      });
      return { success: true, deleted: result.count };
    },
  );

  app.post(
    "/:id/restore",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const result = await app.prisma.notification.updateMany({
        where: {
          id: (request.params as { id: string }).id,
          userId: request.user.id,
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });
      if (!result.count)
        return reply.code(404).send({ error: "Notification not found" });
      return { success: true };
    },
  );

  app.post(
    "/:id/delete-permanent",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const result = await app.prisma.notification.deleteMany({
        where: {
          id: (request.params as { id: string }).id,
          userId: request.user.id,
          deletedAt: { not: null },
        },
      });
      if (!result.count)
        return reply.code(404).send({ error: "Notification not found" });
      return { success: true };
    },
  );

  app.post(
    "/read-all",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      await app.prisma.notification.updateMany({
        where: { userId: request.user.id, read: false, deletedAt: null },
        data: { read: true },
      });
      return { success: true };
    },
  );

  app.post(
    "/:id/read",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request, reply) => {
      const result = await app.prisma.notification.updateMany({
        where: {
          id: (request.params as { id: string }).id,
          userId: request.user.id,
        },
        data: { read: true },
      });
      if (!result.count)
        return reply.code(404).send({ error: "Notification not found" });
      return { success: true };
    },
  );
};
