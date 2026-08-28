import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingLecturerMark = {
  id: string;
  sessionId: string;
  studentId: string;
  rawPayload: string;
  scannedAt: number;
  delegationId?: string;
};

const KEY = '@markwise/pending-lecturer-marks/v1';

const read = async (): Promise<PendingLecturerMark[]> => {
  try {
    const value = await AsyncStorage.getItem(KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const enqueueLecturerMark = async (
  mark: Omit<PendingLecturerMark, 'id'>,
) => {
  const records = await read();
  const duplicate = records.find(
    item =>
      item.sessionId === mark.sessionId && item.studentId === mark.studentId,
  );
  if (duplicate) return duplicate;
  const record = { ...mark, id: `${mark.sessionId}:${mark.studentId}` };
  await AsyncStorage.setItem(KEY, JSON.stringify([...records, record]));
  return record;
};

export const getPendingLecturerMarks = read;

export const removeLecturerMark = async (id: string) => {
  const records = await read();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(records.filter(item => item.id !== id)),
  );
};
