-- Add optional deep-link target to notifications
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
