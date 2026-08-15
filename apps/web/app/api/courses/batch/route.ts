import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { AcademicCourse } from "@/app/setup/types/academic";

interface BatchSaveRequest {
  courses: AcademicCourse[];
  institutionId?: string;
}

type CourseWithYears = Prisma.CourseGetPayload<{
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
}>;

function formatCourse(course: CourseWithYears): AcademicCourse {
  return {
    id: course.id,
    name: course.name,
    duration: course.years.length,
    description: null,
    years: course.years.map((y) => ({
      id: y.id,
      yearNumber: y.yearNumber,
      courseId: y.courseId,
      semesters: y.semester.map((s) => ({
        id: s.id,
        name: s.name,
        semesterNum: s.semesterNumber,
        yearId: s.courseYearId,
        units: s.units.map((u) => ({
          id: u.id,
          name: u.name,
          code: u.code,
          semesterId: u.semesterId,
        })),
      })),
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body: BatchSaveRequest = await request.json();
    const { courses, institutionId } = body;

    if (!courses || courses.length === 0) {
      return NextResponse.json(
        { error: "Courses data is required" },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
      const savedCourses: CourseWithYears[] = [];

      for (const course of courses) {
        const savedCourse = await tx.course.upsert({
          where: { id: course.id.startsWith("imported-") ? `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : course.id },
          update: {
            name: course.name,
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
            name: course.name,
            institutionId: institutionId || "",
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
        savedCourses.push(savedCourse);
      }

      return savedCourses.map(formatCourse);
    });

    return NextResponse.json({ courses: results });
  } catch (err) {
    console.error("Error batch saving courses:", err);
    return NextResponse.json(
      { error: "Failed to save courses" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.unit.deleteMany({});
    await prisma.semester.deleteMany({});
    await prisma.courseYear.deleteMany({});
    await prisma.course.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error clearing courses:", err);
    return NextResponse.json({ error: "Failed to clear courses" }, { status: 500 });
  }
}
