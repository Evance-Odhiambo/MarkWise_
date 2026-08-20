import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ONBOARDING_FILE = join(process.cwd(), "app", "api", "admin", "onboarding-requests.json");

interface RegisterRequest {
  name: string;
  email: string;
  institution?: {
    name: string;
  };
}

interface OnboardingRequest {
  id: string;
  name: string;
  email: string;
  institutionName: string;
  status: "PENDING";
  createdAt: string;
}

async function readOnboardingRequests(): Promise<OnboardingRequest[]> {
  try {
    const data = await readFile(ONBOARDING_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeOnboardingRequests(requests: OnboardingRequest[]) {
  await mkdir(join(process.cwd(), "app", "api", "admin"), { recursive: true });
  await writeFile(ONBOARDING_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, email, institution } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const institutionName = institution?.name?.trim();
    if (!institutionName) {
      return NextResponse.json(
        { error: "Institution name is required" },
        { status: 400 }
      );
    }

    const requests = await readOnboardingRequests();
    const duplicateRequest = requests.find(
      (request) => request.email === email.trim().toLowerCase() && request.status === "PENDING"
    );

    if (duplicateRequest) {
      return NextResponse.json(
        { error: "An onboarding request for this email is already pending" },
        { status: 409 }
      );
    }

    const onboardingRequest: OnboardingRequest = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      institutionName,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    requests.push(onboardingRequest);
    await writeOnboardingRequests(requests);

    return NextResponse.json(
      { success: true, requestId: onboardingRequest.id, status: onboardingRequest.status },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
