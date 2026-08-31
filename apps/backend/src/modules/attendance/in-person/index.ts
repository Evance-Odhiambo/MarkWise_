export type InPersonMethod = "qr" | "ble" | "pin";
export type VerificationStatus = "verified" | "duplicate" | "rejected";

export interface CreateInPersonSessionBody {
  unitCode: string;
  expiresAt: string;
  /**
   * Optional client-generated session identity. When a lecturer device starts
   * a session with no connectivity, it generates this identity locally so it
   * can begin broadcasting QR/PIN/BLE immediately, then "claims" it here once
   * connectivity returns. Claiming is idempotent (same id -> same session),
   * so every attendance record already queued against that id becomes valid
   * the moment the claim succeeds, with no per-record reconciliation needed.
   * All four fields must be present together or all omitted.
   */
  id?: string;
  sessionNonce?: number;
  sessionSecret?: string;
  sessionStart?: number;
  /**
   * The bleUnitId the client already committed to broadcasting/caching
   * locally, if any. When claiming, this must be honored verbatim rather
   * than re-resolved from the Unit/BleMapping tables — already-emitted BLE
   * beacons and already-cached manifests on student devices are keyed to
   * whatever value the lecturer device actually broadcast with.
   */
  bleUnitId?: number | null;
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
