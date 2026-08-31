import crypto from "node:crypto";
import {
  BLE_ROTATION_SECONDS,
  normalizeUnitCode,
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from "./inPerson.schema.js";

export const MANIFEST_PROTOCOL_VERSION = 2 as const;

// The canonical string is what actually gets signed. Rotation seconds are
// included so a tampered/stale rotation config can never be presented to a
// client under a valid signature — the client re-derives the same string
// (see mobile sessionManifestCrypto.ts:canonical) and verifies it matches.
export const manifestValues = (input: {
  sessionId: string;
  unitCode: string;
  bleUnitId: number | null;
  sessionNonce: number;
  sessionStart: number;
  expiresAt: number;
  issuedAt: number;
}) => [
  String(MANIFEST_PROTOCOL_VERSION), input.sessionId, normalizeUnitCode(input.unitCode),
  String(input.bleUnitId ?? -1), String(input.sessionNonce),
  String(input.sessionStart), String(input.expiresAt), String(input.issuedAt),
  String(BLE_ROTATION_SECONDS), String(QR_ROTATION_SECONDS), String(PIN_ROTATION_SECONDS),
].join("|");

export const signManifest = (value: string) => {
  const privateKey = process.env.ATTENDANCE_MANIFEST_PRIVATE_KEY;
  if (!privateKey) throw new Error("ATTENDANCE_MANIFEST_PRIVATE_KEY is not configured");
  return crypto.sign(null, Buffer.from(value, "utf8"), privateKey).toString("base64");
};
