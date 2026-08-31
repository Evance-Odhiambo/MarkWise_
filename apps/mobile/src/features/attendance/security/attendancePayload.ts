import type { AttendancePayload, InPersonSession } from '../types/inPerson';
import { hmacSha256Hex, base64ToUtf8, utf8ToBase64 } from './attendanceCrypto';
import {
  ATTENDANCE_PROTOCOL_VERSION,
  deriveCounter,
  BLE_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
  normalizeUnitCode,
} from './attendanceProtocol';
import { nowEpochMs } from './serverClock';

const unsignedPayload = (payload: Omit<AttendancePayload, 'signature'>) =>
  [
    payload.version,
    payload.sessionId,
    payload.unitCode,
    payload.sessionNonce,
    payload.sessionStart,
    payload.expiresAt,
    payload.counter,
    payload.issuedAt,
  ].join('|');

export const createSignedPayload = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = nowEpochMs(),
) => {
  const payload: Omit<AttendancePayload, 'signature'> = {
    version: ATTENDANCE_PROTOCOL_VERSION,
    sessionId: session.id,
    unitCode: normalizeUnitCode(session.unitCode),
    sessionNonce: session.sessionNonce,
    sessionStart: session.sessionStart,
    expiresAt: session.expiresAt,
    counter: deriveCounter(
      Math.floor(session.sessionStart / 1000),
      QR_ROTATION_SECONDS,
      nowMs,
    ),
    issuedAt: nowMs,
  };
  return {
    ...payload,
    signature: await hmacSha256Hex(unsignedPayload(payload), sessionSecret),
  } satisfies AttendancePayload;
};

export const encodeAttendancePayload = (payload: AttendancePayload) =>
  `MWIP1:${utf8ToBase64(JSON.stringify(payload))}`;

export const decodeAttendancePayload = (raw: string): AttendancePayload => {
  if (!raw.startsWith('MWIP1:'))
    throw new Error('Unsupported attendance payload');
  const payload = JSON.parse(base64ToUtf8(raw.slice(6))) as AttendancePayload;
  if (
    payload.version !== ATTENDANCE_PROTOCOL_VERSION ||
    !payload.sessionId ||
    !payload.unitCode ||
    !Number.isSafeInteger(payload.sessionNonce) ||
    !Number.isFinite(payload.sessionStart) ||
    !Number.isFinite(payload.expiresAt) ||
    !Number.isSafeInteger(payload.counter) ||
    !Number.isFinite(payload.issuedAt) ||
    !/^[0-9a-f]{64}$/i.test(payload.signature || '')
  ) {
    throw new Error('Invalid attendance payload');
  }
  return payload;
};

export const getUnsignedPayload = (payload: AttendancePayload) => {
  const { signature: _signature, ...unsigned } = payload;
  return unsignedPayload(unsigned);
};

/** Compact 9-byte BLE wire used by MarkWise: nonce32 | counter16 | unitId16 | version8. */
export const createCompactBlePayload = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = nowEpochMs(),
) => {
  if (session.bleUnitId == null)
    throw new Error('BLE unit mapping unavailable');
  const counter = deriveCounter(
    Math.floor(session.sessionStart / 1000),
    BLE_ROTATION_SECONDS,
    nowMs,
  );
  const bytes = new Uint8Array(9);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, session.sessionNonce >>> 0);
  view.setUint16(4, counter & 0xffff);
  view.setUint16(6, session.bleUnitId & 0xffff);
  bytes[8] = 1;
  const binary = String.fromCharCode(...bytes);
  return `MWBLE1:${(globalThis as any).btoa(binary)}`;
};

export const decodeCompactBlePayload = (raw: string) => {
  if (!raw.startsWith('MWBLE1:')) throw new Error('Invalid BLE payload');
  const binary = (globalThis as any).atob(raw.slice(7)) as string;
  if (binary.length !== 9) throw new Error('Invalid BLE payload');
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  if (view.getUint8(8) !== 1) throw new Error('Invalid BLE payload');
  return {
    nonce: view.getUint32(0),
    counter: view.getUint16(4),
    unitId: view.getUint16(6),
  };
};
