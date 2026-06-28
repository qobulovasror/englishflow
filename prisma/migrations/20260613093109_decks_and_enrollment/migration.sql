-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- AlterTable
ALTER TABLE "words" ADD COLUMN     "deckId" TEXT,
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "decks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "CefrLevel",
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_enrollments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,

    CONSTRAINT "deck_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decks_isSystem_idx" ON "decks"("isSystem");

-- CreateIndex
CREATE INDEX "decks_level_idx" ON "decks"("level");

-- CreateIndex
CREATE INDEX "decks_createdById_idx" ON "decks"("createdById");

-- CreateIndex
CREATE INDEX "deck_enrollments_deckId_idx" ON "deck_enrollments"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "deck_enrollments_userId_deckId_key" ON "deck_enrollments"("userId", "deckId");

-- CreateIndex
CREATE INDEX "words_deckId_idx" ON "words"("deckId");

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_enrollments" ADD CONSTRAINT "deck_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_enrollments" ADD CONSTRAINT "deck_enrollments_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
