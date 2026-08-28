export const ATTENDANCE_PROTOCOL_VERSION = 1 as const;
export const QR_ROTATION_SECONDS = 3;
export const PIN_ROTATION_SECONDS = 30;
export const SESSION_CLOCK_SKEW_SECONDS = 15;
export const MAX_COUNTER_DRIFT = 3;
export const MAX_SESSION_MINUTES = 60;
export const PIN_LENGTH = 6;

export const normalizeUnitCode = (value: string) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

export const deriveCounter = (
  sessionStartSeconds: number,
  windowSeconds: number,
  nowMs = Date.now(),
) =>
  Math.floor(nowMs / 1000 / windowSeconds) -
  Math.floor(sessionStartSeconds / windowSeconds);

export const deriveAbsoluteCounter = (
  sessionStartSeconds: number,
  windowSeconds: number,
  nowMs = Date.now(),
) =>
  Math.max(
    0,
    Math.floor(nowMs / 1000 / windowSeconds) -
      Math.floor(sessionStartSeconds / windowSeconds),
  );

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
