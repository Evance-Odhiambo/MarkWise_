const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

export const API_BASE_URL =
  runtime.process?.env?.MARKWISE_API_URL ||
  'https://backend-api-26ojx3spiq-ew.a.run.app/api/v1';
export const WEB_APP_URL =
  runtime.process?.env?.MARKWISE_WEB_URL || 'http://localhost:3000';

export const ATTENDANCE_SESSION_MAX_MINUTES = 60;
