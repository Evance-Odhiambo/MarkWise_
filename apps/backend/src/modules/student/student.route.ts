import type { FastifyPluginAsync } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { hashPassword, verifyPassword } from "../admin/admin.service.js";
import { requireAttendanceRole, requireRoles, requireSuperAdmin } from "../../plugins/index.js";

interface LoginBody {
  email: string;
  password: string;
}

interface StudentVerificationBody {
  institutionId: string;
  admissionNumber: string;
}

interface StudentRegistrationBody extends StudentVerificationBody {
  name: string;
  course: string;
  email: string;
  password: string;
}

function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 10,
  });

  return new PrismaClient({ adapter });
}

interface StudentCreateBody {
  name: string;
  admissionNumber: string;
  courseId: string;
  institutionId: string;
  email?: string;
  year?: number;
}

interface StudentListResponse {
  students: Array<{
    id: string;
    name: string;
    admissionNumber: string;
    email: string | null;
    year: number;
    institution: { name: string };
    course: { name: string };
    createdAt: Date;
  }>;
}

interface BulkCreateBody {
  students: Array<{
    name: string;
    admissionNumber: string;
    course: string;
    institutionId: string;
  }>;
  institutionId?: string;
}

interface BulkCreateResponse {
  importedStudents: number;
  data: Array<{
    id: string;
    name: string;
    admissionNumber: string;
  }>;
}

interface UnitEnrollmentBody {
  unitIds: string[];
}

export const studentRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrismaClient();

  await prisma.$connect();

  app.get(
    "/me",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const student = await prisma.student.findUnique({
        where: { id: request.user.id },
        include: { course: { select: { name: true } } },
      });
      if (!student) return reply.code(404).send({ error: "Student record not found" });

      return reply.send({
        userId: student.id,
        name: student.name,
        institutionId: student.institutionId,
        admissionNumber: student.admissionNumber,
        course: student.course.name,
      });
    },
  );

  app.get(
    "/units",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: request.user.id },
        orderBy: { unit: { code: "asc" } },
        select: { unit: { select: { id: true, code: true, name: true } } },
      });
      return reply.send({ units: enrollments.map(({ unit }) => unit) });
    },
  );

  app.get(
    "/units/catalog",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const student = await prisma.student.findUnique({ where: { id: request.user.id }, select: { courseId: true } });
      if (!student) return reply.code(404).send({ error: "Student record not found" });

      const course = await prisma.course.findUnique({
        where: { id: student.courseId },
        select: {
          name: true,
          years: {
            orderBy: { yearNumber: "asc" },
            select: {
              yearNumber: true,
              semester: {
                orderBy: { semesterNumber: "asc" },
                select: { semesterNumber: true, name: true, units: { orderBy: { code: "asc" }, select: { id: true, code: true, name: true } } },
              },
            },
          },
        },
      });
      if (!course) return reply.code(404).send({ error: "Course not found" });

      const enrolled = await prisma.enrollment.findMany({ where: { studentId: request.user.id }, select: { unitId: true } });
      return reply.send({ course: course.name, years: course.years, enrolledUnitIds: enrolled.map(({ unitId }) => unitId) });
    },
  );

  app.post<{ Body: UnitEnrollmentBody }>(
    "/units/enroll",
    { preHandler: requireAttendanceRole("student") },
    async (request, reply) => {
      const unitIds = Array.isArray(request.body.unitIds) ? [...new Set(request.body.unitIds.filter((id): id is string => typeof id === "string"))] : null;
      if (!unitIds || unitIds.length === 0) return reply.code(400).send({ error: "Select at least one unit" });

      const student = await prisma.student.findUnique({ where: { id: request.user.id }, select: { courseId: true } });
      if (!student) return reply.code(404).send({ error: "Student record not found" });
      const validUnits = await prisma.unit.findMany({ where: { id: { in: unitIds }, semester: { courseYear: { courseId: student.courseId } } }, select: { id: true } });
      if (validUnits.length !== unitIds.length) return reply.code(400).send({ error: "One or more units are not available on your course" });

      await prisma.enrollment.createMany({ data: unitIds.map((unitId) => ({ studentId: request.user.id, unitId })), skipDuplicates: true });
      return reply.send({ success: true, enrolledUnitIds: unitIds });
    },
  );

  app.post<{ Body: StudentVerificationBody }>("/verify", async (request, reply) => {
    const institutionId = request.body.institutionId?.trim();
    const admissionNumber = request.body.admissionNumber?.trim();
    if (!institutionId || !admissionNumber) {
      return reply.code(400).send({ error: "Institution ID and admission number are required" });
    }

    const student = await prisma.student.findFirst({
      where: { institutionId, admissionNumber },
      include: { course: { select: { name: true } } },
    });

    if (!student) return reply.code(404).send({ error: "Student record not found" });

    return reply.send({ valid: true, name: student.name, course: student.course.name });
  });

  app.post<{ Body: StudentRegistrationBody }>("/register", async (request, reply) => {
    const { institutionId, admissionNumber, name, course, email, password } = request.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!institutionId || !admissionNumber || !name || !course || !normalizedEmail || !password) {
      return reply.code(400).send({ error: "All registration fields are required" });
    }
    if (password.length < 8) return reply.code(400).send({ error: "Password must be at least 8 characters" });

    const student = await prisma.student.findFirst({
      where: { institutionId, admissionNumber },
      include: { course: { select: { name: true } }, auth: true },
    });
    if (!student) return reply.code(404).send({ error: "Student record not found" });
    if (student.course.name !== course) return reply.code(400).send({ error: "Course does not match the student record" });
    if (student.auth) return reply.code(409).send({ error: "This student account is already registered" });

    try {
      const registeredStudent = await prisma.$transaction(async (transaction) => {
        const updatedStudent = await transaction.student.update({
          where: { id: student.id },
          data: { email: normalizedEmail },
          select: { id: true },
        });
        await transaction.studentAuth.create({
          data: { studentId: updatedStudent.id, email: normalizedEmail, passwordHash: await hashPassword(password) },
        });
        return updatedStudent;
      });

      return reply.code(201).send({ success: true, userId: registeredStudent.id });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return reply.code(409).send({ error: "That email address is already in use" });
      }
      throw error;
    }
  });

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;
    if (!email || !password) return reply.code(400).send({ error: "Email and password are required" });

    const auth = await prisma.studentAuth.findUnique({
      where: { email },
      include: { student: { include: { course: { select: { name: true } } } } },
    });
    if (!auth || !(await verifyPassword(password, auth.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send({
      userId: auth.student.id,
      name: auth.student.name,
      institutionId: auth.student.institutionId,
      admissionNumber: auth.student.admissionNumber,
      course: auth.student.course.name,
      token: await app.jwt.sign({ id: auth.student.id, role: "student", institutionId: auth.student.institutionId }),
    });
  });

  app.get<{ Querystring: { institutionId?: string } }>(
    "/",
    { preHandler: requireRoles('SUPER_ADMIN', 'INSTITUTION_ADMIN') },
    async (_request, reply) => {
      try {
        const institutionId = _request.query.institutionId;
        if (!institutionId) return reply.code(400).send({ error: "Institution ID is required" });
        if (_request.user.role !== 'SUPER_ADMIN' && _request.user.institutionId !== institutionId) {
          return reply.code(403).send({ error: "You can only view students for your own institution" });
        }

        const students = await prisma.student.findMany({
          where: { institutionId },
          include: {
            institution: { select: { name: true } },
            course: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const response: StudentListResponse = {
          students: students.map((s) => ({
            id: s.id,
            name: s.name,
            admissionNumber: s.admissionNumber,
            email: s.email,
            year: s.year,
            institution: { name: s.institution.name },
            course: { name: s.course.name },
            createdAt: s.createdAt,
          })),
        };

        return reply.send(response);
      } catch (err) {
        app.log.error({ err }, "Error fetching students");
        return reply.code(500).send({ error: "Failed to fetch students" });
      }
    }
  );

  app.post<{ Body: StudentCreateBody }>(
    "/",
    { preHandler: requireRoles('SUPER_ADMIN', 'INSTITUTION_ADMIN') },
    async (request, reply) => {
      try {
        const body = request.body as StudentCreateBody & BulkCreateBody;
        if (Array.isArray(body.students)) {
          if (!body.institutionId) return reply.code(400).send({ error: "Institution ID is required" });
          if (request.user.role !== 'SUPER_ADMIN' && request.user.institutionId !== body.institutionId) {
            return reply.code(403).send({ error: "You can only save students for your own institution" });
          }

          const createdStudents = [];
          for (const studentInput of body.students) {
            const course = await prisma.course.findFirst({ where: { name: studentInput.course, institutionId: body.institutionId } });
            if (!course) return reply.code(400).send({ error: `Course "${studentInput.course}" not found` });
            const student = await prisma.student.upsert({
              where: { admissionNumber: studentInput.admissionNumber },
              update: { name: studentInput.name, courseId: course.id, institutionId: body.institutionId, year: 1 },
              create: { name: studentInput.name, admissionNumber: studentInput.admissionNumber, courseId: course.id, institutionId: body.institutionId, year: 1 },
              select: { id: true, name: true, admissionNumber: true },
            });
            createdStudents.push(student);
          }
          return reply.code(201).send({ importedStudents: createdStudents.length, data: createdStudents });
        }

        const { name, admissionNumber, courseId, institutionId, year } = request.body;
        if (!name || !admissionNumber || !courseId || !institutionId) return reply.code(400).send({ error: "Student fields are required" });
        if (request.user.role !== 'SUPER_ADMIN' && request.user.institutionId !== institutionId) {
          return reply.code(403).send({ error: "You can only save students for your own institution" });
        }

        const student = await prisma.student.create({
          data: {
            name,
            admissionNumber,
            course: { connect: { id: courseId } },
            institution: { connect: { id: institutionId } },
            year: year || 1,
          },
        });

        return reply.code(201).send(student);
      } catch (err) {
        app.log.error({ err }, "Error creating student");
        return reply.code(500).send({ error: "Failed to create student" });
      }
    }
  );

  app.post<{ Body: BulkCreateBody }>(
    "/import",
    { preHandler: requireRoles('SUPER_ADMIN', 'INSTITUTION_ADMIN') },
    async (request, reply) => {
      try {
        const { students, institutionId } = request.body;

        if (request.user.role !== 'SUPER_ADMIN' && request.user.institutionId !== institutionId) {
          return reply.code(403).send({ error: "You can only import students for your own institution" });
        }

        if (!students || students.length === 0) {
          return reply.code(400).send({ error: "Students data is required" });
        }

        const createdStudents = [];
        for (const student of students) {
          const course = await prisma.course.findFirst({
            where: {
              name: student.course,
              institutionId: institutionId,
            },
          });

          if (!course) {
            throw new Error(`Course "${student.course}" not found`);
          }

          const savedStudent = await prisma.student.create({
            data: {
              name: student.name,
              admissionNumber: student.admissionNumber,
              course: { connect: { id: course.id } },
              institution: { connect: { id: institutionId } },
              year: 1,
            },
          });

          createdStudents.push({ id: savedStudent.id, name: savedStudent.name, admissionNumber: savedStudent.admissionNumber });
        }

        const response: BulkCreateResponse = {
          importedStudents: createdStudents.length,
          data: createdStudents,
        };

        return reply.send(response);
      } catch (err) {
        app.log.error({ err }, "Error saving students");
        return reply.code(500).send({ error: "Failed to save students" });
      }
    }
  );
};
