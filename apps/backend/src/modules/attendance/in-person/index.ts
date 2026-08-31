export type InPersonMethod = "qr" | "ble" | "pin";
export type VerificationStatus = "verified" | "duplicate" | "rejected";

export interface CreateInPersonSessionBody {
  unitCode: string;
  expiresAt: string;
}

export interface SubmitInPersonAttendanceBody {
  sessionId: string;
  unitCode: string;
  sessionStart: string | number;
  scannedAt: string | number;
  method: InPersonMethod;
  deviceId?: string;
  rawPayload: string;
}

export interface LecturerAssistedMarkBody {
  sessionId: string;
  studentId: string;
  rawPayload: string;
  scannedAt: string | number;
  deviceId?: string;
}
