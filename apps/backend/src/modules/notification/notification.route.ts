import type { FastifyPluginAsync } from "fastify";
import { requireAttendanceRole } from "../../plugins/index.js";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
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
