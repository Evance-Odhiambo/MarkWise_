-- AlterTable
ALTER TABLE "OnboardingRequest" ADD COLUMN     "institutionId" TEXT;

-- CreateIndex
CREATE INDEX "OnboardingRequest_institutionId_idx" ON "OnboardingRequest"("institutionId");

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
