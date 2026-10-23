-- AlterTable
ALTER TABLE "ContestAttempt" ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "totalScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ContestAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL DEFAULT '[]',
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "usedSec" INTEGER NOT NULL DEFAULT 0,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContestAnswer_attemptId_questionId_key" ON "ContestAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "ContestAnswer" ADD CONSTRAINT "ContestAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ContestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
