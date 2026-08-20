import cors from "@fastify/cors";
import { env } from "../config/index.js";

export const corsPlugin = cors;
export const corsOptions = {
  origin: env.corsOrigins,
  credentials: true,
};
