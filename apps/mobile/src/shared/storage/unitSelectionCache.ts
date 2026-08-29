import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudentYear, Unit, UnitSelectionRole } from '../../features/unit-selection/types';

export type CachedUnitSelectionSnapshot = {
  role: UnitSelectionRole;
  selectedCodes: string[];
  catalogue: Unit[];
  enrolledUnitIds: string[];
  years: StudentYear[];
  fetchedAt: number;
};

const UNIT_CACHE_TTL_MS = 10 * 60 * 1000;
const inflight = new Map<string, Promise<unknown>>();

export const unitSelectionCacheKey = ({
  role,
  userId,
  institutionId,
}: {
  role: UnitSelectionRole;
  userId?: string | null;
  institutionId?: string | null;
}) =>
  `@markwise/unit-selection-cache/${role}/${userId || 'anonymous'}/${institutionId || 'global'}-v1`;

export const readUnitSelectionSnapshot = async ({
  role,
  userId,
  institutionId,
}: {
  role: UnitSelectionRole;
  userId?: string | null;
  institutionId?: string | null;
}): Promise<CachedUnitSelectionSnapshot | null> => {
  const value = await AsyncStorage.getItem(
    unitSelectionCacheKey({ role, userId, institutionId }),
  );
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CachedUnitSelectionSnapshot>;
    if (
      !parsed ||
      !Array.isArray(parsed.selectedCodes) ||
      !Array.isArray(parsed.catalogue) ||
      !Array.isArray(parsed.enrolledUnitIds) ||
      !Array.isArray(parsed.years)
    ) {
      await AsyncStorage.removeItem(
        unitSelectionCacheKey({ role, userId, institutionId }),
      );
      return null;
    }

    return {
      role,
      selectedCodes: parsed.selectedCodes.map(String),
      catalogue: parsed.catalogue,
      enrolledUnitIds: parsed.enrolledUnitIds.map(String),
      years: parsed.years,
      fetchedAt: Number(parsed.fetchedAt) || Date.now(),
    };
  } catch {
    await AsyncStorage.removeItem(
      unitSelectionCacheKey({ role, userId, institutionId }),
    );
    return null;
  }
};

export const cacheUnitSelectionSnapshot = async ({
  role,
  userId,
  institutionId,
  selectedCodes,
  catalogue,
  enrolledUnitIds,
  years,
}: {
  role: UnitSelectionRole;
  userId?: string | null;
  institutionId?: string | null;
  selectedCodes: string[];
  catalogue: Unit[];
  enrolledUnitIds: string[];
  years: StudentYear[];
}) => {
  const snapshot: CachedUnitSelectionSnapshot = {
    role,
    selectedCodes,
    catalogue,
    enrolledUnitIds,
    years,
    fetchedAt: Date.now(),
  };

  await AsyncStorage.setItem(
    unitSelectionCacheKey({ role, userId, institutionId }),
    JSON.stringify(snapshot),
  );
};

export const isUnitSelectionSnapshotFresh = (
  snapshot?: CachedUnitSelectionSnapshot | null,
) => !!snapshot && Date.now() - snapshot.fetchedAt < UNIT_CACHE_TTL_MS;

export const runWithUnitSelectionFetchLock = async <T>(
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
