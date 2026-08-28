import { API_BASE_URL } from '../../../shared/constants';

export type Delegation = {
  id: string;
  unitCode: string;
  unitName?: string;
  validFrom: number;
  validUntil: number;
  startedAt?: number | null;
  used: boolean;
  sessionId?: string;
};

const request = async <T>(path: string, token: string, init?: RequestInit) => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/delegations${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    },
  );
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      body.error || `Delegation request failed (${response.status})`,
    );
  return body;
};

export const createDelegation = (
  token: string,
  studentId: string,
  unitCode: string,
) =>
  request<{ success: true; data: Delegation }>('/', token, {
    method: 'POST',
    body: JSON.stringify({ studentId, unitCode }),
  });

export const listDelegations = (token: string) =>
  request<{ delegations: Delegation[] }>('/', token);

export const acceptDelegation = (
  token: string,
  id: string,
  grantToken: string,
) =>
  request<{
    success: true;
    data: Delegation & {
      grantToken: string;
      session: {
        id: string;
        unitCode: string;
        sessionStart: number;
        expiresAt: number;
        sessionNonce: number;
        bleUnitId?: number | null;
        sessionSecret: string;
        status: 'active';
      };
    };
  }>(`/${id}/accept`, token, {
    method: 'POST',
    body: JSON.stringify({ grantToken }),
  });

export const revokeDelegation = (token: string, id: string) =>
  request<{ success: true }>(`/${id}/revoke`, token, { method: 'POST' });

export const submitDelegatedAssistedMark = (
  input: {
    delegationId: string;
    grantToken: string;
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
  }>(`/${input.delegationId}/assisted-mark`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
