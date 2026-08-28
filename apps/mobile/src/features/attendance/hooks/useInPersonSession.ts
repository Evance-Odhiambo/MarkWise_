import { useCallback, useState } from 'react';
import type { InPersonSession } from '../types/inPerson';
import {
  createInPersonSession,
  endInPersonSession,
} from '../api/inPersonAttendanceApi';
import {
  storeAttendanceSessionSecret,
  clearAttendanceSessionSecret,
} from '../../../shared/security/secureKeyStorage';
import { cacheInPersonSession } from '../../../shared/storage/inPersonSessionCache';
import { randomNonce, randomSecret } from '../security/attendanceCrypto';

export const useInPersonSession = (token: string | null) => {
  const [session, setSession] = useState<InPersonSession | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useCallback(
    async (input: {
      unitCode: string;
      durationMinutes?: number;
      bleUnitId?: number | null;
    }) => {
      setLoading(true);
      const durationMs = Math.min(input.durationMinutes ?? 10, 60) * 60_000;
      try {
        if (token) {
          try {
            const expiresAt = new Date(Date.now() + durationMs).toISOString();
            const result = await createInPersonSession(
              { unitCode: input.unitCode, expiresAt },
              token,
            );
            if (!result.data.sessionSecret)
              throw new Error('Server did not provide session credentials');
            await storeAttendanceSessionSecret(
              result.data.id,
              result.data.sessionSecret,
            );
            const safeSession = { ...result.data, sessionSecret: undefined };
            await cacheInPersonSession(safeSession);
            setSession(safeSession);
            return result.data;
          } catch {
            // A lecturer can still conduct attendance when the API is down.
            // The locally generated secret is stored in the device keychain;
            // queued attendance data can be synchronized when connectivity
            // returns.
          }
        }

        const sessionStart = Math.floor(Date.now() / 1_000) * 1_000;
        const offlineSession = {
          id: `offline-${sessionStart}-${randomNonce()}`,
          unitCode: input.unitCode,
          sessionStart,
          expiresAt: sessionStart + durationMs,
          sessionNonce: randomNonce(),
          bleUnitId: input.bleUnitId ?? null,
          status: 'active' as const,
        };
        const sessionSecret = randomSecret();
        await storeAttendanceSessionSecret(offlineSession.id, sessionSecret);
        await cacheInPersonSession(offlineSession);
        setSession(offlineSession);
        return { ...offlineSession, sessionSecret };
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const end = useCallback(async () => {
    if (!session) return;
    if (token && !session.id.startsWith('offline-')) {
      await endInPersonSession(session.id, token).catch(() => undefined);
    }
    await clearAttendanceSessionSecret(session.id);
    setSession(null);
  }, [session, token]);

  const adopt = useCallback(async (adopted: InPersonSession) => {
    await cacheInPersonSession(adopted);
    setSession(adopted);
  }, []);

  return { session, loading, start, end, adopt };
};
