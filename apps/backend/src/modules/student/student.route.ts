import type { FastifyPluginAsync } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { importStudents, type ImportRequest } from "./student.import.js";

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

export const studentRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrismaClient();

  await prisma.$connect();

  app.get(
    "/",
    async (_request, reply) => {
      try {
        const students = await prisma.student.findMany({
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
        app.log.error("Error fetching students:", err);
        return reply.code(500).send({ error: "Failed to fetch students" });
      }
    }
  );

  app.post<{ Body: StudentCreateBody }>(
    "/",
    async (request, reply) => {
      try {
        const { name, admissionNumber, courseId, institutionId, email, year } = request.body;

        const student = await prisma.student.create({
          data: {
            name,
            admissionNumber,
            email: email || `${admissionNumber}@institution.edu`,
            course: { connect: { id: courseId } },
            institution: { connect: { id: institutionId } },
            year: year || 1,
          },
        });

        return reply.code(201).send(student);
      } catch (err) {
        app.log.error("Error creating student:", err);
        return reply.code(500).send({ error: "Failed to create student" });
      }
    }
  );

  app.post<{ Body: BulkCreateBody }>(
    "/import",
    async (request, reply) => {
      try {
        const { students, institutionId } = request.body;

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
              email: `${student.admissionNumber}@institution.edu`,
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
        app.log.error("Error saving students:", err);
        return reply.code(500).send({ error: "Failed to save students" });
      }
    }
  );
};