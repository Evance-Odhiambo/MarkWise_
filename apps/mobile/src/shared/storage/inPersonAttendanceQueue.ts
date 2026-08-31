import { Q } from '@nozbe/watermelondb';
import database from './database';
import InPersonAttendanceRecord from './models/InPersonAttendanceRecord';
import type { LocalInPersonRecord } from '../../features/attendance/types/inPerson';

const collection = () =>
  database.collections.get<InPersonAttendanceRecord>(
    'in_person_attendance_records',
  );

export async function enqueueInPersonAttendance(record: LocalInPersonRecord) {
  const existing = await collection()
    .query(
      Q.where('session_id', record.sessionId),
      Q.where('device_id', record.deviceId),
      Q.where('owner_user_id', record.ownerUserId),
    )
    .fetch();
  if (existing.length) return existing[0].id;
  let id = '';
  await database.write(async () => {
    const created = await collection().create(model => {
      model.localId = record.id;
      model.sessionId = record.sessionId;
      model.unitCode = record.unitCode;
      model.sessionStart = record.sessionStart;
      model.scannedAt = record.scannedAt;
      model.method = record.method;
      model.rawPayload = record.rawPayload;
      model.deviceId = record.deviceId;
      model.status = 'pending';
      model.syncAttempts = 0;
      model.lastSyncError = null;
      model.ownerUserId = record.ownerUserId;
    });
    id = created.id;
  });
  return id;
}

export async function getPendingInPersonAttendance(
  ownerUserId: string,
  limit = 50,
) {
  const records = await collection()
    .query(
      Q.where('status', 'pending'),
      Q.where('owner_user_id', ownerUserId),
      Q.sortBy('scanned_at', 'asc'),
      Q.take(limit),
    )
    .fetch();
  return records.map(record => ({
    id: record.id,
    sessionId: record.sessionId,
    unitCode: record.unitCode,
    sessionStart: record.sessionStart,
    scannedAt: record.scannedAt,
    method: record.method as LocalInPersonRecord['method'],
    rawPayload: record.rawPayload,
    deviceId: record.deviceId,
    status: record.status as LocalInPersonRecord['status'],
    syncAttempts: record.syncAttempts,
    lastSyncError: record.lastSyncError || undefined,
    ownerUserId: record.ownerUserId!,
  }));
}

export async function getAllInPersonAttendance() {
  const records = await collection()
    .query(Q.sortBy('scanned_at', 'desc'))
    .fetch();
  return records.map(record => ({
    id: record.id,
    unitCode: record.unitCode,
    sessionStart: record.sessionStart,
    scannedAt: record.scannedAt,
    method: record.method as LocalInPersonRecord['method'],
    status: record.status as LocalInPersonRecord['status'],
  }));
}

export async function markInPersonAttendanceVerified(id: string) {
  await database.write(async () => {
    const record = await collection().find(id);
    await record.update(model => {
      model.status = 'verified';
    });
  });
}

export async function markInPersonAttendanceRejected(
  id: string,
  error: unknown,
) {
  await database.write(async () => {
    const record = await collection().find(id);
    await record.update(model => {
      model.status = 'rejected';
      model.syncAttempts += 1;
      model.lastSyncError =
        error instanceof Error ? error.message : 'Attendance was rejected';
    });
  });
}

export async function markInPersonAttendanceRetry(id: string, error: unknown) {
  await database.write(async () => {
    const record = await collection().find(id);
    await record.update(model => {
      model.syncAttempts += 1;
      model.lastSyncError =
        error instanceof Error ? error.message : 'Attendance sync failed';
    });
  });
}

/**
 * Persists a record's relay eligibility so it survives app restarts instead
 * of only living in an in-memory ref. Looked up by the same
 * (sessionId, deviceId, ownerUserId) triple enqueueInPersonAttendance dedups
 * on, since callers only have the app-level record, not the WatermelonDB row id.
 */
export async function setRecordRelayEligibility(
  sessionId: string,
  deviceId: string,
  ownerUserId: string,
  relayEligible: boolean,
  relayMethod: 'qr' | 'ble' | 'pin',
) {
  const existing = await collection()
    .query(
      Q.where('session_id', sessionId),
      Q.where('device_id', deviceId),
      Q.where('owner_user_id', ownerUserId),
    )
    .fetch();
  const record = existing[0];
  if (!record) return;
  await database.write(async () => {
    await record.update(model => {
      model.relayEligible = relayEligible ? 1 : 0;
      model.relayMethod = relayMethod;
    });
  });
}
