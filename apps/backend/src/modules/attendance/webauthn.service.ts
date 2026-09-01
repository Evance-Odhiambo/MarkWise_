import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../../config/index.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const REGISTRATION_PURPOSE = "attendance-passkey-registration";
const ATTENDANCE_PURPOSE = "attendance-passkey-authentication";

// A native Android app has no browser origin of its own — Credential Manager
// presents android:apk-key-hash:<base64url(SHA-256 of the signing cert)>
// instead, once Digital Asset Links (see app.ts's /.well-known/assetlinks.json)
// establishes trust between that cert and env.webauthnRpId. Accepting both
// origins is additive — web's own flow (env.webauthnOrigin) is unaffected.
// This is the *debug* keystore's fingerprint; add the release keystore's here
// too before a Play Store build ships, or passkeys break for real users while
// continuing to pass in debug builds.
const ANDROID_APK_KEY_HASH_ORIGIN =
  "android:apk-key-hash:-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDuQ";
const expectedOrigins = [env.webauthnOrigin, ANDROID_APK_KEY_HASH_ORIGIN];

export class WebAuthnService {
  constructor(private readonly prisma: PrismaClient) {}

  private expiresAt() {
    return new Date(Date.now() + CHALLENGE_TTL_MS);
  }

  async registrationOptions(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, name: true },
    });
    if (!student) return null;

    const credentials = await this.prisma.deviceCredential.findMany({
      where: { studentId },
      select: { credentialId: true, transports: true },
    });
    const options = await generateRegistrationOptions({
      rpName: "MarkWise",
      rpID: env.webauthnRpId,
      userID: new TextEncoder().encode(student.id),
      userName: student.email ?? student.id,
      userDisplayName: student.name,
      attestationType: "none",
      excludeCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as WebAuthnCredential["transports"],
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { userId: studentId, purpose: REGISTRATION_PURPOSE },
    });
    await this.prisma.webAuthnChallenge.create({
      data: {
        userId: studentId,
        purpose: REGISTRATION_PURPOSE,
        challenge: options.challenge,
        expiresAt: this.expiresAt(),
      },
    });
    return options;
  }

  async verifyRegistration(
    studentId: string,
    response: RegistrationResponseJSON,
  ) {
    const challenge = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        userId: studentId,
        purpose: REGISTRATION_PURPOSE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge)
      return { verified: false as const, reason: "CHALLENGE_EXPIRED" };

    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: env.webauthnRpId,
        requireUserVerification: true,
      });
      if (!verification.verified)
        return { verified: false as const, reason: "REGISTRATION_FAILED" };
      const info = verification.registrationInfo;
      await this.prisma.deviceCredential.create({
        data: {
          credentialId: info.credential.id,
          userId: studentId,
          userType: "student",
          studentId,
          publicKey: info.credential.publicKey,
          counter: info.credential.counter,
          transports: info.credential.transports ?? [],
        },
      });
      return { verified: true as const };
    } finally {
      await this.prisma.webAuthnChallenge.delete({
        where: { id: challenge.id },
      });
    }
  }

  async attendanceOptions(studentId: string, sessionId: string) {
    const session = await this.prisma.onlineAttendanceSession.findUnique({
      where: { id: sessionId },
      select: { expiresAt: true, endedAt: true },
    });
    if (!session || session.endedAt || session.expiresAt <= new Date())
      return null;
    const credentials = await this.prisma.deviceCredential.findMany({
      where: { studentId },
      select: { credentialId: true, transports: true },
    });
    if (credentials.length === 0) return { noCredential: true as const };
    const options = await generateAuthenticationOptions({
      rpID: env.webauthnRpId,
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as WebAuthnCredential["transports"],
      })),
      userVerification: "required",
    });
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { userId: studentId, sessionId, purpose: ATTENDANCE_PURPOSE },
    });
    await this.prisma.webAuthnChallenge.create({
      data: {
        userId: studentId,
        sessionId,
        purpose: ATTENDANCE_PURPOSE,
        challenge: options.challenge,
        expiresAt: this.expiresAt(),
      },
    });
    return options;
  }

  async verifyAttendance(
    studentId: string,
    sessionId: string,
    response: AuthenticationResponseJSON,
  ) {
    const challenge = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        userId: studentId,
        sessionId,
        purpose: ATTENDANCE_PURPOSE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge)
      return { verified: false as const, reason: "CHALLENGE_EXPIRED" };
    const stored = await this.prisma.deviceCredential.findFirst({
      where: { studentId, credentialId: response.id },
    });
    if (!stored)
      return { verified: false as const, reason: "CREDENTIAL_NOT_REGISTERED" };

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: env.webauthnRpId,
        requireUserVerification: true,
        credential: {
          id: stored.credentialId,
          publicKey: stored.publicKey,
          counter: stored.counter,
          transports: stored.transports as WebAuthnCredential["transports"],
        },
      });
      if (!verification.verified)
        return { verified: false as const, reason: "ASSERTION_FAILED" };
      await this.prisma.deviceCredential.update({
        where: { id: stored.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      });
      return {
        verified: true as const,
        deviceId: `webauthn:${stored.credentialId}`,
      };
    } finally {
      await this.prisma.webAuthnChallenge.delete({
        where: { id: challenge.id },
      });
    }
  }
}
