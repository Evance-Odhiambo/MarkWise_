import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const USERS_FILE = join(process.cwd(), "app", "api", "admin", "users.json");
const INSTITUTIONS_FILE = join(process.cwd(), "app", "api", "institutions", "data.json");

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  institution?: {
    name: string;
    apiUrl?: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
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

async function writeUsers(users: User[]) {
  try {
    await mkdir(join(process.cwd(), "app", "api", "admin"), { recursive: true });
  } catch {
    // Directory might already exist
  }
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

async function readInstitutions(): Promise<Institution[]> {
  try {
    const data = await readFile(INSTITUTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeInstitutions(institutions: Institution[]) {
  try {
    await mkdir(join(process.cwd(), "app", "api", "institutions"), { recursive: true });
  } catch {
    // Directory might already exist
  }
  await writeFile(INSTITUTIONS_FILE, JSON.stringify(institutions, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, email, password, role, institution } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (role !== "system-admin" && role !== "admin") {
      return NextResponse.json(
        { error: "Unsupported role" },
        { status: 400 }
      );
    }

    const users = await readUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users.find((user) => user.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    let institutionId: string | undefined;

    if (institution && (role === "admin" || role === "system-admin")) {
      const institutionName = institution.name?.trim();
      if (!institutionName) {
        return NextResponse.json(
          { error: "Institution name is required" },
          { status: 400 }
        );
      }

      const institutions = await readInstitutions();
      const existingInst = institutions.find(
        (item) => item.name.trim().toLowerCase() === institutionName.toLowerCase()
      );

      if (existingInst) {
        institutionId = existingInst.id;
      } else {
        const newInstitution: Institution = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: institutionName,
          apiUrl: institution.apiUrl || "",
        };
        institutions.push(newInstitution);
        await writeInstitutions(institutions);
        institutionId = newInstitution.id;
      }
    }

    const newUser: User = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      institutionId,
    };

    users.push(newUser);
    await writeUsers(users);

    return NextResponse.json(
      { success: true, userId: newUser.id, institutionId },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
