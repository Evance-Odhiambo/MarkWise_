import { API_BASE_URL } from '../constants';
import type { AttendanceSession } from '../../features/attendance/types';

interface ApiOptions {
  token: string;
}

async function request<T>(
  path: string,
  options: RequestInit & ApiOptions,
): Promise<T> {
  const { token, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.error ??
        body.message ??
        `Attendance request failed (${response.status})`,
    );
  }
  return body as T;
}

export async function createOnlineAttendanceSession(
  input: { unitCode: string; expiresAt: string },
  options: ApiOptions,
) {
  return request<{ success: true; data: AttendanceSession }>(
    '/attendance/online/sessions',
    {
      method: 'POST',
      body: JSON.stringify(input),
      ...options,
    },
  );
}

export async function getOnlineAttendanceSessions(options: ApiOptions) {
  return request<{ success: true; data: AttendanceSession[] }>(
    '/attendance/online/sessions',
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function getOnlineAttendanceSession(
  sessionId: string,
  options: ApiOptions,
) {
  return request<{ success: true; data: AttendanceSession }>(
    `/attendance/online/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'GET', ...options },
  );
}

export async function submitOnlineAttendance(
  sessionId: string,
  input: { deviceId?: string },
  options: ApiOptions,
) {
  return request<{ success: boolean; duplicate?: boolean }>(
    `/attendance/online/sessions/${encodeURIComponent(sessionId)}/submit`,
    { method: 'POST', body: JSON.stringify(input), ...options },
  );
}

export async function endOnlineAttendanceSession(
  sessionId: string,
  options: ApiOptions,
) {
  return request<{ success: true }>(
    `/attendance/online/sessions/${encodeURIComponent(sessionId)}/end`,
    { method: 'POST', ...options },
  );
}

export async function getOnlineAttendanceAttendees(
  sessionId: string,
  options: ApiOptions,
) {
  return request<{
    success: true;
    data: Array<{ id: string; admissionNumber: string; markedAt: string }>;
  }>(`/attendance/online/sessions/${encodeURIComponent(sessionId)}/attendees`, {
    method: 'GET',
    ...options,
  });
}
