import { API_BASE_URL } from '../../../shared/constants';
import type { InPersonSession, LocalInPersonRecord } from '../types/inPerson';
import { updateServerClock } from '../security/serverClock';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const request = async <T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const requestStartedAt = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    updateServerClock(
      response.headers.get('date'),
      requestStartedAt,
      Date.now(),
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiRequestError(
        body.error || `InPerson request failed (${response.status})`,
        response.status,
        typeof body.reason === 'string' ? body.reason : undefined,
      );
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
};

export const createInPersonSession = (
  input: {
    unitCode: string;
    expiresAt: string;
    /** Client-generated identity, present when claiming a locally-started session. */
    id?: string;
    sessionNonce?: number;
    sessionSecret?: string;
    sessionStart?: number;
    bleUnitId?: number | null;
  },
  token: string,
) =>
  request<{ success: true; data: InPersonSession }>(
    '/attendance/in-person/sessions',
    token,
    { method: 'POST', body: JSON.stringify(input) },
  );

export const endInPersonSession = (sessionId: string, token: string) =>
  request<{ success: true }>(
    `/attendance/in-person/sessions/${encodeURIComponent(sessionId)}/end`,
    token,
    { method: 'POST' },
  );

export const getInPersonSession = (sessionId: string, token: string) =>
  request<{ success: true; data: InPersonSession }>(
    `/attendance/in-person/sessions/${encodeURIComponent(sessionId)}`,
    token,
  );

export const getInPersonSessionByBleNonce = (nonce: number, token: string) =>
  request<{ success: true; data: InPersonSession }>(
    `/attendance/in-person/sessions/by-ble/${nonce}`,
    token,
  );

export const getActiveInPersonSessionByUnit = (
  unitCode: string,
  token: string,
) =>
  request<{ success: true; data: InPersonSession }>(
    `/attendance/in-person/sessions/by-unit/${encodeURIComponent(unitCode)}`,
    token,
  );

export const submitPinByUnit = (
  input: {
    unitCode: string;
    pin: string;
    scannedAt: number;
    deviceId?: string;
  },
  token: string,
) =>
  request<{
    success: boolean;
    data: { status: 'verified' | 'duplicate' | 'queued' };
  }>('/attendance/in-person/pin-submit', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const getInPersonSessionByRelayToken = (
  relayToken: string,
  token: string,
) =>
  request<{ success: true; data: InPersonSession }>(
    `/attendance/in-person/sessions/by-relay/${encodeURIComponent(relayToken)}`,
    token,
  );

export const createInPersonRelayToken = (sessionId: string, token: string) =>
  request<{ success: true; data: { payload: string } }>(
    '/attendance/in-person/relay/create-token',
    token,
    { method: 'POST', body: JSON.stringify({ sessionId }) },
  );

export const submitInPersonAttendance = (
  record: Omit<
    LocalInPersonRecord,
    'id' | 'status' | 'syncAttempts' | 'lastSyncError'
  >,
  token: string,
) =>
  request<{
    success: boolean;
    data: { status: 'verified' | 'duplicate' | 'queued' };
  }>('/attendance/in-person/submit', token, {
    method: 'POST',
    body: JSON.stringify(record),
  });

export const batchSubmitInPersonAttendance = (
  records: Array<
    Omit<
      LocalInPersonRecord,
      'id' | 'status' | 'syncAttempts' | 'lastSyncError'
    >
  >,
  token: string,
) =>
  request<{
    success: true;
    data: { verified: number; rejected: number; duplicate: number };
  }>('/attendance/in-person/batch-sync', token, {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

export const submitLecturerAssistedMark = (
  input: {
    sessionId: string;
    studentId: string;
    rawPayload: string;
    scannedAt: number;
    deviceId?: string;
  },
  token: string,
) =>
  request<{
    success: true;
    data: { status: 'verified' | 'duplicate'; recordId: string };
  }>('/attendance/in-person/assisted-mark', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const getLecturerUnitRoster = (unitCode: string, token: string) =>
  request<{
    unitCode: string;
    students: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
    }>;
  }>(`/lecturers/units/${encodeURIComponent(unitCode)}/roster`, token);
