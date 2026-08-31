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
      offlineOnly?: boolean;
    }) => {
      setLoading(true);
      const durationMs = Math.min(input.durationMinutes ?? 10, 60) * 60_000;
      try {
        if (token && !input.offlineOnly) {
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
          } catch (error) {
            // Log the error for debugging
            console.warn('Failed to create session on server:', error);
            
            // Check if this is a validation/auth error (4xx) vs network error
            const isClientError = error && typeof error === 'object' && 'status' in error &&
              typeof (error as any).status === 'number' &&
              (error as any).status >= 400 && (error as any).status < 500;
            
            if (isClientError) {
              // For client errors (bad request, auth issues, etc), don't fall back to offline
              throw error;
            }
            
            // For network errors or server errors, fall back to offline mode
            // A lecturer can still conduct attendance when the API is down.
            // The locally generated secret is stored in the device keychain;
            // queued attendance data can be synchronized when connectivity returns.
            console.log('Falling back to offline session creation');
          }
        }

        // Create offline session (when no token OR when API fails with network error)
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
