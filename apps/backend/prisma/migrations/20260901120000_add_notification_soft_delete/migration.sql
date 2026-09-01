-- Soft-delete support for notifications: deletedAt null = active, set = in
-- the Bin, purged once 30 days past deletedAt (see notification.route.ts).
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Notification_userId_deletedAt_idx" ON "Notification"("userId", "deletedAt");
