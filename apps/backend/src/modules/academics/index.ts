import type { FastifyPluginAsync } from "fastify";
import { courseModule } from "./course/index.js";
import { courseYearModule } from "./courseYear/index.js";
import { semesterModule } from "./semester/index.js";
import { unitModule } from "./unit/index.js";

export const academicsModule: FastifyPluginAsync = async (app) => {
  await app.register(courseModule);
  await app.register(courseYearModule);
  await app.register(semesterModule);
  await app.register(unitModule);
};
