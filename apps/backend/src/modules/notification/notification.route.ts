import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";

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
      const rows = await app.prisma.notification.findMany({
        where: { userId: request.user.id },
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

  app.post(
    "/read-all",
    { preHandler: requireAttendanceRole("student", "lecturer") },
    async (request) => {
      await app.prisma.notification.updateMany({
        where: { userId: request.user.id, read: false },
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
