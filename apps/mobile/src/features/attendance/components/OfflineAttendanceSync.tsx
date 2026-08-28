import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../../auth/context/AuthContext';
import { useAttendanceSync } from '../hooks/useAttendanceSync';

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

  useEffect(() => {
    if (!isAuthenticated) return;
    void flush();
    const timer = setInterval(() => void flush(), SYNC_INTERVAL_MS);
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') void flush();
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [flush, isAuthenticated]);

  return null;
}
