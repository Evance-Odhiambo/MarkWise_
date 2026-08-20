import type { FastifyPluginAsync } from "fastify";
import { semesterRoutes } from "./semester.route.js";

export const semesterModule: FastifyPluginAsync = async (app) => {
  await app.register(semesterRoutes, { prefix: "/semesters" });
};
