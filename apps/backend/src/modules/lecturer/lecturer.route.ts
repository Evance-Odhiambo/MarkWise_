import type { FastifyPluginAsync } from "fastify";
import {
  importLecturers,
  type ImportRequest,
  type ImportResponse,
} from "./lecturer.service.js";
import { verifyPassword } from "../admin/admin.service.js";

interface LoginBody {
  email: string;
  password: string;
}

export const lecturerRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;
    if (!email || !password) return reply.code(400).send({ error: "Email and password are required" });

    const auth = await app.prisma.lecturerAuth.findUnique({
      where: { email },
      include: { lecturer: true },
    });
    if (!auth || !(await verifyPassword(password, auth.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send({
      userId: auth.lecturer.id,
      name: auth.lecturer.fullName,
      institutionId: auth.lecturer.institutionId,
      token: await app.jwt.sign({ id: auth.lecturer.id, role: "lecturer", institutionId: auth.lecturer.institutionId }),
    });
  });

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
