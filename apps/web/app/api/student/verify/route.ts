import { NextResponse } from "next/server";
import type { VerificationResponse, Institution } from "@/app/types/auth";
import { readFile } from "fs/promises";
import { join } from "path";

const DATA_FILE = join(process.cwd(), "app", "api", "institutions", "data.json");

async function readInstitutions(): Promise<Institution[]> {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

interface VerifyRequest {
  institutionId: string;
  admissionNumber: string;
}

export async function POST(request: Request) {
  try {
    const body: VerifyRequest = await request.json();
    const { institutionId, admissionNumber } = body;

    if (!institutionId || !admissionNumber) {
      return NextResponse.json(
        { error: "Institution ID and admission number are required" },
        { status: 400 }
      );
    }

    const institutions = await readInstitutions();
    const institution = institutions.find((i) => i.id === institutionId);
    if (!institution) {
      return NextResponse.json(
        { error: "Institution not found" },
        { status: 404 }
      );
    }

    try {
      const response = await fetch(
        `${institution.apiUrl}/students?admissionNumber=${encodeURIComponent(admissionNumber)}`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: `Institution API returned ${response.status}` },
          { status: 502 }
        );
      }

      const data = await response.json();

      if (data && data.name && data.course) {
        const result: VerificationResponse = {
          valid: true,
          name: data.name,
          course: data.course,
        };
        return NextResponse.json(result);
      }

      const result: VerificationResponse = { valid: false };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(
        { error: "Failed to connect to institution API" },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
