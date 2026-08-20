import type { FastifyPluginAsync } from "fastify";
import { studentRoutes } from "./student.route.js";

export const studentModule: FastifyPluginAsync = async (app) => {
  await app.register(studentRoutes, { prefix: "/" });
};
