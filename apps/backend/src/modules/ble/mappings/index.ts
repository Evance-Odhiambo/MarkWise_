import type { FastifyPluginAsync } from "fastify";
import { mappingRoutes } from "./mapping.route.js";

export const mappingsModule: FastifyPluginAsync = async (app) => {
  await app.register(mappingRoutes, { prefix: "/mappings" });
};

export { mappingRoutes } from "./mapping.route.js";
export {
  getBleMappings,
  getLecturerBleMappings,
  getNextUnitBleId,
} from "./mapping.service.js";
export * from "./mapping.schema.js";
