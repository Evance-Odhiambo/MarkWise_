import { AppState, type AppStateStatus } from 'react-native';
import { useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import {
  submitLecturerAssistedMark,
  ApiRequestError,
} from '../api/inPersonAttendanceApi';
import { submitDelegatedAssistedMark } from '../api/delegationApi';
import { findCachedDelegationBySessionId } from '../storage/delegationStorage';
import {
  getPendingLecturerMarks,
  removeLecturerMark,
} from '../../../shared/storage/lecturerManualMarkQueue';

export default function LecturerManualMarkSync() {
  const { token, role } = useAuth();
  const sync = useCallback(async () => {
    if (!token || (role !== 'lecturer' && role !== 'student')) return;
    const pending = await getPendingLecturerMarks();
    for (const mark of pending) {
      try {
        if (role === 'student' && mark.delegationId) {
          const delegation = await findCachedDelegationBySessionId(
            mark.sessionId,
          );
          if (!delegation || delegation.id !== mark.delegationId) {
            await removeLecturerMark(mark.id);
            continue;
          }
          await submitDelegatedAssistedMark(
            {
              ...mark,
              delegationId: delegation.id,
              grantToken: delegation.grantToken,
            },
            token,
          );
        } else if (role === 'lecturer') {
          await submitLecturerAssistedMark(mark, token);
        } else {
          continue;
        }
        await removeLecturerMark(mark.id);
      } catch (error) {
        // Keep temporary network failures. Permanent validation/auth failures
        // cannot become valid later and should not retry forever. A session
        // the server doesn't know about yet is neither — it may simply not
        // have been claimed yet (see useInPersonSession's background claim
        // retry) — so keep retrying that specific case instead of discarding
        // a manual mark made just before/during the claim race.
        if (
          error instanceof ApiRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.reason !== 'SESSION_NOT_FOUND'
        )
          await removeLecturerMark(mark.id);
      }
    }
  }, [role, token]);

  useEffect(() => {
    void sync();
    const timer = setInterval(() => void sync(), 30_000);
    const onStateChange = (state: AppStateStatus) => {
      if (state === 'active') void sync();
    };
    const subscription = AppState.addEventListener('change', onStateChange);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [sync]);

  return null;
}
