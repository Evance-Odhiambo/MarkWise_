import type { Lecturer } from "@/app/setup/types/lecturer";

interface ImportRequest {
  apiUrl: string;
  apiFormat: string;
  apiKey?: string;
}

interface ImportResponse {
  importedLecturers: number;
  data: Lecturer[];
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
    const lecturers = normalizeApiResponse(rawData, apiFormat);

    const result: ImportResponse = {
      importedLecturers: lecturers.length,
      data: lecturers,
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

function normalizeApiResponse(rawData: unknown, format: string): Lecturer[] {
  if (!rawData) return [];

  const data = rawData as Record<string, unknown>;

  if (data && Array.isArray(data.lecturers)) {
    return (data.lecturers as Array<Record<string, unknown>>).map((lecturer, i) =>
      normalizeLecturer(lecturer, i)
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

function normalizeByStructure(arr: unknown[], format: string): Lecturer[] {
  if (arr.length === 0) return [];

  const first = arr[0] as Record<string, unknown>;

  if (first.name || first.staffNumber) {
    return arr.map((item, i) =>
      normalizeLecturer(item as Record<string, unknown>, i)
    );
  }

  return normalizeFallback({ items: arr }, format);
}

function normalizeLecturer(raw: Record<string, unknown>, index: number): Lecturer {
  const name = String(raw.name || raw.fullName || raw.lecturerName || raw.displayName || `Lecturer ${index + 1}`);
  const staffNumber = String(raw.staffNumber || raw.staffId || raw.employeeId || raw.id || `L${index + 1}`);

  return {
    id: `imported-lecturer-${index + 1}`,
    name,
    staffNumber,
  };
}

function normalizeFallback(data: Record<string, unknown>, _format: string): Lecturer[] {
  console.warn("Unrecognized API format for lecturers, attempting fallback parse:", data);
  return [];
}
