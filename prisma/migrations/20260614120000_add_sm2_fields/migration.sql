-- AlterTable: add SM-2 spaced-repetition state to user_words.
-- Existing rows get sensible defaults; nextReviewAt stays NULL so they fall due
-- immediately on the next /learning/daily pull (no forced backfill needed).
ALTER TABLE "user_words" ADD COLUMN     "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lapses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextReviewAt" TIMESTAMP(3);

-- CreateIndex: due-card lookups filter by (userId, nextReviewAt).
CREATE INDEX "user_words_userId_nextReviewAt_idx" ON "user_words"("userId", "nextReviewAt");
