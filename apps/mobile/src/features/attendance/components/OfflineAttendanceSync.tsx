import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../../auth/context/AuthContext';
import { useAttendanceSync } from '../hooks/useAttendanceSync';
import { submitPinByUnit, ApiRequestError } from '../api/inPersonAttendanceApi';
import {
  getPendingPins,
  markPendingPinAttempt,
  removePendingPin,
} from '../../../shared/storage/pendingPinQueue';

const SYNC_INTERVAL_MS = 30_000;

/**
 * Runs independently of the attendance screens. Pending records are already
 * durable in WatermelonDB, so this worker can retry them after app resume or
 * when a device regains connectivity without user interaction.
 */
export default function OfflineAttendanceSync() {
  const { token, isAuthenticated } = useAuth();
  const { syncPending } = useAttendanceSync(token);
  const running = useRef(false);

  const flush = useCallback(async () => {
    if (!isAuthenticated || !token || running.current) return;
    running.current = true;
    try {
      await syncPending(25);
    } catch {
      // Network failures are expected offline; the queue retains the record
      // and the next timer/app-resume event retries it.
    } finally {
      running.current = false;
    }
  }, [isAuthenticated, syncPending, token]);

  const flushPins = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    const pending = await getPendingPins();
    for (const pin of pending) {
      try {
        const result = await submitPinByUnit(pin, token);
        if (
          result.data.status === 'verified' ||
          result.data.status === 'duplicate'
        ) {
          await removePendingPin(pin.id);
        }
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          await removePendingPin(pin.id);
        } else {
          await markPendingPinAttempt(
            pin.id,
            error instanceof Error ? error.message : 'SYNC_FAILED',
          );
        }
      }
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void flush();
    void flushPins();
    const timer = setInterval(() => {
      void flush();
      void flushPins();
    }, SYNC_INTERVAL_MS);
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void flush();
        void flushPins();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [flush, flushPins, isAuthenticated]);

  return null;
}
