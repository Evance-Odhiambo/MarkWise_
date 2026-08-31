/**
 * Device time adjusted to the backend clock. The offset is learned from the
 * HTTP Date header and is kept in memory for the current app run. When the
 * device is offline, the last learned offset is used.
 */
let serverOffsetMs = 0;

export const nowEpochMs = () => Date.now() + serverOffsetMs;

export const updateServerClock = (
  dateHeader: string | null,
  requestStartedAt: number,
  requestFinishedAt: number,
) => {
  if (!dateHeader) return;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isFinite(serverMs)) return;
  const midpoint = requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;
  const offset = serverMs - midpoint;
  // Ignore clearly invalid headers or a broken local clock correction.
  if (Math.abs(offset) <= 24 * 60 * 60 * 1000) serverOffsetMs = offset;
};

export const getServerClockOffsetMs = () => serverOffsetMs;
