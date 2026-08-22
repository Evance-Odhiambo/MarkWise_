import type { FastifyPluginAsync } from "fastify";
import { contactRoute } from "./contact.route.js";

export const contactModule: FastifyPluginAsync = async (app) => {
  app.register(contactRoute, { prefix: "/contact" });
};