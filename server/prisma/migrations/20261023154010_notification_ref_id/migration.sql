-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "refId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_type_refId_idx" ON "Notification"("type", "refId");

