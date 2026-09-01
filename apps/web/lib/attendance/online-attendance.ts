export type OnlineSession = {
  id: string;
  unitCode: string;
  unitName?: string | null;
  expiresAt: string;
  endedAt?: string | null;
  status: string;
  _count?: { records: number };
};

export type TeachingUnit = {
  id: string;
  code: string;
  name: string;
  bleId?: string | null;
  // Courses this unit is offered under. Length 0-1 means no course picker
  // is needed - either a BleMapping-only synthetic unit, or the common case
  // of a unit offered under just one course.
  courses?: Array<{ id: string; name: string }>;
};

// A lecturer's scoping for one unit: null = unrestricted (teaches every
// course this unit is offered under), an array = teaches only those
// course(s)' cohort as their own section.
export type TeachingUnitSelection = {
  unitId: string;
  courseIds: string[] | null;
};

function token() {
  if (typeof window === "undefined") return "";
  try {
    return (
      (JSON.parse(localStorage.getItem("user") ?? "{}") as { token?: string })
        .token ?? ""
    );
  } catch {
    return "";
  }
}

async function request<T>(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`/api/v1/attendance/online${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
        ...(init?.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.error ?? body.message ?? `HTTP ${response.status}`;
      console.error("API Error:", {
        path,
        status: response.status,
        body,
        detail,
        url: `/api/v1/attendance/online${path}`
      });
      throw new Error(`${detail} (${response.status})`);
    }
    return body as T;
  } catch (error) {
    // Handle network errors (backend not running, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("Network Error:", {
        path,
        message: "Cannot connect to backend server",
        detail: error.message,
        url: `/api/v1/attendance/online${path}`
      });
      throw new Error("Cannot connect to backend server. Please check your internet connection.");
    }
    throw error;
  }
}

export function createOnlineSession(unitCode: string) {
  return request<{ success: true; data: OnlineSession }>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      unitCode,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  });
}

export function getLecturerUnits() {
  return fetch("/api/v1/lecturers/units", {
    headers: { Authorization: `Bearer ${token()}` },
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to load teaching units");
    return body as { units: TeachingUnit[] };
  });
}

export function getStudentUnits() {
  return fetch("/api/v1/students/units", {
    headers: { Authorization: `Bearer ${token()}` },
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to load enrolled units");
    return body as { units: TeachingUnit[] };
  });
}

export type StudentUnitCatalog = {
  course: string;
  years: Array<{
    yearNumber: number;
    semester: Array<{
      semesterNumber: number;
      name: string;
      units: TeachingUnit[];
    }>;
  }>;
  enrolledUnitIds: string[];
};

export function getStudentUnitCatalog() {
  return fetch("/api/v1/students/units/catalog", {
    headers: { Authorization: `Bearer ${token()}` },
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to load unit catalog");
    return body as StudentUnitCatalog;
  });
}

export function enrollStudentUnits(unitIds: string[]) {
  return fetch("/api/v1/students/units/enroll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ unitIds }),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to enroll in units");
    return body as { success: true; enrolledUnitIds: string[] };
  });
}

export function unenrollStudentUnit(unitId: string) {
  return fetch(`/api/v1/students/units/${encodeURIComponent(unitId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to unenroll from unit");
    return body as { success: true; unenrolledUnitId: string };
  });
}

export function getLecturerUnitCatalog() {
  return fetch("/api/v1/lecturers/units/catalog", {
    headers: { Authorization: `Bearer ${token()}` },
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to load unit catalog");
    return body as {
      units: TeachingUnit[];
      selectedUnitIds: string[];
      selections: TeachingUnitSelection[];
    };
  });
}

export function saveLecturerUnits(selections: TeachingUnitSelection[]) {
  return fetch("/api/v1/lecturers/units", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ selections }),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(body.error ?? "Unable to save teaching units");
    return body as {
      success: true;
      selectedUnitIds: string[];
      selections: TeachingUnitSelection[];
    };
  });
}

export function getOnlineSession(id: string) {
  return request<{ success: true; data: OnlineSession }>(
    `/sessions/${encodeURIComponent(id)}`,
  );
}

export function getAttendees(id: string) {
  return request<{
    success: true;
    data: Array<{
      id: string;
      studentId: string;
      admissionNumber: string;
      unitCode: string;
      markedAt: string;
    }>;
  }>(`/sessions/${encodeURIComponent(id)}/attendees`);
}

export function endOnlineSession(id: string) {
  return request<{ success: true }>(`/sessions/${encodeURIComponent(id)}/end`, {
    method: "POST",
    body: "{}",
  });
}

export function submitOnlineAttendance(id: string, deviceId: string) {
  return request<{ success: true }>(
    `/sessions/${encodeURIComponent(id)}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    },
  );
}

export function getPasskeyRegistrationOptions() {
  return request<{
    success: true;
    data: PublicKeyCredentialCreationOptionsJSON;
  }>("/passkey/register/options", {
    method: "POST",
    body: "{}",
  });
}

export function verifyPasskeyRegistration(response: unknown) {
  return request<{ success: true }>("/passkey/register/verify", {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export function getPasskeyAttendanceOptions(id: string) {
  return request<
    | { success: true; data: PublicKeyCredentialRequestOptionsJSON }
    | { noCredential: true }
  >(`/sessions/${encodeURIComponent(id)}/passkey/options`, { method: "POST" });
}

export function verifyPasskeyAttendance(id: string, response: unknown) {
  console.log("verifyPasskeyAttendance called:", {
    id,
    response,
    responseType: typeof response,
    responseKeys: response && typeof response === 'object' ? Object.keys(response) : []
  });
  return request<{ success: true }>(
    `/sessions/${encodeURIComponent(id)}/passkey/verify`,
    { method: "POST", body: JSON.stringify({ response }) },
  );
}
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
