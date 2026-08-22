import type { FastifyPluginAsync } from "fastify";
import { importLecturers, type ImportRequest, type ImportResponse, type ApiError } from "./lecturer.import.js";

export const lecturerRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ImportRequest }>(
    "/import",
    async (request, reply) => {
      try {
        const result = await importLecturers(request.body);

        if (result.status !== 200) {
          return reply.code(result.status).send(result.body);
        }

        const response = result.body as ImportResponse;
        return reply.send(response);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("fetch")) {
          return reply.code(502).send({ error: `Failed to connect to institution API: ${err.message}` });
        }
        return reply.code(500).send({
          error: err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    }
  );
};