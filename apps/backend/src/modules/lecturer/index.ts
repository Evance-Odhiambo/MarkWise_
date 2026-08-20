import type { FastifyPluginAsync } from "fastify";
import { lecturerRoutes } from "./lecturer.route.js";

export const lecturerModule: FastifyPluginAsync = async (app) => {
  await app.register(lecturerRoutes, { prefix: "/" });
};
