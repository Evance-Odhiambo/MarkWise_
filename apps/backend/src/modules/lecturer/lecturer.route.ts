import type { FastifyPluginAsync } from "fastify";
import {
  importLecturers,
  type ImportRequest,
  type ImportResponse,
} from "./lecturer.service.js";
import { hashPassword, verifyPassword } from "../admin/admin.service.js";
import {
  requireAttendanceRole,
  requireRoles,
  requireSuperAdmin,
} from "../../plugins/index.js";
import { cleanIdentifier } from "../../shared/identifiers.js";

interface LoginBody {
  email: string;
  password: string;
}

interface LecturerVerificationBody {
  institutionId: string;
  staffNumber: string;
}

interface LecturerRegistrationBody extends LecturerVerificationBody {
  name: string;
  email: string;
  password: string;
}

interface BulkCreateBody {
  institutionId: string;
  lecturers: Array<{ name: string; staffNumber: string; email?: string }>;
}

interface TeachingUnitSelectionBody {
  unitIds: string[];
}

export const lecturerRoutes: FastifyPluginAsync = async (app) => {
  app.delete(
    "/me",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      await app.prisma.$transaction(async (transaction) => {
        await transaction.lecturerAuth.deleteMany({
          where: { lecturerId: request.user.id },
        });
        // Keep the institutional lecturer record and teaching history, but remove account credentials.
        await transaction.lecturer.update({
          where: { id: request.user.id },
          data: { email: null, passwordHash: null },
        });
      });
      return reply.send({ success: true });
    },
  );

  app.get(
    "/units/catalog",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });

      const units = await app.prisma.unit.findMany({
        where: {
          semester: {
            courseYear: { course: { institutionId: lecturer.institutionId } },
          },
        },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      });
      const assignments = await app.prisma.lecturerUnit.findMany({
        where: { lecturerId: request.user.id },
        select: { unitId: true },
      });
      return reply.send({
        units,
        selectedUnitIds: assignments.map(({ unitId }) => unitId),
      });
    },
  );

  app.post<{ Body: TeachingUnitSelectionBody }>(
    "/units",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const unitIds = Array.isArray(request.body.unitIds)
        ? [
            ...new Set(
              request.body.unitIds.filter(
                (id): id is string => typeof id === "string",
              ),
            ),
          ]
        : null;
      if (!unitIds)
        return reply.code(400).send({ error: "Unit IDs must be an array" });

      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });
      const validUnits = await app.prisma.unit.findMany({
        where: {
          id: { in: unitIds },
          semester: {
            courseYear: { course: { institutionId: lecturer.institutionId } },
          },
        },
        select: { id: true },
      });
      if (validUnits.length !== unitIds.length)
        return reply
          .code(400)
          .send({
            error: "One or more units are not part of your institution",
          });

      await app.prisma.$transaction(async (transaction) => {
        await transaction.lecturerUnit.deleteMany({
          where: { lecturerId: request.user.id },
        });
        if (unitIds.length > 0)
          await transaction.lecturerUnit.createMany({
            data: unitIds.map((unitId) => ({
              lecturerId: request.user.id,
              unitId,
            })),
          });
      });
      return reply.send({ success: true, selectedUnitIds: unitIds });
    },
  );

  app.get(
    "/units",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const assignments = await app.prisma.lecturerUnit.findMany({
        where: { lecturerId: request.user.id },
        orderBy: { unit: { code: "asc" } },
        select: { unit: { select: { id: true, code: true, name: true } } },
      });

      return reply.send({ units: assignments.map(({ unit }) => unit) });
    },
  );

  app.post<{ Body: LecturerVerificationBody }>(
    "/verify",
    async (request, reply) => {
      const institutionId = request.body.institutionId?.trim();
      const staffNumber = cleanIdentifier(request.body.staffNumber);
      if (!institutionId || !staffNumber) {
        return reply
          .code(400)
          .send({ error: "Institution ID and staff number are required" });
      }

      const lecturer = await app.prisma.lecturer.findFirst({
        where: { institutionId, staffNumber },
        select: { fullName: true },
      });

      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });
      return reply.send({ valid: true, name: lecturer.fullName });
    },
  );

  app.post<{ Body: LecturerRegistrationBody }>(
    "/register",
    async (request, reply) => {
      const institutionId = request.body.institutionId?.trim();
      const staffNumber = cleanIdentifier(request.body.staffNumber);
      const name = request.body.name?.trim();
      const email = request.body.email;
      const password = request.body.password;
      const normalizedEmail = email?.trim().toLowerCase();
      if (
        !institutionId ||
        !staffNumber ||
        !name ||
        !normalizedEmail ||
        !password
      ) {
        return reply
          .code(400)
          .send({ error: "All registration fields are required" });
      }
      if (password.length < 8)
        return reply
          .code(400)
          .send({ error: "Password must be at least 8 characters" });

      const lecturer = await app.prisma.lecturer.findFirst({
        where: { institutionId, staffNumber },
        select: { id: true, fullName: true, auth: { select: { id: true } } },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });
      if (lecturer.fullName.trim() !== name)
        return reply
          .code(400)
          .send({ error: "Name does not match the lecturer record" });
      if (lecturer.auth)
        return reply
          .code(409)
          .send({ error: "This lecturer account is already registered" });

      try {
        const passwordHash = await hashPassword(password);
        await app.prisma.$transaction(async (transaction) => {
          await transaction.lecturer.update({
            where: { id: lecturer.id },
            data: { email: normalizedEmail, passwordHash },
          });
          await transaction.lecturerAuth.create({
            data: {
              lecturerId: lecturer.id,
              email: normalizedEmail,
              passwordHash,
            },
          });
        });

        return reply.code(201).send({ success: true, userId: lecturer.id });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          return reply
            .code(409)
            .send({ error: "That email address is already in use" });
        }
        throw error;
      }
    },
  );

  app.get<{ Querystring: { institutionId?: string } }>(
    "/",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      const institutionId = request.query.institutionId;
      if (!institutionId)
        return reply.code(400).send({ error: "Institution ID is required" });
      if (
        request.user.role !== "SUPER_ADMIN" &&
        request.user.institutionId !== institutionId
      ) {
        return reply
          .code(403)
          .send({
            error: "You can only view lecturers for your own institution",
          });
      }

      const lecturers = await app.prisma.lecturer.findMany({
        where: { institutionId },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, staffNumber: true },
      });

      return reply.send({
        lecturers: lecturers.map((lecturer) => ({
          id: lecturer.id,
          name: lecturer.fullName,
          staffNumber: lecturer.staffNumber,
        })),
      });
    },
  );

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;
    if (!email || !password)
      return reply.code(400).send({ error: "Email and password are required" });

    const auth = await app.prisma.lecturerAuth.findUnique({
      where: { email },
      include: { lecturer: true },
    });
    if (
      !auth?.passwordHash ||
      !(await verifyPassword(password, auth.passwordHash))
    ) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send({
      userId: auth.lecturer.id,
      name: auth.lecturer.fullName,
      email: auth.email,
      institutionId: auth.lecturer.institutionId,
      staffNumber: auth.lecturer.staffNumber,
      token: await app.jwt.sign({
        id: auth.lecturer.id,
        role: "lecturer",
        institutionId: auth.lecturer.institutionId,
      }),
    });
  });

  app.post<{ Body: BulkCreateBody }>(
    "/",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      const { institutionId, lecturers } = request.body;
      if (!institutionId || !Array.isArray(lecturers)) {
        return reply
          .code(400)
          .send({ error: "Institution ID and lecturers are required" });
      }

      if (
        request.user.role !== "SUPER_ADMIN" &&
        request.user.institutionId !== institutionId
      ) {
        return reply
          .code(403)
          .send({
            error: "You can only save lecturers for your own institution",
          });
      }

      const createdLecturers = [];
      for (const lecturerInput of lecturers) {
        const name = lecturerInput.name?.trim();
        const staffNumber = cleanIdentifier(lecturerInput.staffNumber);
        if (!name || !staffNumber) continue;

        const lecturer = await app.prisma.lecturer.upsert({
          where: { staffNumber },
          update: { fullName: name, institutionId },
          create: {
            fullName: name,
            staffNumber,
            institutionId,
          },
          select: { id: true, fullName: true, staffNumber: true },
        });
        createdLecturers.push(lecturer);
      }

      return reply.send({ lecturers: createdLecturers });
    },
  );

  app.post<{ Body: ImportRequest }>(
    "/import",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      try {
        const institutionId = (request.body as { institutionId?: string })
          .institutionId;
        if (
          request.user.role !== "SUPER_ADMIN" &&
          request.user.institutionId !== institutionId
        ) {
          return reply
            .code(403)
            .send({
              error: "You can only import lecturers for your own institution",
            });
        }

        const result = await importLecturers(request.body);

        if (result.status !== 200) {
          return reply.code(result.status).send(result.body);
        }

        const response = result.body as ImportResponse;
        return reply.send(response);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("fetch")) {
          return reply
            .code(502)
            .send({
              error: `Failed to connect to institution API: ${err.message}`,
            });
        }
        return reply.code(500).send({
          error:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    },
  );
};
