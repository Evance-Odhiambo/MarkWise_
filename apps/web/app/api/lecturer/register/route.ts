import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const USERS_FILE = join(process.cwd(), "app", "api", "users", "users.json");

interface RegisterRequest {
  institutionId: string;
  staffNumber: string;
  name: string;
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId: string;
  staffNumber?: string;
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

async function writeUsers(users: User[]) {
  await mkdir(join(process.cwd(), "app", "api", "users"), { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    const { institutionId, staffNumber, name, email, password } = body;

    if (!institutionId || !staffNumber || !name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const users = await readUsers();
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const existingLecturer = users.find(
      (u) => u.institutionId === institutionId && u.staffNumber === staffNumber
    );
    if (existingLecturer) {
      return NextResponse.json(
        { error: "This lecturer account already exists. Please sign in." },
        { status: 409 }
      );
    }

    const newUser: User = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      role: "lecturer",
      institutionId,
      staffNumber,
    };

    users.push(newUser);
    await writeUsers(users);

    return NextResponse.json(
      { success: true, userId: newUser.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
