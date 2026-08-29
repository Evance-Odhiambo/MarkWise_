import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredUnitMapping } from './unitMappings';
import { API_BASE_URL } from '../constants';

export type CachedBleMapping = {
  mappings: StoredUnitMapping[];
  version: string;
  cachedAt: number;
};

const BLE_CACHE_TTL_MS = 30 * 60 * 1000;
const inflight = new Map<string, Promise<unknown>>();

const bleMappingsCacheKey = (role: 'student' | 'lecturer') =>
  `@markwise/ble-mappings-cache-${role}-v1`;

/**
 * Read the cached BLE mappings snapshot from storage.
 * Returns the mappings if they exist and parse successfully, or null otherwise.
 */
export const readBleMappingsCache = async (
  role: 'student' | 'lecturer',
): Promise<CachedBleMapping | null> => {
  try {
    const value = await AsyncStorage.getItem(bleMappingsCacheKey(role));
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<CachedBleMapping>;
    if (
      !parsed ||
      !Array.isArray(parsed.mappings) ||
      !parsed.version ||
      !Number.isInteger(parsed.cachedAt)
    ) {
      await AsyncStorage.removeItem(bleMappingsCacheKey(role));
      return null;
    }

    return {
      mappings: parsed.mappings.map(m => ({
        unitCode: String(m.unitCode),
        unitName: m.unitName,
        bleId: String(m.bleId),
      })),
      version: parsed.version,
      cachedAt: Number(parsed.cachedAt),
    };
  } catch {
    await AsyncStorage.removeItem(bleMappingsCacheKey(role));
    return null;
  }
};

/**
 * Cache BLE mappings with version and timestamp.
 */
export const cacheBleMappings = async (
  role: 'student' | 'lecturer',
  mappings: StoredUnitMapping[],
  version: string,
): Promise<void> => {
  const cache: CachedBleMapping = {
    mappings,
    version,
    cachedAt: Date.now(),
  };
  await AsyncStorage.setItem(
    bleMappingsCacheKey(role),
    JSON.stringify(cache),
  );
};

/**
 * Check if BLE mappings cache is still fresh (not stale).
 */
export const isBleMappingsCacheFresh = (
  cache?: CachedBleMapping | null,
): boolean => !!cache && Date.now() - cache.cachedAt < BLE_CACHE_TTL_MS;

/**
 * Fetch BLE mappings from the API, returning mappings and version.
 * Returns null if fetch fails.
 */
export const fetchBleMappingsFromApi = async (
  role: 'student' | 'lecturer',
  token: string,
): Promise<{ mappings: StoredUnitMapping[]; version: string } | null> => {
  try {
    const endpoint =
      role === 'lecturer' ? '/ble/mappings/lecturer' : '/ble/mappings/student';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      version?: string;
      unitMappings?: Record<
        string,
        { id?: string; code?: string; unitCode?: string; bleId?: string; name?: string; unitName?: string }
      >;
      units?: Array<{
        code?: string;
        unitCode?: string;
        bleId?: string;
        name?: string;
        unitName?: string;
      }>;
    };

    const mappings: StoredUnitMapping[] = [];

    if (body.unitMappings && typeof body.unitMappings === 'object') {
      for (const [bleId, unit] of Object.entries(body.unitMappings)) {
        const code = unit.code || unit.unitCode;
        if (code) {
          mappings.push({
            unitCode: code,
            unitName: unit.name || unit.unitName,
            bleId,
          });
        }
      }
    } else if (Array.isArray(body.units)) {
      for (const unit of body.units) {
        const code = unit.code || unit.unitCode;
        if (code && unit.bleId) {
          mappings.push({
            unitCode: code,
            unitName: unit.name || unit.unitName,
            bleId: unit.bleId,
          });
        }
      }
    }

    return {
      mappings,
      version: body.version || 'unknown',
    };
  } catch {
    return null;
  }
};

/**
 * Run a BLE mappings fetch with deduplication lock so concurrent calls
 * don't trigger multiple API requests.
 */
export const runWithBleMapppingsFetchLock = async <T>(
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
