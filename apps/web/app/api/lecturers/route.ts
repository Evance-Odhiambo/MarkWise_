import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Lecturer } from "@/app/setup/types/lecturer";

interface LecturerSaveRequest {
  lecturers: {
    name: string;
    staffNumber: string;
    institutionId: string;
  }[];
}

export async function POST(request: Request) {
  try {
    const body: LecturerSaveRequest = await request.json();
    const { lecturers } = body;

    if (!lecturers || lecturers.length === 0) {
      return NextResponse.json(
        { error: "Lecturers data is required" },
        { status: 400 }
      );
    }

    const createdLecturers = await prisma.$transaction(
      lecturers.map((lecturer) =>
        prisma.lecturer.create({
          data: {
            fullName: lecturer.name,
            staffNumber: lecturer.staffNumber,
            email: `${lecturer.staffNumber}@institution.edu`,
            passwordHash: "",
            institution: {
              connect: { id: lecturer.institutionId },
            },
          },
        })
      )
    );

    return NextResponse.json({
      importedLecturers: createdLecturers.length,
      data: createdLecturers,
    });
  } catch (err) {
    console.error("Error saving lecturers:", err);
    return NextResponse.json(
      { error: "Failed to save lecturers" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const lecturers = await prisma.lecturer.findMany({
      include: {
        institution: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ lecturers });
  } catch (err) {
    console.error("Error fetching lecturers:", err);
    return NextResponse.json(
      { error: "Failed to fetch lecturers" },
      { status: 500 }
    );
  }
}
