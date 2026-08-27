export const MAX_ONLINE_SESSION_MINUTES = 60;

export interface CreateOnlineSessionBody {
  unitCode: string;
  expiresAt: string;
}

export interface AttendanceSessionParams {
  sessionId: string;
}

export interface SubmitOnlineAttendanceBody {
  deviceId?: string;
}

export interface WebAuthnResponseBody {
  response?: unknown;
}

export function validateCreateOnlineSession(
  body: Partial<CreateOnlineSessionBody>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!body.unitCode || !body.unitCode.trim()) {
    errors.unitCode = "Unit code is required";
  }

  if (!body.expiresAt || Number.isNaN(new Date(body.expiresAt).getTime())) {
    errors.expiresAt = "A valid expiry time is required";
  }

  return errors;
}

export function normalizeUnitCode(unitCode: string): string {
  return unitCode.trim().toUpperCase().replace(/\s+/g, "");
}
