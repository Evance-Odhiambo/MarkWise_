import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Institution } from "@/app/types/auth";

interface InstitutionCreateRequest {
  name: string;
}

export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { createdAt: "desc" },
    });

    const formatted: Institution[] = institutions.map((inst) => {
      let apiUrl: string | undefined;
      if (inst.metadata && typeof inst.metadata === "object") {
        apiUrl = (inst.metadata as Record<string, unknown>).apiUrl as string | undefined;
      }
      return {
        id: inst.id,
        name: inst.name,
        apiUrl,
      };
    });

    return NextResponse.json({ institutions: formatted });
  } catch (err) {
    console.error("Error fetching institutions:", err);
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: InstitutionCreateRequest = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Institution name is required" },
        { status: 400 }
      );
    }

    const institution = await prisma.institution.create({
      data: {
        name,
      },
    });

    return NextResponse.json({ institution });
  } catch (err) {
    console.error("Error creating institution:", err);
    return NextResponse.json(
      { error: "Failed to create institution" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    await prisma.institution.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting institution:", err);
    return NextResponse.json(
      { error: "Failed to delete institution" },
      { status: 500 }
    );
  }
}
