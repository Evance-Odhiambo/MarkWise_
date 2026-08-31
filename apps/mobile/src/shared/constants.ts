const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

export const API_BASE_URL =
  runtime.process?.env?.MARKWISE_API_URL ||
  'https://backend-api-26ojx3spiq-ew.a.run.app/api/v1';
export const WEB_APP_URL =
  runtime.process?.env?.MARKWISE_WEB_URL || 'http://localhost:3000';

export const ATTENDANCE_SESSION_MAX_MINUTES = 60;
// Not a secret — this is the public half of the backend's manifest signing
// keypair (ATTENDANCE_MANIFEST_PRIVATE_KEY), safe to ship in the app build.
// It's hardcoded (rather than relying solely on an env var) because Metro
// doesn't inject process.env into the RN bundle without an env-injection
// babel plugin, which this project doesn't have configured — an env-only
// value would silently resolve to '' at runtime on every device, making
// every session manifest unverifiable. The env override is kept for a
// future per-environment key rotation once real env injection is wired up.
const DEFAULT_MARKWISE_MANIFEST_PUBLIC_KEY =
  'nhd6Wo2h2L+PDMX4M5hKk7UwqdX860oGrGRRBC1FF8o=';
export const MARKWISE_MANIFEST_PUBLIC_KEY =
  runtime.process?.env?.MARKWISE_MANIFEST_PUBLIC_KEY ||
  DEFAULT_MARKWISE_MANIFEST_PUBLIC_KEY;
