/*
  Warnings:

  - You are about to drop the column `coin` on the `ContestPrize` table. All the data in the column will be lost.
  - You are about to drop the column `rewardCoin` on the `GameRecord` table. All the data in the column will be lost.
  - You are about to drop the column `coin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `CoinPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoinTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WithdrawOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PointTxType" AS ENUM ('REGISTER_BONUS', 'CHECKIN', 'ACTIVITY', 'LIKE_GIVEN', 'AD_REWARD', 'INVITE_REWARD', 'QUIZ_REWARD', 'QUIZ_ENROLL', 'CONTEST_ENROLL', 'CONTEST_REWARD', 'HINT_COST', 'ADMIN_ADJUST');

-- DropForeignKey
ALTER TABLE "CoinTransaction" DROP CONSTRAINT "CoinTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "PayOrder" DROP CONSTRAINT "PayOrder_packageId_fkey";

-- DropForeignKey
ALTER TABLE "PayOrder" DROP CONSTRAINT "PayOrder_userId_fkey";

-- DropForeignKey
ALTER TABLE "WithdrawOrder" DROP CONSTRAINT "WithdrawOrder_userId_fkey";

-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "prizePoolUnit" TEXT NOT NULL DEFAULT 'POINTS';

-- AlterTable
ALTER TABLE "ContestPrize" DROP COLUMN "coin",
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GameRecord" DROP COLUMN "rewardCoin",
ADD COLUMN     "rewardPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "coin",
ADD COLUMN     "lastCheckinAt" TIMESTAMP(3),
ADD COLUMN     "likesReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarned" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "CoinPackage";

-- DropTable
DROP TABLE "CoinTransaction";

-- DropTable
DROP TABLE "PayOrder";

-- DropTable
DROP TABLE "WithdrawOrder";

-- DropEnum
DROP TYPE "CoinTxType";

-- DropEnum
DROP TYPE "PayChannel";

-- DropEnum
DROP TYPE "PayStatus";

-- DropEnum
DROP TYPE "WithdrawMethod";

-- DropEnum
DROP TYPE "WithdrawStatus";

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" "PointTxType" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkinDate" TEXT NOT NULL,
    "streakDay" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLike" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "likeDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewDate" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "desc" TEXT,
    "points" INTEGER NOT NULL DEFAULT 50,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReward" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_type_createdAt_idx" ON "PointTransaction"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_type_refType_refId_key" ON "PointTransaction"("type", "refType", "refId");

-- CreateIndex
CREATE INDEX "DailyCheckin_userId_createdAt_idx" ON "DailyCheckin"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckin_userId_checkinDate_key" ON "DailyCheckin"("userId", "checkinDate");

-- CreateIndex
CREATE INDEX "PointLike_toUserId_likeDate_idx" ON "PointLike"("toUserId", "likeDate");

-- CreateIndex
CREATE UNIQUE INDEX "PointLike_fromUserId_toUserId_likeDate_key" ON "PointLike"("fromUserId", "toUserId", "likeDate");

-- CreateIndex
CREATE INDEX "AdView_userId_viewDate_idx" ON "AdView"("userId", "viewDate");

-- CreateIndex
CREATE UNIQUE INDEX "AdView_userId_viewDate_seq_key" ON "AdView"("userId", "viewDate", "seq");

-- CreateIndex
CREATE INDEX "Activity_enabled_startAt_idx" ON "Activity"("enabled", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReward_activityId_userId_key" ON "ActivityReward"("activityId", "userId");

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckin" ADD CONSTRAINT "DailyCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLike" ADD CONSTRAINT "PointLike_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLike" ADD CONSTRAINT "PointLike_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdView" ADD CONSTRAINT "AdView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReward" ADD CONSTRAINT "ActivityReward_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReward" ADD CONSTRAINT "ActivityReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
