import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { AcademicCourse } from "@/app/setup/types/academic";

type CourseWithYears = Prisma.CourseGetPayload<{
  include: {
    years: {
      include: {
        semester: {
          include: {
            units: true;
          };
        };
      };
    };
  };
}>;

type CourseYearWithSemesters = Prisma.CourseYearGetPayload<{
  include: {
    semester: {
      include: {
        units: true;
      };
    };
  };
}>;

type SemesterWithUnits = Prisma.SemesterGetPayload<{
  include: {
    units: true;
  };
}>;

function formatCourse(course: CourseWithYears): AcademicCourse {
  return {
    id: course.id,
    name: course.name,
    duration: course.years.length,
    description: null,
    years: course.years.map((y: CourseYearWithSemesters) => ({
      id: y.id,
      yearNumber: y.yearNumber,
      courseId: y.courseId,
      semesters: y.semester.map((s: SemesterWithUnits) => ({
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

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Error fetching courses:", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, duration, institutionId } = body;

    if (!name || !institutionId) {
      return NextResponse.json(
        { error: "Name and institution ID are required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        name,
        institutionId,
        years: {
          create: Array.from({ length: duration || 1 }, (_, i) => ({
            yearNumber: i + 1,
            semester: {
              create: [
                { name: "Semester 1", semesterNumber: 1 },
                { name: "Semester 2", semesterNumber: 2 },
              ],
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

    const formattedCourse = formatCourse(course);

    return NextResponse.json({ course: formattedCourse });
  } catch (err) {
    console.error("Error creating course:", err);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
