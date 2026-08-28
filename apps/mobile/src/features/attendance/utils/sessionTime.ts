export const toEpochSeconds = (value: number | Date) =>
  Math.floor((value instanceof Date ? value.getTime() : value) / 1000);

export const isExpired = (expiresAt: number, nowMs = Date.now()) =>
  nowMs >= expiresAt;

export const secondsRemaining = (expiresAt: number, nowMs = Date.now()) =>
  Math.max(0, Math.ceil((expiresAt - nowMs) / 1000));
