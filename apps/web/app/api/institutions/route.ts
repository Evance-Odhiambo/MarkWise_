import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

interface InstitutionCreateRequest {
  name: string;
}

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/institutions`);
    const data = await response.json();
    return NextResponse.json(data);
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

    const response = await fetch(`${BACKEND_URL}/api/v1/institutions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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

    const response = await fetch(`${BACKEND_URL}/api/v1/institutions?id=${id}`, {
      method: "DELETE",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("Error deleting institution:", err);
    return NextResponse.json(
      { error: "Failed to delete institution" },
      { status: 500 }
    );
  }
}