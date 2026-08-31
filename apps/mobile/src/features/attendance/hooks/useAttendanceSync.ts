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

export const useAttendanceSync = (token: string | null) => {
  const { userId } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const isPermanentServerRejection = (error: unknown) =>
    error instanceof ApiRequestError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429;

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
            if (isPermanentServerRejection(error))
              await markInPersonAttendanceRejected(record.id, error);
            else {
              results.failed += 1;
              await markInPersonAttendanceRetry(record.id, error);
            }
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
