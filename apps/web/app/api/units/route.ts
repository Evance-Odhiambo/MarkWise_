import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AcademicUnit } from "@/app/setup/types/academic";

interface UnitCreateRequest {
  semesterId: string;
  units: { name: string; code: string }[];
}

export async function POST(request: Request) {
  try {
    const body: UnitCreateRequest = await request.json();
    const { semesterId, units } = body;

    if (!semesterId || !units || units.length === 0) {
      return NextResponse.json(
        { error: "Semester ID and units are required" },
        { status: 400 }
      );
    }

    const createdUnits = await prisma.$transaction(
      units.map((unit) =>
        prisma.unit.create({
          data: {
            name: unit.name,
            code: unit.code,
            semesterId,
          },
        })
      )
    );

    const formattedUnits: AcademicUnit[] = createdUnits.map((u: { id: string; name: string; code: string; semesterId: string }) => ({
      id: u.id,
      name: u.name,
      code: u.code,
      semesterId: u.semesterId,
    }));

    return NextResponse.json({ units: formattedUnits });
  } catch (err) {
    console.error("Error creating units:", err);
    return NextResponse.json(
      { error: "Failed to create units" },
      { status: 500 }
    );
  }
}
