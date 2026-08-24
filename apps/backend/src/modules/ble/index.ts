import type { FastifyPluginAsync } from "fastify";
import { mappingsModule } from "./mappings/index.js";

export const bleModule: FastifyPluginAsync = async (app) => {
  await app.register(mappingsModule);
};

export { BleManager, createBleManager } from "./ble-manager.js";
