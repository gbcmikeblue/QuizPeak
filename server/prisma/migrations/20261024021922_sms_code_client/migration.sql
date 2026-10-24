-- DropIndex
DROP INDEX "SmsCode_phone_scene_createdAt_idx";

-- AlterTable
ALTER TABLE "SmsCode" ADD COLUMN     "client" TEXT NOT NULL DEFAULT 'PC';

-- CreateIndex
CREATE INDEX "SmsCode_phone_scene_client_createdAt_idx" ON "SmsCode"("phone", "scene", "client", "createdAt");

-- CreateIndex
CREATE INDEX "SmsCode_phone_createdAt_idx" ON "SmsCode"("phone", "createdAt");
