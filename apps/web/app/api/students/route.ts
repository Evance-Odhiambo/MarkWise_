import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Student } from "@/app/setup/types/student";

interface StudentSaveRequest {
  students: {
    name: string;
    admissionNumber: string;
    course: string;
    institutionId: string;
  }[];
  institutionId?: string;
}

export async function POST(request: Request) {
  try {
    const body: StudentSaveRequest = await request.json();
    const { students, institutionId } = body;

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "Students data is required" },
        { status: 400 }
      );
    }

    const createdStudents = await prisma.$transaction(async (tx) => {
      const savedStudents = [];

      for (const student of students) {
        const course = await tx.course.findFirst({
          where: {
            name: student.course,
            institutionId: institutionId,
          },
        });

        if (!course) {
          throw new Error(`Course "${student.course}" not found`);
        }

        const savedStudent = await tx.student.create({
          data: {
            name: student.name,
            admissionNumber: student.admissionNumber,
            email: `${student.admissionNumber}@institution.edu`,
            course: {
              connect: { id: course.id },
            },
            institution: {
              connect: { id: institutionId },
            },
            year: 1,
          },
        });
        savedStudents.push(savedStudent);
      }

      return savedStudents;
    });

    return NextResponse.json({
      importedStudents: createdStudents.length,
      data: createdStudents,
    });
  } catch (err) {
    console.error("Error saving students:", err);
    return NextResponse.json(
      { error: "Failed to save students" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        institution: {
          select: { name: true },
        },
        course: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (err) {
    console.error("Error fetching students:", err);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
