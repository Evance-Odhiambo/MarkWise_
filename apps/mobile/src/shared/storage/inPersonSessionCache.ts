import { Q } from '@nozbe/watermelondb';
import type { InPersonSession as Session } from '../../features/attendance/types/inPerson';
import database from './database';
import InPersonSession from './models/InPersonSession';
import { cacheSessionManifest } from './sessionManifestCache';

const collection = () =>
  database.collections.get<InPersonSession>('in_person_sessions');

const toSession = (record: InPersonSession): Session => ({
  id: record.sessionId,
  unitCode: record.unitCode,
  sessionStart: record.sessionStart,
  expiresAt: record.expiresAt,
  sessionNonce: record.sessionNonce,
  bleUnitId: record.bleUnitId,
  status: record.status as Session['status'],
});

/** Stores session metadata locally; session secrets are never persisted here. */
export const cacheInPersonSession = async (session: Session) => {
  const existing = await collection()
    .query(Q.where('session_id', session.id))
    .fetch();
  await database.write(async () => {
    if (existing[0]) {
      await existing[0].update(record => {
        record.unitCode = session.unitCode;
        record.sessionStart = session.sessionStart;
        record.expiresAt = session.expiresAt;
        record.sessionNonce = session.sessionNonce;
        record.bleUnitId = session.bleUnitId ?? undefined;
        record.status = session.status;
      });
      return;
    }
    await collection().create(record => {
      record.sessionId = session.id;
      record.unitCode = session.unitCode;
      record.sessionStart = session.sessionStart;
      record.expiresAt = session.expiresAt;
      record.sessionNonce = session.sessionNonce;
      record.bleUnitId = session.bleUnitId ?? undefined;
      record.status = session.status;
    });
  });
  if (session.manifest) await cacheSessionManifest(session.manifest);
};

export const getCachedInPersonSession = async (
  nonce: number,
): Promise<Session | null> => {
  const records = await collection()
    .query(Q.where('session_nonce', nonce))
    .fetch();
  return records[0] ? toSession(records[0]) : null;
};

export const getCachedInPersonSessionById = async (
  sessionId: string,
): Promise<Session | null> => {
  const records = await collection()
    .query(Q.where('session_id', sessionId))
    .fetch();
  return records[0] ? toSession(records[0]) : null;
};

export const getCachedActiveInPersonSessionByUnit = async (
  unitCode: string,
): Promise<Session | null> => {
  const records = await collection()
    .query(Q.where('unit_code', unitCode.trim().toUpperCase()))
    .fetch();
  const active = records.find(
    record => record.status === 'active' && record.expiresAt > Date.now(),
  );
  return active ? toSession(active) : null;
};
