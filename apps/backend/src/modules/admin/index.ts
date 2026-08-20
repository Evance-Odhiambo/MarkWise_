import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin.route.js";

export const adminModule: FastifyPluginAsync = async (app) => {
	await app.register(adminRoutes);
};