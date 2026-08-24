export interface ImportRequest {
  apiUrl: string;
  apiFormat?: string;
  apiKey?: string;
}

export interface ImportResponse {
  importedLecturers: number;
  data: Array<{
    name: string;
    staffNumber: string;
    email?: string;
  }>;
}

export interface ApiError {
  error: string;
}

function readList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.lecturers)) return record.lecturers;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.results)) return record.results;
  }
  return [];
}

export async function importLecturers(
  request: ImportRequest
): Promise<{ status: number; body: ImportResponse | ApiError }> {
  if (!request.apiUrl) {
    return { status: 400, body: { error: "API URL is required" } };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`;

  const response = await fetch(request.apiUrl, { headers });
  if (!response.ok) {
    return {
      status: response.status,
      body: { error: `Institution API returned ${response.status}` },
    };
  }

  const payload = await response.json() as unknown;
  const data = readList(payload).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const lecturer = item as Record<string, unknown>;
    const name = lecturer.name ?? lecturer.fullName ?? lecturer.full_name;
    const staffNumber = lecturer.staffNumber ?? lecturer.staff_number ?? lecturer.staffId;
    if (typeof name !== "string" || typeof staffNumber !== "string") return [];

    const email = lecturer.email;
    return [{
      name,
      staffNumber,
      ...(typeof email === "string" ? { email } : {}),
    }];
  });

  return {
    status: 200,
    body: { importedLecturers: data.length, data },
  };
}
