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

    if (!institutionId) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      return NextResponse.json(
        { error: "Institution not found" },
        { status: 404 }
      );
    }

    const results = await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
      const savedCourses: CourseWithYears[] = [];

      for (const course of courses) {
        const savedCourse = await tx.course.upsert({
          where: { id: course.id },
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institutionId");

    if (!institutionId) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    const courses = await prisma.course.findMany({
      where: { institutionId },
      select: { id: true },
    });

    const courseIds = courses.map((course) => course.id);

    if (courseIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
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

    return NextResponse.json({ success: true, deleted: courseIds.length });
  } catch (err) {
    console.error("Error clearing courses:", err);
    return NextResponse.json({ error: "Failed to clear courses" }, { status: 500 });
  }
}
