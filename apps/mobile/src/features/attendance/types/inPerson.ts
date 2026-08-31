export type InPersonMethod = 'qr' | 'ble' | 'pin';
export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'duplicate';

export interface InPersonSession {
  id: string;
  unitCode: string;
  sessionStart: number;
  expiresAt: number;
  sessionNonce: number;
  bleUnitId?: number | null;
  status: 'active' | 'ended' | 'expired';
  sessionSecret?: string;
  manifest?: import('./sessionManifest').AttendanceSessionManifest;
}

export interface AttendancePayload {
  version: 1;
  sessionId: string;
  unitCode: string;
  sessionNonce: number;
  sessionStart: number;
  expiresAt: number;
  counter: number;
  issuedAt: number;
  signature?: string;
}

export interface LocalInPersonRecord {
  id: string;
  sessionId: string;
  unitCode: string;
  sessionStart: number;
  scannedAt: number;
  method: InPersonMethod;
  rawPayload: string;
  deviceId: string;
  status: VerificationStatus;
  syncAttempts: number;
  lastSyncError?: string;
  ownerUserId: string;
}
