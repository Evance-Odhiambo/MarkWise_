import type { AttendanceSessionManifest } from '../types/sessionManifest';
import { MANIFEST_PROTOCOL_VERSION } from '../types/sessionManifest';
import { normalizeUnitCode } from '../../../shared/utils/unitCodes';
import { MARKWISE_MANIFEST_PUBLIC_KEY } from '../../../shared/constants';
import {
  BLE_ROTATION_SECONDS,
  PIN_ROTATION_SECONDS,
  QR_ROTATION_SECONDS,
} from './attendanceProtocol';

// Single source of truth for the public key — see constants.ts for why it's
// hardcoded there rather than read from process.env directly.
const publicKey = () => MARKWISE_MANIFEST_PUBLIC_KEY;

// Must mirror the backend's manifestValues() (sessionManifest.ts) exactly —
// same fields, same order — or every signature verification fails.
const canonical = (manifest: AttendanceSessionManifest) => [
  String(MANIFEST_PROTOCOL_VERSION), manifest.sessionId, normalizeUnitCode(manifest.unitCode),
  String(manifest.bleUnitId ?? -1), String(manifest.sessionNonce),
  String(manifest.sessionStart), String(manifest.expiresAt),
  String(manifest.issuedAt),
  String(BLE_ROTATION_SECONDS), String(QR_ROTATION_SECONDS), String(PIN_ROTATION_SECONDS),
].join('|');

const base64Bytes = (value: string) => {
  const binary = (globalThis as any).atob(value);
  return Uint8Array.from(binary, (char: string) => char.charCodeAt(0));
};

const utf8Bytes = (value: string) => {
  const encoded = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  );
  return Uint8Array.from(encoded, char => char.charCodeAt(0));
};

/** Verifies an issuer signature. The private key never exists on mobile. */
export const verifySessionManifest = async (
  manifest: AttendanceSessionManifest,
) => {
  const key = publicKey();
  if (!key || !manifest.signature) return false;
  if (manifest.protocolVersion !== MANIFEST_PROTOCOL_VERSION) return false;
  const cryptoApi = (globalThis as any).crypto;
  if (!cryptoApi?.subtle) return false;
  try {
    const imported = await cryptoApi.subtle.importKey(
      'raw', base64Bytes(key), { name: 'Ed25519' }, false, ['verify'],
    );
    return await cryptoApi.subtle.verify(
      { name: 'Ed25519' }, imported, base64Bytes(manifest.signature),
      utf8Bytes(canonical(manifest)),
    );
  } catch {
    return false;
  }
};
