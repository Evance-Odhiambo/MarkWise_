import type { FastifyPluginAsync } from "fastify";
import { notificationRoutes } from "./notification.route.js";

export const notificationModule: FastifyPluginAsync = async (app) => {
  await app.register(notificationRoutes);
};
