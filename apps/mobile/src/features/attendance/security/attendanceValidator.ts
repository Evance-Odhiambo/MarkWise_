import type { AttendancePayload, InPersonSession } from '../types/inPerson';
import {
  decodeAttendancePayload,
  decodeCompactBlePayload,
} from './attendancePayload';
import {
  deriveCounter,
  MAX_COUNTER_DRIFT,
  QR_ROTATION_SECONDS,
  isWithinSessionWindow,
  normalizeUnitCode,
} from './attendanceProtocol';
import { isValidAttendancePin } from './attendancePin';
import { nowEpochMs } from './serverClock';

export interface LocalValidationResult {
  valid: boolean;
  reason?: string;
  payload?: AttendancePayload;
}

export const validateAttendancePayload = (
  rawPayload: string,
  session: InPersonSession,
  nowMs = nowEpochMs(),
): LocalValidationResult => {
  try {
    const payload = decodeAttendancePayload(rawPayload);
    // Validate the counter against the QR's own issuedAt timestamp. Comparing
    // it with the scan-time window incorrectly rejects valid QR codes when a
    // scan crosses a 3-second rotation boundary or is processed offline.
    const expectedCounter = deriveCounter(
      Math.floor(session.sessionStart / 1000),
      QR_ROTATION_SECONDS,
      payload.issuedAt,
    );
    if (payload.sessionId !== session.id)
      return { valid: false, reason: 'SESSION_MISMATCH' };
    if (
      normalizeUnitCode(payload.unitCode) !==
      normalizeUnitCode(session.unitCode)
    )
      return { valid: false, reason: 'UNIT_MISMATCH' };
    if (payload.sessionNonce !== session.sessionNonce)
      return { valid: false, reason: 'NONCE_MISMATCH' };
    if (
      Math.abs(payload.sessionStart - session.sessionStart) > 15_000 ||
      Math.abs(payload.expiresAt - session.expiresAt) > 15_000
    )
      return { valid: false, reason: 'SESSION_TIME_MISMATCH' };
    if (
      payload.issuedAt < session.sessionStart - 15_000 ||
      payload.issuedAt > session.expiresAt + 15_000
    )
      return { valid: false, reason: 'ISSUED_AT_INVALID' };
    if (
      !isWithinSessionWindow(
        Math.floor(session.sessionStart / 1000),
        Math.floor((session.expiresAt - session.sessionStart) / 1000),
        nowMs,
      )
    )
      return { valid: false, reason: 'SESSION_EXPIRED' };
    if (Math.abs(payload.counter - expectedCounter) > MAX_COUNTER_DRIFT)
      return { valid: false, reason: 'COUNTER_DRIFT' };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'INVALID_PAYLOAD' };
  }
};

export const validateAttendancePinPayload = (
  rawPayload: string,
  session: InPersonSession,
  nowMs = nowEpochMs(),
): LocalValidationResult => {
  const parts = rawPayload.split(':');
  if (
    parts.length !== 4 ||
    parts[0] !== 'MWPIN1' ||
    parts[1] !== session.id ||
    !isValidAttendancePin(parts[2] || '') ||
    !/^\d+$/.test(parts[3] || '')
  )
    return { valid: false, reason: 'INVALID_PIN' };
  if (
    !isWithinSessionWindow(
      Math.floor(session.sessionStart / 1000),
      Math.floor((session.expiresAt - session.sessionStart) / 1000),
      nowMs,
    )
  )
    return { valid: false, reason: 'SESSION_EXPIRED' };
  return { valid: true };
};

export const validateBlePayload = (
  rawPayload: string,
  session: InPersonSession,
  nowMs = nowEpochMs(),
): LocalValidationResult => {
  try {
    const beacon = decodeCompactBlePayload(rawPayload);
    if (beacon.nonce !== session.sessionNonce)
      return { valid: false, reason: 'NONCE_MISMATCH' };
    if (session.bleUnitId != null && beacon.unitId !== session.bleUnitId)
      return { valid: false, reason: 'UNIT_MISMATCH' };
    if (
      !isWithinSessionWindow(
        Math.floor(session.sessionStart / 1000),
        Math.floor((session.expiresAt - session.sessionStart) / 1000),
        nowMs,
      )
    )
      return { valid: false, reason: 'SESSION_EXPIRED' };
    return { valid: true };
  } catch {
    return { valid: false, reason: 'INVALID_BLE_PAYLOAD' };
  }
};
