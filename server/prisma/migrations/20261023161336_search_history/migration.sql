-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "deletedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchHistory_userId_updatedAt_idx" ON "SearchHistory"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SearchHistory_keyword_idx" ON "SearchHistory"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "SearchHistory_userId_keyword_key" ON "SearchHistory"("userId", "keyword");

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

