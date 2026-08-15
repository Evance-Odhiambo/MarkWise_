import type { Student } from "@/app/setup/types/student";

interface ImportRequest {
  apiUrl: string;
  apiFormat: string;
  apiKey?: string;
}

interface ImportResponse {
  importedStudents: number;
  data: Student[];
}

interface ApiError {
  error: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ImportRequest = await request.json();
    const { apiUrl, apiFormat, apiKey } = body;

    if (!apiUrl) {
      return jsonError("API URL is required", 400);
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      return jsonError(
        `External API returned status ${response.status}: ${response.statusText}`,
        502
      );
    }

    const rawData = await response.json();
    const students = normalizeApiResponse(rawData, apiFormat);

    const result: ImportResponse = {
      importedStudents: students.length,
      data: students,
    };

    return Response.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("fetch")) {
      return jsonError(`Failed to connect to institution API: ${err.message}`, 502);
    }
    return jsonError(
      err instanceof Error ? err.message : "An unexpected error occurred",
      500
    );
  }
}

function jsonError(message: string, status: number): Response {
  const error: ApiError = { error: message };
  return Response.json(error, { status });
}

function normalizeApiResponse(rawData: unknown, format: string): Student[] {
  if (!rawData) return [];

  const data = rawData as Record<string, unknown>;

  if (data && Array.isArray(data.students)) {
    return (data.students as Array<Record<string, unknown>>).map((student, i) =>
      normalizeStudent(student, i)
    );
  }

  if (data && Array.isArray(data.data)) {
    return normalizeByStructure(data.data, format);
  }

  if (Array.isArray(rawData)) {
    return normalizeByStructure(rawData, format);
  }

  return normalizeFallback(data, format);
}

function normalizeByStructure(arr: unknown[], format: string): Student[] {
  if (arr.length === 0) return [];

  const first = arr[0] as Record<string, unknown>;

  if (first.name || first.admissionNumber) {
    return arr.map((item, i) =>
      normalizeStudent(item as Record<string, unknown>, i)
    );
  }

  return normalizeFallback({ items: arr }, format);
}

function normalizeStudent(raw: Record<string, unknown>, index: number): Student {
  const name = String(raw.name || raw.fullName || raw.studentName || `Student ${index + 1}`);
  const admissionNumber = String(raw.admissionNumber || raw.admNo || raw.studentId || raw.id || `S${index + 1}`);
  const course = String(raw.course || raw.programme || raw.major || raw.courseName || "");

  return {
    id: `imported-student-${index + 1}`,
    name,
    admissionNumber,
    course,
  };
}

function normalizeFallback(data: Record<string, unknown>, _format: string): Student[] {
  console.warn("Unrecognized API format for students, attempting fallback parse:", data);
  return [];
}
