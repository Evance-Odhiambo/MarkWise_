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
  const response = await fetch(`/api/v1/attendance/delegations${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export type Delegation = {
  id: string;
  unitCode: string;
  unitName: string | null;
  validFrom: number;
  validUntil: number;
  startedAt: number | null;
  endedAt: number | null;
  used: boolean;
  leaderStudentId: string | null;
  leaderStudentName: string | null;
  createdBy: string;
  lecturerName: string | null;
};

export function createDelegation(studentId: string, unitCode: string) {
  return request<{
    success: true;
    data: {
      id: string;
      unitCode: string;
      unitName: string;
      studentName: string;
      validUntil: number;
    };
  }>("/", {
    method: "POST",
    body: JSON.stringify({ studentId, unitCode }),
  });
}

export function getDelegations() {
  return request<{ delegations: Delegation[] }>("/");
}

export function acceptDelegation(id: string, grantToken: string) {
  return request<{
    success: true;
    data: {
      id: string;
      unitCode: string;
      unitName: string;
      validUntil: number;
      grantToken: string;
      session: {
        id: string;
        unitCode: string;
        sessionStart: number;
        expiresAt: number;
        sessionNonce: number;
        bleUnitId: number | null;
        sessionSecret: string | null;
        status: "active";
      };
    };
  }>(`/${encodeURIComponent(id)}/accept`, {
    method: "POST",
    body: JSON.stringify({ grantToken }),
  });
}

export function revokeDelegation(id: string) {
  return request<{ success: true }>(`/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
  });
}
