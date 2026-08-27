import type { FastifyPluginAsync } from "fastify";
import { courseRoutes } from "./course.route.js";

export const courseModule: FastifyPluginAsync = async (app) => {
  await app.register(courseRoutes, { prefix: "/courses" });
};
