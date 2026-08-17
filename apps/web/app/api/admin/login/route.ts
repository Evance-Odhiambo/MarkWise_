import { NextResponse } from "next/server";
import { readFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";

const USERS_FILE = join(process.cwd(), "app", "api", "admin", "users.json");
const INSTITUTIONS_FILE = join(process.cwd(), "app", "api", "institutions", "data.json");

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  institutionId?: string;
}

interface Institution {
  id: string;
  name: string;
  apiUrl?: string;
}

async function readUsers(): Promise<User[]> {
  try {
    const data = await readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function readInstitutions(): Promise<Institution[]> {
  try {
    const data = await readFile(INSTITUTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const users = await readUsers();
    const user = users.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.role === "system-admin"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const institutions = await readInstitutions();
    const institution = institutions.find((item) => item.id === user.institutionId);

    return NextResponse.json({
      success: true,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      institutionName: institution?.name ?? null,
    });
  } catch (error) {
    console.error("System admin login failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
