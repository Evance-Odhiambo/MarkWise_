import type { FastifyPluginAsync } from "fastify";
import { unitRoutes } from "./unit.route.js";

export const unitModule: FastifyPluginAsync = async (app) => {
  await app.register(unitRoutes, { prefix: "/units" });
};
