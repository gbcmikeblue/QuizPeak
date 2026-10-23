-- DropIndex
DROP INDEX "PointTransaction_type_refType_refId_key";

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_userId_type_refType_refId_key" ON "PointTransaction"("userId", "type", "refType", "refId");

