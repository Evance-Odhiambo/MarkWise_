ALTER TABLE "OnboardingRequest"
ADD COLUMN IF NOT EXISTS "contactTitle" TEXT NOT NULL DEFAULT 'Institutional Representative';

ALTER TABLE "OnboardingRequest"
ALTER COLUMN "contactTitle" DROP DEFAULT;
