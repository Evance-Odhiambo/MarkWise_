import rateLimit from "@fastify/rate-limit";
import { env } from "../config/index.js";

export const rateLimitPlugin = rateLimit;
export const rateLimitOptions = {
  max: env.rateLimitMax,
  timeWindow: env.rateLimitWindow,
};
