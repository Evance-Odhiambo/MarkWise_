import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const USERS_FILE = join(process.cwd(), "app", "api", "users", "users.json");

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId: string;
  admissionNumber?: string;
  course?: string;
}

async function readUsers(): Promise<User[]> {
  try {
    const data = await readFile(USERS_FILE, "utf-8");
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
      (u) => u.email === email && u.role === "student"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Note: In production, verify the password hash here
    return NextResponse.json({
      success: true,
      userId: user.id,
      name: user.name,
      institutionId: user.institutionId,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
