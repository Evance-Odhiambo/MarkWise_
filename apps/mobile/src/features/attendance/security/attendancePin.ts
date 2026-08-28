import { hmacSha256Hex } from './attendanceCrypto';
import {
  deriveAbsoluteCounter,
  PIN_LENGTH,
  PIN_ROTATION_SECONDS,
} from './attendanceProtocol';
import type { InPersonSession } from '../types/inPerson';

/**
 * Generates the lecturer-only PIN for a 30-second window.
 * The session secret must never be sent to or stored on a student device.
 */
export const createAttendancePin = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = Date.now(),
) => {
  const counter = deriveAbsoluteCounter(
    Math.floor(session.sessionStart / 1000),
    PIN_ROTATION_SECONDS,
    nowMs,
  );
  const message = [
    session.id,
    session.unitCode,
    session.sessionNonce,
    counter,
  ].join('|');
  const digest = await hmacSha256Hex(message, sessionSecret);
  const value = Number.parseInt(digest.slice(0, 8), 16) % 10 ** PIN_LENGTH;
  return String(value).padStart(PIN_LENGTH, '0');
};

/** Raw server-verifiable PIN evidence. Never send the session secret to students. */
export const createAttendancePinPayload = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = Date.now(),
) => {
  const counter = deriveAbsoluteCounter(
    Math.floor(session.sessionStart / 1000),
    PIN_ROTATION_SECONDS,
    nowMs,
  );
  const pin = await createAttendancePin(session, sessionSecret, nowMs);
  return `MWPIN1:${session.id}:${pin}:${counter}`;
};

export const isValidAttendancePin = (value: string) => /^\d{6}$/.test(value);

export const createSubmittedPinPayload = (
  session: InPersonSession,
  pin: string,
  nowMs = Date.now(),
) => {
  if (!isValidAttendancePin(pin))
    throw new Error('PIN must contain six digits');
  const counter = deriveAbsoluteCounter(
    Math.floor(session.sessionStart / 1000),
    PIN_ROTATION_SECONDS,
    nowMs,
  );
  return `MWPIN1:${session.id}:${pin}:${counter}`;
};
