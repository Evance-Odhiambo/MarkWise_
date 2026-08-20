import type { FastifyPluginAsync } from "fastify";
import { institutionRoutes } from "./institution.route.js";

export const institutionModule: FastifyPluginAsync = async (app) => {
  await app.register(institutionRoutes, { prefix: "/" });
};
