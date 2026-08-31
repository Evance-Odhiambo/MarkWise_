import type { InPersonSession } from './inPerson';

export const MANIFEST_PROTOCOL_VERSION = 2 as const;

/** Signed metadata required to validate a BLE/QR/PIN discovery packet offline. */
export interface AttendanceSessionManifest {
  protocolVersion: typeof MANIFEST_PROTOCOL_VERSION;
  sessionId: string;
  unitCode: string;
  /** Null when this unit has no BLE mapping — QR/PIN remain offline-trustable. */
  bleUnitId: number | null;
  sessionNonce: number;
  sessionStart: number;
  expiresAt: number;
  issuedAt: number;
  bleRotationSeconds: number;
  qrRotationSeconds: number;
  pinRotationSeconds: number;
  issuerId: string;
  keyId: string;
  signature: string;
}

export const manifestSession = (
  manifest: AttendanceSessionManifest,
): InPersonSession => ({
  id: manifest.sessionId,
  unitCode: manifest.unitCode,
  sessionStart: manifest.sessionStart,
  expiresAt: manifest.expiresAt,
  sessionNonce: manifest.sessionNonce,
  bleUnitId: manifest.bleUnitId,
  status: 'active',
});
