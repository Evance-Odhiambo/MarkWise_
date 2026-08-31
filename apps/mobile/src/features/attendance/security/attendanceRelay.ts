import * as Keychain from 'react-native-keychain';
import { API_BASE_URL } from '../../../shared/constants';
import { base64ToUtf8, hmacSha256Hex, utf8ToBase64 } from './attendanceCrypto';
import { deriveCounter, QR_ROTATION_SECONDS } from './attendanceProtocol';
import type { InPersonSession } from '../types/inPerson';
import { nowEpochMs } from './serverClock';

const SERVICE = 'com.markwise.attendance.relay-key';

const randomHex = () => {
  const bytes = new Uint8Array(32);
  (globalThis as any).crypto?.getRandomValues?.(bytes);
  if (!bytes.some(Boolean))
    throw new Error('Secure random generator unavailable');
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(
    '',
  );
};

export const getOrCreateRelayKey = async () => {
  const existing = await Keychain.getGenericPassword({ service: SERVICE });
  if (existing && typeof existing !== 'boolean' && existing.password)
    return existing.password;
  const key = randomHex();
  await Keychain.setGenericPassword('markwise-relay', key, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
};

export const registerRelayKey = async (token: string) => {
  const deviceKey = await getOrCreateRelayKey();
  const response = await fetch(
    `${API_BASE_URL}/attendance/in-person/relay/register-device`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceKey }),
    },
  );
  if (!response.ok) throw new Error('Relay device registration failed');
};

export const createRelayPayload = async (
  parentPayload: string,
  sessionId: string,
  relayerId: string,
  nowMs = nowEpochMs(),
) => {
  const counter = Math.floor(nowMs / 1000 / 3);
  const key = await getOrCreateRelayKey();
  const signature = await hmacSha256Hex(
    [parentPayload, counter, relayerId, sessionId].join('|'),
    key,
  );
  return `MWIR1:${utf8ToBase64(
    JSON.stringify({
      version: 1,
      parentPayload,
      relayerId,
      sessionId,
      counter,
      signature,
    }),
  )}`;
};

export const decodeRelayPayload = (
  raw: string,
): { sessionId: string; parentPayload: string } => {
  if (!raw.startsWith('MWIR1:')) throw new Error('Invalid relay payload');
  const value = JSON.parse(base64ToUtf8(raw.slice(6))) as {
    sessionId?: string;
    parentPayload?: string;
  };
  if (!value.sessionId || !value.parentPayload)
    throw new Error('Invalid relay payload');
  return { sessionId: value.sessionId, parentPayload: value.parentPayload };
};

/** Inverse of decodeOpaqueRelayPayload — builds MWR1 from a typed-in token. */
export const encodeOpaqueRelayPayload = (tokenHex: string) => {
  const normalized = tokenHex.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(normalized))
    throw new Error('Relay code must be 8 hex characters');
  const bytes = new Uint8Array(9);
  bytes.set([0x4d, 0x57, 0x49, 0x32], 0); // "MWI2"
  const tokenBytes = normalized.match(/.{2}/g)!.map(byte => parseInt(byte, 16));
  bytes.set(tokenBytes, 4);
  bytes[8] = 1;
  const binary = String.fromCharCode(...bytes);
  return `MWR1:${(globalThis as any).btoa(binary)}`;
};

export const decodeOpaqueRelayPayload = (raw: string) => {
  // MWR1 is the compact MarkWise Relay v1 transport format. MWIR1 remains
  // reserved for the full signed JSON relay QR payload.
  if (!raw.startsWith('MWR1:')) throw new Error('Invalid opaque relay payload');
  const binary = (globalThis as any).atob(raw.slice(5)) as string;
  const bytes = Uint8Array.from(binary, (char: string) => char.charCodeAt(0));
  if (
    bytes.length !== 9 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== 'MWI2' ||
    bytes[8] !== 1
  )
    throw new Error('Invalid opaque relay payload');
  return Array.from(bytes.slice(4, 8), value =>
    value.toString(16).padStart(2, '0'),
  ).join('');
};
