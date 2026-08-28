import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@markwise/online-attendance-queue-v1';
type PendingSubmission = {
  sessionId: string;
  deviceId: string;
  queuedAt: string;
};

export async function queueOnlineSubmission(
  item: Omit<PendingSubmission, 'queuedAt'>,
) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? (JSON.parse(raw) as PendingSubmission[]) : [];
  if (
    !queue.some(
      entry =>
        entry.sessionId === item.sessionId && entry.deviceId === item.deviceId,
    )
  ) {
    queue.push({ ...item, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function removeQueuedOnlineSubmission(
  sessionId: string,
  deviceId: string,
) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? (JSON.parse(raw) as PendingSubmission[]) : [];
  await AsyncStorage.setItem(
    QUEUE_KEY,
    JSON.stringify(
      queue.filter(
        item => item.sessionId !== sessionId || item.deviceId !== deviceId,
      ),
    ),
  );
}

export async function getQueuedOnlineSubmission(sessionId: string) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? (JSON.parse(raw) as PendingSubmission[]) : [];
  return queue.find(item => item.sessionId === sessionId) ?? null;
}
