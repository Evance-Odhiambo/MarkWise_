import { Q } from '@nozbe/watermelondb';
import database from './database';
import Model from './models/ReceivedBleCounter';

const collection = () =>
  database.collections.get<Model>('received_ble_counters');

// Counters are transmitted as uint16 (see attendancePayload.ts compact BLE
// wire format) and wrap at 0x10000. A forward step within this window is
// accepted as normal rotation; anything else is treated as a stale repeat or
// implausible replay and ignored for local dedup/regression purposes. The
// server independently re-validates counter drift on sync — this is a local
// hygiene check, not the source of truth for security.
const MAX_FORWARD_STEP = 64;

const circularForwardDistance = (from: number, to: number) =>
  (to - from + 0x10000) % 0x10000;

/**
 * Records a BLE beacon's rotation counter for a session, returning whether it
 * represents new forward progress worth acting on (vs. a repeat/replay of an
 * already-seen counter).
 */
export const recordBleCounter = async (
  sessionId: string,
  nonce: number,
  bleUnitId: number,
  counter: number,
): Promise<{ accepted: boolean }> => {
  const existing = await collection()
    .query(Q.where('session_id', sessionId))
    .fetch();
  const record = existing[0];
  if (!record) {
    await database.write(async () => {
      await collection().create(row => {
        row.sessionId = sessionId;
        row.nonce = nonce;
        row.bleUnitId = bleUnitId;
        row.lastCounter = counter;
        row.lastSeenAt = Date.now();
      });
    });
    return { accepted: true };
  }
  if (record.lastCounter === counter) return { accepted: false };
  const forward = circularForwardDistance(record.lastCounter, counter);
  const accepted = forward > 0 && forward <= MAX_FORWARD_STEP;
  await database.write(async () => {
    await record.update(row => {
      // Always advance last-seen so a legitimately rotated but out-of-window
      // counter doesn't get permanently stuck comparing against a stale value.
      row.lastCounter = counter;
      row.nonce = nonce;
      row.lastSeenAt = Date.now();
    });
  });
  return { accepted };
};
