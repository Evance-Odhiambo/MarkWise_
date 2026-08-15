import type { AcademicCourse, AcademicYear, AcademicSemester } from "@/app/setup/types/academic";

interface ImportRequest {
  apiUrl: string;
  apiFormat: string;
  apiKey?: string;
}

interface ImportResponse {
  importedCourses: number;
  importedUnits: number;
  data: AcademicCourse[];
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
    const courses = normalizeApiResponse(rawData, apiFormat);

    const importedCourses = courses.length;
    const importedUnits = courses.reduce(
      (sum, c) =>
        sum +
        c.years.reduce(
          (sumY, y) =>
            sumY +
            y.semesters.reduce((sumS, s) => sumS + s.units.length, 0),
          0
        ),
      0
    );

    const result: ImportResponse = {
      importedCourses,
      importedUnits,
      data: courses,
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

function normalizeApiResponse(rawData: unknown, format: string): AcademicCourse[] {
  if (!rawData) return [];

  const data = rawData as Record<string, unknown>;

  if (data && Array.isArray(data.courses)) {
    return (data.courses as Array<Record<string, unknown>>).map((course, i) =>
      normalizeCourse(course, i)
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

function normalizeByStructure(arr: unknown[], _format: string): AcademicCourse[] {
  if (arr.length === 0) return [];

  const first = arr[0] as Record<string, unknown>;

  if (first.courseName || first.name) {
    return arr.map((item, i) =>
      normalizeCourse(item as Record<string, unknown>, i)
    );
  }

  return normalizeFallback({ items: arr }, _format);
}

function normalizeCourse(raw: Record<string, unknown>, index: number): AcademicCourse {
  const name = String(raw.courseName || raw.name || raw.title || `Course ${index + 1}`);
  const duration = parseInt(String(raw.duration || raw.years || 1), 10) || 1;
  const description = raw.description ? String(raw.description) : null;

  const courseId = `imported-course-${index + 1}`;

  return {
    id: courseId,
    name,
    duration,
    description,
    years: [],
  };
}

function normalizeFallback(data: Record<string, unknown>, _format: string): AcademicCourse[] {
  console.warn("Unrecognized API format, attempting fallback parse:", data);
  return [];
}
