import type { FastifyPluginAsync } from "fastify";
import { courseYearRoutes } from "./courseYear.route.js";

export const courseYearModule: FastifyPluginAsync = async (app) => {
  await app.register(courseYearRoutes, { prefix: "/course-years" });
};
