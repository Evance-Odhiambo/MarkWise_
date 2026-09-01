import { hmacSha256Hex } from './attendanceCrypto';
import {
  deriveAbsoluteCounter,
  normalizeUnitCode,
  PIN_LENGTH,
  PIN_ROTATION_SECONDS,
} from './attendanceProtocol';
import type { InPersonSession } from '../types/inPerson';
import { nowEpochMs } from './serverClock';

/**
 * Generates the lecturer-only PIN for a 30-second window.
 * The session secret must never be sent to or stored on a student device.
 */
export const createAttendancePin = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = nowEpochMs(),
) => {
  const counter = deriveAbsoluteCounter(
    Math.floor(session.sessionStart / 1000),
    PIN_ROTATION_SECONDS,
    nowMs,
  );
  // Must match the backend's verifyPin message exactly (see
  // inPerson.verification.service.ts) — unitCode has to be normalized the
  // same way here as the session's canonical spelling can carry a space
  // (e.g. "SBT 2170"), which the server never includes in what it hashes.
  const message = [
    session.id,
    normalizeUnitCode(session.unitCode),
    session.sessionNonce,
    counter,
  ].join('|');
  const digest = await hmacSha256Hex(message, sessionSecret);
  const value = Number.parseInt(digest.slice(0, 8), 16) % 10 ** PIN_LENGTH;
  return String(value).padStart(PIN_LENGTH, '0');
};

/**
 * Generates a peer "helper PIN" for a 30-second window — the same idea as
 * createAttendancePin, but keyed off the relaying student's own per-device
 * relay key (see attendanceRelay.ts:getOrCreateRelayKey) instead of the
 * session secret, which students never have. Lets an already BLE/QR-verified
 * student help a classmate whose device can't scan QR or receive BLE, fully
 * offline on both sides — the recipient types this into the same PIN entry
 * flow already used for the lecturer's PIN. Must match the backend's peer
 * fallback in verifyPin exactly (inPerson.verification.service.ts).
 */
export const createHelperPin = async (
  sessionId: string,
  studentId: string,
  relayKey: string,
  nowMs = nowEpochMs(),
) => {
  const counter = deriveAbsoluteCounter(0, PIN_ROTATION_SECONDS, nowMs);
  const message = [sessionId, studentId, counter].join('|');
  const digest = await hmacSha256Hex(message, relayKey);
  const value = Number.parseInt(digest.slice(0, 8), 16) % 10 ** PIN_LENGTH;
  return { pin: String(value).padStart(PIN_LENGTH, '0'), counter };
};

/** Raw server-verifiable PIN evidence. Never send the session secret to students. */
export const createAttendancePinPayload = async (
  session: InPersonSession,
  sessionSecret: string,
  nowMs = nowEpochMs(),
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
  nowMs = nowEpochMs(),
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
