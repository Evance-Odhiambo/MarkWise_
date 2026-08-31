import database from './database';
import Model from './models/PendingPinSubmission';
import {
  encryptLocalValue,
  decryptLocalValue,
} from '../security/localStorageCrypto';

export type PendingPin = {
  id: string;
  unitCode: string;
  pin: string;
  scannedAt: number;
  deviceId?: string;
};

const collection = () =>
  database.collections.get<Model>('pending_pin_submissions');

// AES-GCM associated data binds the ciphertext to its own (immutable)
// unitCode/scannedAt pair, matching the pattern used for unit mappings in
// shared/storage/unitMappings.ts.
const aad = (unitCode: string, scannedAt: number) => `${unitCode}|${scannedAt}`;

const toPendingPin = async (record: Model): Promise<PendingPin | null> => {
  try {
    const pin = await decryptLocalValue(
      record.pin,
      aad(record.unitCode, record.scannedAt),
    );
    if (!pin) return null;
    return {
      id: record.id,
      unitCode: record.unitCode,
      pin,
      scannedAt: record.scannedAt,
      deviceId: record.deviceId ?? undefined,
    };
  } catch {
    return null;
  }
};

/** WatermelonDB-backed pending PIN queue — the raw PIN is stored AES-GCM encrypted. */
export const enqueuePendingPin = async (
  input: Omit<PendingPin, 'id'>,
): Promise<PendingPin> => {
  const encryptedPin = await encryptLocalValue(
    input.pin,
    aad(input.unitCode, input.scannedAt),
  );
  if (!encryptedPin) throw new Error('Unable to encrypt PIN for local storage');
  let created!: Model;
  await database.write(async () => {
    created = await collection().create(record => {
      record.unitCode = input.unitCode;
      record.sessionId = null;
      record.pin = encryptedPin;
      record.scannedAt = input.scannedAt;
      record.deviceId = input.deviceId ?? null;
      record.status = 'pending';
      record.syncAttempts = 0;
      record.lastError = null;
      record.createdAt = Date.now();
    });
  });
  return {
    id: created.id,
    unitCode: input.unitCode,
    pin: input.pin,
    scannedAt: input.scannedAt,
    deviceId: input.deviceId,
  };
};

export const getPendingPins = async (): Promise<PendingPin[]> => {
  const records = await collection().query().fetch();
  const resolved = await Promise.all(records.map(toPendingPin));
  return resolved.filter((item): item is PendingPin => Boolean(item));
};

export const removePendingPin = async (id: string) => {
  const record = await collection()
    .find(id)
    .catch(() => null);
  if (!record) return;
  await database.write(async () => {
    await record.destroyPermanently();
  });
};

/** Records a failed sync attempt without discarding the queued submission. */
export const markPendingPinAttempt = async (id: string, error?: string) => {
  const record = await collection()
    .find(id)
    .catch(() => null);
  if (!record) return;
  await database.write(async () => {
    await record.update(row => {
      row.syncAttempts = (row.syncAttempts ?? 0) + 1;
      row.lastError = error ?? null;
    });
  });
};
