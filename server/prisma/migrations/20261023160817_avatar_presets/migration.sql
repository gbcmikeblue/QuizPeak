-- CreateTable
CREATE TABLE "AvatarPreset" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvatarPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvatarPreset_emoji_key" ON "AvatarPreset"("emoji");

