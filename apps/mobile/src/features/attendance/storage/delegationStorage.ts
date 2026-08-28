import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAttendanceSessionSecret,
  getAttendanceSessionSecret,
  storeAttendanceSessionSecret,
} from '../../../shared/security/secureKeyStorage';
import type { Delegation } from '../api/delegationApi';

const metadataKey = '@markwise/attendance-delegations/v1';

export type CachedDelegation = Delegation & {
  grantToken: string;
  session?: unknown;
};

export const findCachedDelegationBySessionId = async (sessionId: string) =>
  (await loadCachedDelegations()).find(row => row.sessionId === sessionId) ??
  null;

export const loadCachedDelegations = async (): Promise<CachedDelegation[]> => {
  const raw = await AsyncStorage.getItem(metadataKey);
  const rows = raw ? (JSON.parse(raw) as Delegation[]) : [];
  const cached = await Promise.all(
    rows.map(async row => {
      const grantToken = await getAttendanceSessionSecret(
        `delegation-${row.id}`,
      );
      return grantToken ? { ...row, grantToken } : null;
    }),
  );
  return cached.filter((row): row is CachedDelegation => Boolean(row));
};

export const saveCachedDelegation = async (delegation: CachedDelegation) => {
  const current = await loadCachedDelegations();
  const next = [...current.filter(row => row.id !== delegation.id), delegation];
  await AsyncStorage.setItem(
    metadataKey,
    JSON.stringify(
      next.map(({ grantToken: _grantToken, session: _session, ...row }) => row),
    ),
  );
  await storeAttendanceSessionSecret(
    `delegation-${delegation.id}`,
    delegation.grantToken,
  );
};

export const removeCachedDelegation = async (id: string) => {
  const current = await loadCachedDelegations();
  await AsyncStorage.setItem(
    metadataKey,
    JSON.stringify(
      current
        .filter(row => row.id !== id)
        .map(({ grantToken: _token, ...row }) => row),
    ),
  );
  await clearAttendanceSessionSecret(`delegation-${id}`);
};
