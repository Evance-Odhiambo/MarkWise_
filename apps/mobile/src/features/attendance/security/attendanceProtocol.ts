export { normalizeUnitCode } from '../../../shared/utils/unitCodes';
import { nowEpochMs } from './serverClock';

export const ATTENDANCE_PROTOCOL_VERSION = 1 as const;
export const QR_ROTATION_SECONDS = 3;
export const BLE_ROTATION_SECONDS = 5;
export const RELAY_ROTATION_SECONDS = 5;
export const PIN_ROTATION_SECONDS = 30;
export const SESSION_CLOCK_SKEW_SECONDS = 15;
export const MAX_COUNTER_DRIFT = 3;
export const MAX_SESSION_MINUTES = 60;
export const PIN_LENGTH = 6;

/** Seconds remaining until the next global Unix-epoch rotation window. */
export const getWindowRemainingSeconds = (
  windowSeconds: number,
  nowMs = nowEpochMs(),
) => {
  const elapsed = Math.floor(nowMs / 1000) % windowSeconds;
  return windowSeconds - elapsed;
};

export const deriveCounter = (
  _sessionStartSeconds: number,
  windowSeconds: number,
  nowMs = nowEpochMs(),
) => Math.floor(nowMs / 1000 / windowSeconds);

export const deriveAbsoluteCounter = (
  _sessionStartSeconds: number,
  windowSeconds: number,
  nowMs = nowEpochMs(),
) => Math.floor(nowMs / 1000 / windowSeconds);

export const normalizePin = (value: string) =>
  String(value || '').replace(/\D/g, '');

export const isWithinSessionWindow = (
  sessionStartSeconds: number,
  durationSeconds: number,
  nowMs = Date.now(),
) => {
  const now = Math.floor(nowMs / 1000);
  return (
    now >= sessionStartSeconds - SESSION_CLOCK_SKEW_SECONDS &&
    now <= sessionStartSeconds + durationSeconds + SESSION_CLOCK_SKEW_SECONDS
  );
};
