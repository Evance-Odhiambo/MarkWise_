import { Q } from '@nozbe/watermelondb';
import database from './database';
import Model from './models/AttendanceSessionManifest';
import type { AttendanceSessionManifest } from '../../features/attendance/types/sessionManifest';
import { MANIFEST_PROTOCOL_VERSION } from '../../features/attendance/types/sessionManifest';
import type { InPersonSession } from '../../features/attendance/types/inPerson';
import { normalizeUnitCode } from '../utils/unitCodes';
import { verifySessionManifest } from '../../features/attendance/security/sessionManifestCrypto';
import {
  BLE_ROTATION_SECONDS,
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from '../../features/attendance/security/attendanceProtocol';

const collection = () =>
  database.collections.get<Model>('attendance_session_manifests');

const toManifest = (record: Model): AttendanceSessionManifest => ({
  protocolVersion: MANIFEST_PROTOCOL_VERSION,
  sessionId: record.sessionId,
  unitCode: record.unitCode,
  bleUnitId: record.bleUnitId,
  sessionNonce: record.sessionNonce,
  sessionStart: record.sessionStart,
  expiresAt: record.expiresAt,
  issuedAt: record.issuedAt,
  // Rows created before schema v10 have no rotation columns persisted (NULL
  // after the ALTER TABLE) — fall back to the shared protocol constants.
  bleRotationSeconds: record.bleRotationSeconds ?? BLE_ROTATION_SECONDS,
  qrRotationSeconds: record.qrRotationSeconds ?? QR_ROTATION_SECONDS,
  pinRotationSeconds: record.pinRotationSeconds ?? PIN_ROTATION_SECONDS,
  issuerId: record.issuerId,
  keyId: record.keyId,
  signature: record.signature,
});

export const cacheSessionManifest = async (
  manifest: AttendanceSessionManifest,
) => {
  if (!(await verifySessionManifest(manifest)))
    throw new Error('Untrusted attendance session manifest');
  const existing = await collection()
    .query(Q.where('session_id', manifest.sessionId))
    .fetch();
  await database.write(async () => {
    if (existing[0]) {
      await existing[0].update(record => {
        record.unitCode = normalizeUnitCode(manifest.unitCode);
        record.bleUnitId = manifest.bleUnitId;
        record.sessionNonce = manifest.sessionNonce;
        record.sessionStart = manifest.sessionStart;
        record.expiresAt = manifest.expiresAt;
        record.issuedAt = manifest.issuedAt;
        record.issuerId = manifest.issuerId;
        record.keyId = manifest.keyId;
        record.signature = manifest.signature;
        record.trustedAt = Date.now();
        record.bleRotationSeconds = manifest.bleRotationSeconds;
        record.qrRotationSeconds = manifest.qrRotationSeconds;
        record.pinRotationSeconds = manifest.pinRotationSeconds;
      });
      return;
    }
    await collection().create(record => {
      record.sessionId = manifest.sessionId;
      record.unitCode = normalizeUnitCode(manifest.unitCode);
      record.bleUnitId = manifest.bleUnitId;
      record.sessionNonce = manifest.sessionNonce;
      record.sessionStart = manifest.sessionStart;
      record.expiresAt = manifest.expiresAt;
      record.issuedAt = manifest.issuedAt;
      record.issuerId = manifest.issuerId;
      record.keyId = manifest.keyId;
      record.signature = manifest.signature;
      record.trustedAt = Date.now();
      record.bleRotationSeconds = manifest.bleRotationSeconds;
      record.qrRotationSeconds = manifest.qrRotationSeconds;
      record.pinRotationSeconds = manifest.pinRotationSeconds;
    });
  });
};

export const getCachedManifestByBeacon = async (
  nonce: number,
  bleUnitId: number,
): Promise<AttendanceSessionManifest | null> => {
  const records = await collection()
    .query(Q.where('session_nonce', nonce), Q.where('ble_unit_id', bleUnitId))
    .fetch();
  const record = records.find(item => item.expiresAt > Date.now());
  return record ? toManifest(record) : null;
};

/** Trusted manifest lookup keyed purely by session/QR identity (no BLE unit id required). */
export const getCachedManifestBySessionNonce = async (
  nonce: number,
): Promise<AttendanceSessionManifest | null> => {
  const records = await collection()
    .query(Q.where('session_nonce', nonce))
    .fetch();
  const record = records.find(item => item.expiresAt > Date.now());
  return record ? toManifest(record) : null;
};

export const manifestToSession = (
  manifest: AttendanceSessionManifest,
): InPersonSession => ({
  id: manifest.sessionId,
  unitCode: manifest.unitCode,
  sessionStart: manifest.sessionStart,
  expiresAt: manifest.expiresAt,
  sessionNonce: manifest.sessionNonce,
  bleUnitId: manifest.bleUnitId,
  status: manifest.expiresAt > Date.now() ? 'active' : 'expired',
});
