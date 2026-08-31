import { useCallback, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import type { LocalInPersonRecord } from '../types/inPerson';
import {
  ApiRequestError,
  submitInPersonAttendance,
} from '../api/inPersonAttendanceApi';
import {
  enqueueInPersonAttendance,
  getPendingInPersonAttendance,
  markInPersonAttendanceRetry,
  markInPersonAttendanceRejected,
  markInPersonAttendanceVerified,
} from '../../../shared/storage/inPersonAttendanceQueue';
import { registerRelayKey } from '../security/attendanceRelay';

// A lecturer session that hasn't been claimed by the server yet (see
// useInPersonSession's background claim retry) legitimately doesn't exist
// there for a while when the lecturer started offline. Bound how long a
// record keeps retrying on that specific reason before giving up, so a
// genuinely bogus/garbage session id doesn't retry forever.
const MAX_SESSION_NOT_FOUND_ATTEMPTS = 200;

export const useAttendanceSync = (token: string | null) => {
  const { userId } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const isPermanentServerRejection = (error: unknown) => {
    if (!(error instanceof ApiRequestError)) return false;
    if (error.status < 400 || error.status >= 500) return false;
    if (error.status === 408 || error.status === 429) return false;
    // A session the server doesn't know about yet is expected and
    // transient while a locally-started session is still being claimed —
    // it isn't a permanent rejection on its own (see the attempt cap in
    // syncPending, which does eventually give up).
    if (error.reason === 'SESSION_NOT_FOUND') return false;
    return true;
  };

  const sync = useCallback(
    async (record: LocalInPersonRecord) => {
      if (!userId) throw new Error('Student account is required');
      setSyncing(true);
      // Persist the attendance before attempting any network operation. This
      // is the source of truth for offline attendance and survives app restarts.
      const storageId = await enqueueInPersonAttendance(record);
      if (!token) {
        setSyncing(false);
        return { success: true, data: { status: 'queued' as const } };
      }
      try {
        await registerRelayKey(token).catch(() => undefined);
        try {
          const result = await submitInPersonAttendance(record, token);
          await markInPersonAttendanceVerified(storageId);
          return result;
        } catch (error) {
          if (isPermanentServerRejection(error)) {
            await markInPersonAttendanceRejected(storageId, error);
            throw error;
          }
          await markInPersonAttendanceRetry(storageId, error);
          return { success: true, data: { status: 'queued' as const } };
        }
      } catch (error) {
        await markInPersonAttendanceRetry(storageId, error);
        throw error;
      } finally {
        setSyncing(false);
      }
    },
    [token, userId],
  );

  const syncPending = useCallback(
    async (limit = 25) => {
      if (!token || !userId) throw new Error('Authentication required');
      setSyncing(true);
      const results = { verified: 0, failed: 0 };
      try {
        await registerRelayKey(token).catch(() => undefined);
        const records = await getPendingInPersonAttendance(userId, limit);
        for (const record of records) {
          try {
            const result = await submitInPersonAttendance(record, token);
            await markInPersonAttendanceVerified(record.id);
            if (
              result.data.status === 'verified' ||
              result.data.status === 'duplicate'
            )
              results.verified += 1;
          } catch (error) {
            if (isPermanentServerRejection(error)) {
              await markInPersonAttendanceRejected(record.id, error);
              continue;
            }
            const staleSessionNotFound =
              error instanceof ApiRequestError &&
              error.reason === 'SESSION_NOT_FOUND' &&
              record.syncAttempts >= MAX_SESSION_NOT_FOUND_ATTEMPTS;
            if (staleSessionNotFound) {
              await markInPersonAttendanceRejected(
                record.id,
                new Error(
                  'Lecturer session was never confirmed by the server',
                ),
              );
              continue;
            }
            results.failed += 1;
            await markInPersonAttendanceRetry(record.id, error);
          }
        }
        return results;
      } finally {
        setSyncing(false);
      }
    },
    [token, userId],
  );

  return { syncing, sync, syncPending };
};
