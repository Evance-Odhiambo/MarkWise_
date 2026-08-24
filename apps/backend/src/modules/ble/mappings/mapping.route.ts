import type { FastifyPluginAsync } from "fastify";
import { requireBleMappingAccess } from "../../../plugins/index.js";
import { createBleManager } from "../ble-manager.js";

export const mappingRoutes: FastifyPluginAsync = async (app) => {
  const bleManager = createBleManager(app.prisma);

  app.get(
    "/",
    { preHandler: requireBleMappingAccess() },
    async (request, reply) => {
      const mappings = await bleManager.getMappings(request.user.institutionId);
      return reply.send(mappings);
    },
  );

  app.get(
    "/next-id",
    { preHandler: requireBleMappingAccess("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (_request, reply) => reply.send({ bleId: await bleManager.getNextUnitBleId() }),
  );

  app.get(
    "/lecturer",
    { preHandler: requireBleMappingAccess("lecturer") },
    async (request, reply) => reply.send(await bleManager.getLecturerMappings(request.user.id)),
  );

  app.get(
    "/student",
    { preHandler: requireBleMappingAccess("student") },
    async (request, reply) => reply.send(await bleManager.getStudentMappings(request.user.id)),
  );
};
