import { useCallback } from 'react';
import type {
  InPersonMethod,
  InPersonSession,
  LocalInPersonRecord,
} from '../types/inPerson';
import {
  validateAttendancePayload,
  validateAttendancePinPayload,
  validateBlePayload,
} from '../security/attendanceValidator';
import { getOrCreateSecureDeviceId } from '../../../shared/storage/secureDeviceId';
import { useAuth } from '../../auth/context/AuthContext';
import { nowEpochMs } from '../security/serverClock';

export const useInPersonCapture = (session: InPersonSession | null) => {
  const { userId } = useAuth();
  const capture = useCallback(
    async (
      rawPayload: string,
      method: InPersonMethod,
      sessionOverride?: InPersonSession,
    ): Promise<LocalInPersonRecord> => {
      const activeSession = sessionOverride ?? session;
      if (!activeSession) throw new Error('No active attendance session');
      if (!userId) throw new Error('Student account is required');
      // MWIR1 is a signed relay wrapper. The backend validates the wrapper,
      // its parent proof, relayer device key, counter, and enrollment.
      if (
        !(
          method === 'qr' &&
          (rawPayload.trim().startsWith('MWIR1:') ||
            rawPayload.trim().startsWith('MWR1:'))
        ) &&
        !(method === 'ble' && rawPayload.trim().startsWith('MWR1:'))
      ) {
        const validation =
          method === 'pin'
            ? validateAttendancePinPayload(rawPayload, activeSession)
            : method === 'ble'
            ? validateBlePayload(rawPayload, activeSession)
            : validateAttendancePayload(rawPayload, activeSession);
        if (!validation.valid)
          throw new Error(validation.reason || 'Invalid attendance payload');
      }
      return {
        id: `${activeSession.id}:${nowEpochMs()}`,
        sessionId: activeSession.id,
        unitCode: activeSession.unitCode,
        sessionStart: activeSession.sessionStart,
        scannedAt: nowEpochMs(),
        method,
        rawPayload,
        deviceId: await getOrCreateSecureDeviceId(),
        status: 'pending',
        syncAttempts: 0,
        ownerUserId: userId,
      };
    },
    [session, userId],
  );

  return { capture };
};
