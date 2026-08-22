import type { FastifyPluginAsync } from "fastify";
import {
  batchUpsertCourses,
  deleteCoursesByInstitution,
  type AcademicCourse,
} from "./course.batch.js";

interface BatchUpsertBody {
  courses: AcademicCourse[];
  institutionId: string;
}

interface DeleteQuery {
  institutionId: string;
}

export const courseRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: BatchUpsertBody }>(
    "/batch",
    async (request, reply) => {
      try {
        const { courses, institutionId } = request.body;

        if (!courses || courses.length === 0) {
          return reply.code(400).send({ error: "Courses data is required" });
        }

        if (!institutionId) {
          return reply.code(400).send({ error: "Institution ID is required" });
        }

        const result = await batchUpsertCourses({ courses, institutionId });
        return reply.send(result);
      } catch (err) {
        app.log.error("Error batch saving courses:", err);
        return reply.code(500).send({ error: "Failed to save courses" });
      }
    }
  );

  app.delete<{ Querystring: DeleteQuery }>(
    "/batch",
    async (request, reply) => {
      try {
        const { institutionId } = request.query;

        if (!institutionId) {
          return reply.code(400).send({ error: "Institution ID is required" });
        }

        const result = await deleteCoursesByInstitution(institutionId);
        return reply.send(result);
      } catch (err) {
        app.log.error("Error clearing courses:", err);
        return reply.code(500).send({ error: "Failed to clear courses" });
      }
    }
  );
};