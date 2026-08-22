import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

export interface AcademicCourse {
  id: string;
  name: string;
  duration: number;
  years: AcademicYear[];
}

export interface AcademicYear {
  id: string;
  yearNumber: number;
  yearId: string;
  semesters: AcademicSemester[];
}

export interface AcademicSemester {
  id: string;
  name: string;
  semesterNum: number;
  units: AcademicUnit[];
}

export interface AcademicUnit {
  id: string;
  name: string;
  code: string;
  semesterId: string;
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

export async function batchUpsertCourses(
  body: { courses: AcademicCourse[]; institutionId: string }
): Promise<{ courses: AcademicCourse[] }> {
  const { courses, institutionId } = body;

  if (!courses || courses.length === 0) {
    throw new Error("Courses data is required");
  }

  if (!institutionId) {
    throw new Error("Institution ID is required");
  }

  const prisma = getPrismaClient();

  try {
    const results = await prisma.$transaction(async (tx) => {
      const savedCourses: AcademicCourse[] = [];

      for (const course of courses) {
        const savedCourse = await tx.course.upsert({
          where: { id: course.id },
          update: {
            name: course.name,
            institutionId,
            years: {
              deleteMany: {},
              create: course.years.map((y) => ({
                yearNumber: y.yearNumber,
                semester: {
                  create: y.semesters.map((s) => ({
                    name: s.name,
                    semesterNumber: s.semesterNum,
                    units: {
                      create: s.units.map((u) => ({
                        name: u.name,
                        code: u.code,
                      })),
                    },
                  })),
                },
              })),
            },
          },
          create: {
            id: course.id,
            name: course.name,
            institutionId,
            years: {
              create: course.years.map((y) => ({
                yearNumber: y.yearNumber,
                semester: {
                  create: y.semesters.map((s) => ({
                    name: s.name,
                    semesterNumber: s.semesterNum,
                    units: {
                      create: s.units.map((u) => ({
                        name: u.name,
                        code: u.code,
                      })),
                    },
                  })),
                },
              })),
            },
          },
          include: {
            years: {
              include: {
                semester: {
                  include: {
                    units: true,
                  },
                },
              },
            },
          },
        });

        const formattedCourse: AcademicCourse = {
          id: savedCourse.id,
          name: savedCourse.name,
          duration: savedCourse.years.length,
          years: savedCourse.years.map((y) => ({
            id: y.id,
            yearNumber: y.yearNumber,
            yearId: y.courseYearId,
            semesters: y.semester.map((s) => ({
              id: s.id,
              name: s.name,
              semesterNum: s.semesterNumber,
              units: s.units.map((u) => ({
                id: u.id,
                name: u.name,
                code: u.code,
                semesterId: u.semesterId,
              })),
            })),
          })),
        };

        savedCourses.push(formattedCourse);
      }

      return savedCourses;
    });

    return { courses: results };
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteCoursesByInstitution(
  institutionId: string
): Promise<{ success: true; deleted: number }> {
  const prisma = getPrismaClient();

  try {
    const courses = await prisma.course.findMany({
      where: { institutionId },
      select: { id: true },
    });

    const courseIds = courses.map((course) => course.id);

    if (courseIds.length === 0) {
      return { success: true, deleted: 0 };
    }

    await prisma.unit.deleteMany({
      where: { semester: { courseYear: { course: { id: { in: courseIds } } } } },
    });
    await prisma.semester.deleteMany({
      where: { courseYear: { course: { id: { in: courseIds } } } },
    });
    await prisma.courseYear.deleteMany({
      where: { course: { id: { in: courseIds } } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: courseIds } },
    });

    return { success: true, deleted: courseIds.length };
  } finally {
    await prisma.$disconnect();
  }
}