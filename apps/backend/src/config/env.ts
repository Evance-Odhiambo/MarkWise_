import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  databasePoolMax: positiveNumber("DATABASE_POOL_MAX", 10),
  jwtSecret: required("JWT_SECRET"),
  redisUrl: process.env.REDIS_URL?.trim() || "redis://localhost:6379",
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: positiveNumber("PORT", 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitMax: positiveNumber("RATE_LIMIT_MAX", 100),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW ?? "1 minute",
  webauthnRpId: process.env.WEBAUTHN_RP_ID?.trim() || "localhost",
  webauthnOrigin:
    process.env.WEBAUTHN_ORIGIN?.trim() || "http://localhost:3000",
  // 10-character Apple Developer Team ID, needed for the iOS passkey
  // Associated Domain (apple-app-site-association) to resolve to a real
  // App ID. Left unset until the user has enrolled and registered the
  // com.markwise App ID - the route below serves a valid-but-empty
  // response rather than a placeholder when this is blank, so iOS
  // passkeys just don't work yet instead of shipping a fake-looking value.
  appleTeamId: process.env.APPLE_TEAM_ID?.trim() || "",
} as const;
