import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAttendanceSessionSecret,
  getAttendanceSessionSecret,
  storeAttendanceSessionSecret,
} from '../security/secureKeyStorage';

export type PendingPin = {
  id: string;
  unitCode: string;
  pin: string;
  scannedAt: number;
  deviceId?: string;
};

const KEY = '@markwise/pending-pins/v1';

const read = async (): Promise<PendingPin[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (
      await Promise.all(
        parsed.map(async (item: Omit<PendingPin, 'pin'>) => {
          const pin = await getAttendanceSessionSecret(
            `pending-pin-${item.id}`,
          );
          return pin ? { ...item, pin } : null;
        }),
      )
    ).filter((item): item is PendingPin => Boolean(item));
  } catch {
    return [];
  }
};

export const enqueuePendingPin = async (input: Omit<PendingPin, 'id'>) => {
  const records = await read();
  const record = {
    ...input,
    id: `${input.unitCode}:${input.scannedAt}`,
  };
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify([
      ...records.map(({ pin: _pin, ...metadata }) => metadata),
      (({ pin: _pin, ...metadata }) => metadata)(record),
    ]),
  );
  await storeAttendanceSessionSecret(`pending-pin-${record.id}`, record.pin);
  return record;
};

export const getPendingPins = read;

export const removePendingPin = async (id: string) => {
  const records = await read();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(records.filter(record => record.id !== id)),
  );
  await clearAttendanceSessionSecret(`pending-pin-${id}`);
};
