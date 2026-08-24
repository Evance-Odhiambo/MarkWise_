CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebAuthnChallenge_userId_purpose_expiresAt_idx" ON "WebAuthnChallenge"("userId", "purpose", "expiresAt");
CREATE INDEX "WebAuthnChallenge_sessionId_purpose_expiresAt_idx" ON "WebAuthnChallenge"("sessionId", "purpose", "expiresAt");
