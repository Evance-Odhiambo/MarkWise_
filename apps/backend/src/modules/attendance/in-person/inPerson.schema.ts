import type {
  CreateInPersonSessionBody,
  SubmitInPersonAttendanceBody,
} from "./inPerson.types.js";

export const MAX_IN_PERSON_SESSION_MINUTES = 60;

export function validateCreateInPersonSession(
  body: Partial<CreateInPersonSessionBody>,
) {
  const errors: Record<string, string> = {};
  if (!body.unitCode?.trim()) errors.unitCode = "Unit code is required";
  if (!body.expiresAt || Number.isNaN(new Date(body.expiresAt).getTime()))
    errors.expiresAt = "A valid expiry time is required";
  return errors;
}

export function validateSubmitInPersonAttendance(
  body: Partial<SubmitInPersonAttendanceBody>,
) {
  const errors: Record<string, string> = {};
  if (!body.sessionId?.trim()) errors.sessionId = "Session ID is required";
  if (!body.unitCode?.trim()) errors.unitCode = "Unit code is required";
  if (!body.rawPayload?.trim()) errors.rawPayload = "Raw payload is required";
  if (!["qr", "ble", "pin"].includes(body.method || ""))
    errors.method = "Unsupported attendance method";
  if (!body.scannedAt || Number.isNaN(new Date(body.scannedAt).getTime()))
    errors.scannedAt = "A valid scan time is required";
  return errors;
}

export function validateLecturerAssistedMark(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  if (typeof body.sessionId !== "string" || !body.sessionId.trim())
    errors.sessionId = "Session ID is required";
  if (typeof body.studentId !== "string" || !body.studentId.trim())
    errors.studentId = "Student ID is required";
  if (typeof body.rawPayload !== "string" || !body.rawPayload.trim())
    errors.rawPayload = "Signed attendance proof is required";
  if (
    !body.scannedAt ||
    Number.isNaN(new Date(body.scannedAt as string | number).getTime())
  )
    errors.scannedAt = "A valid scan time is required";
  return errors;
}

export const normalizeUnitCode = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
