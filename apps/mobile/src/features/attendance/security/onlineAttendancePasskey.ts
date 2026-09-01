import { Passkey } from 'react-native-passkey';
import type {
  PasskeyCreateRequest,
  PasskeyCreateResult,
  PasskeyGetRequest,
  PasskeyGetResult,
} from 'react-native-passkey';
import { API_BASE_URL } from '../../../shared/constants';

/**
 * Mirrors apps/web/lib/attendance/online-attendance.ts's passkey functions —
 * same backend routes, same request/response JSON shapes (react-native-passkey's
 * PasskeyCreateRequest/Result and PasskeyGetRequest/Result are structurally the
 * same WebAuthn JSON @simplewebauthn/server already produces and consumes, so
 * the options the backend returns are passed straight through with no
 * translation, and the result it returns goes straight back). Web's own
 * verification is unaffected by anything here — see webauthn.service.ts's
 * expectedOrigin array, which additively accepts this app's native origin
 * alongside web's browser origin.
 */

const request = async <T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}/attendance/online${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || `Passkey request failed (${response.status})`);
  return body as T;
};

/** True on Android API 28+ / iOS 15+ — gates whether to offer passkeys at all. */
export const isPasskeySupported = () => Passkey.isSupported();

export const getPasskeyRegistrationOptions = (token: string) =>
  request<{ success: true; data: PasskeyCreateRequest }>(
    '/passkey/register/options',
    token,
    { method: 'POST', body: '{}' },
  );

export const verifyPasskeyRegistration = (
  token: string,
  response: PasskeyCreateResult,
) =>
  request<{ success: true }>('/passkey/register/verify', token, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });

export const getPasskeyAttendanceOptions = (sessionId: string, token: string) =>
  request<
    | { success: true; data: PasskeyGetRequest }
    | { noCredential: true }
  >(`/sessions/${encodeURIComponent(sessionId)}/passkey/options`, token, {
    method: 'POST',
  });

export const verifyPasskeyAttendance = (
  sessionId: string,
  token: string,
  response: PasskeyGetResult,
) =>
  request<{ success: true }>(
    `/sessions/${encodeURIComponent(sessionId)}/passkey/verify`,
    token,
    { method: 'POST', body: JSON.stringify({ response }) },
  );

/**
 * Registers a passkey on this device for the signed-in student. Throws with a
 * react-native-passkey error `.error` code (e.g. 'UserCancelled',
 * 'CredentialAlreadyExists') the caller can branch on — see the library's
 * README error table.
 */
export const registerOnlineAttendancePasskey = async (token: string) => {
  const options = await getPasskeyRegistrationOptions(token);
  const result = await Passkey.create(options.data);
  await verifyPasskeyRegistration(token, result);
};

/**
 * Authenticates with an existing passkey and submits online attendance for
 * `sessionId`. Returns `{ noCredential: true }` instead of throwing when this
 * device has no passkey registered yet — the caller should offer
 * registerOnlineAttendancePasskey() (or fall back to the existing deviceId
 * submission) rather than treating that as an error.
 */
export const markOnlineAttendanceWithPasskey = async (
  sessionId: string,
  token: string,
): Promise<{ noCredential: true } | { success: true }> => {
  const options = await getPasskeyAttendanceOptions(sessionId, token);
  if ('noCredential' in options) return options;
  const assertion = await Passkey.get(options.data);
  return verifyPasskeyAttendance(sessionId, token, assertion);
};
