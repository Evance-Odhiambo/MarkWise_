import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession } from '../../features/auth/context/AuthContext';
import { API_BASE_URL } from '../constants';

export type CachedSessionSnapshot = AuthSession & {
  refreshedAt: number;
};

const SESSION_CACHE_TTL_MS = 15 * 60 * 1000;
const inflight = new Map<string, Promise<unknown>>();

export const sessionCacheKey = () => '@markwise/auth-session-cache-v1';

/**
 * Read the cached session snapshot from storage.
 * Returns the session if it exists and parses successfully, or null otherwise.
 */
export const readSessionSnapshot = async (): Promise<CachedSessionSnapshot | null> => {
  try {
    const value = await AsyncStorage.getItem(sessionCacheKey());
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<CachedSessionSnapshot>;
    if (
      !parsed ||
      !parsed.token ||
      !parsed.userId ||
      (parsed.role !== 'student' && parsed.role !== 'lecturer')
    ) {
      await AsyncStorage.removeItem(sessionCacheKey());
      return null;
    }

    return {
      token: parsed.token,
      userId: parsed.userId,
      role: parsed.role,
      institutionId: parsed.institutionId || null,
      name: parsed.name,
      email: parsed.email,
      course: parsed.course,
      admissionNumber: parsed.admissionNumber,
      staffNumber: parsed.staffNumber,
      refreshedAt: Number(parsed.refreshedAt) || Date.now(),
    };
  } catch {
    await AsyncStorage.removeItem(sessionCacheKey());
    return null;
  }
};

/**
 * Cache a session snapshot with the current timestamp.
 */
export const cacheSessionSnapshot = async (
  session: AuthSession,
): Promise<void> => {
  const snapshot: CachedSessionSnapshot = {
    ...session,
    refreshedAt: Date.now(),
  };
  await AsyncStorage.setItem(sessionCacheKey(), JSON.stringify(snapshot));
};

/**
 * Check if a session snapshot is still fresh (not stale).
 */
export const isSessionSnapshotFresh = (
  snapshot?: CachedSessionSnapshot | null,
): boolean => !!snapshot && Date.now() - snapshot.refreshedAt < SESSION_CACHE_TTL_MS;

/**
 * Fetch the latest profile from the API for a student.
 */
export const fetchStudentProfile = async (
  token: string,
): Promise<Partial<AuthSession> | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/students/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const profile = (await response.json()) as {
      userId?: string;
      name?: string;
      institutionId?: string | null;
      admissionNumber?: string;
      course?: string;
    };
    return {
      userId: profile.userId,
      name: profile.name,
      institutionId: profile.institutionId || null,
      admissionNumber: profile.admissionNumber,
      course: profile.course,
    };
  } catch {
    return null;
  }
};

/**
 * Fetch the latest profile from the API for a lecturer.
 */
export const fetchLecturerProfile = async (
  token: string,
): Promise<Partial<AuthSession> | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lecturers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const profile = (await response.json()) as {
      userId?: string;
      name?: string;
      institutionId?: string | null;
      staffNumber?: string;
    };
    return {
      userId: profile.userId,
      name: profile.name,
      institutionId: profile.institutionId || null,
      staffNumber: profile.staffNumber,
    };
  } catch {
    return null;
  }
};

/**
 * Run a profile refresh with a deduplication lock so concurrent calls
 * don't trigger multiple API requests.
 */
export const runWithSessionRefreshLock = async <T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> => {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = task().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
};
