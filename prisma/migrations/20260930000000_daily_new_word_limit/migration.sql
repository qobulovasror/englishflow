-- Persist the user's preferred number of new words and when each word was first
-- introduced, so repeated daily requests cannot bypass the cap.
ALTER TABLE "users"
ADD COLUMN "dailyNewLimit" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "user_words"
ADD COLUMN "introducedAt" TIMESTAMP(3);

CREATE INDEX "user_words_userId_introducedAt_idx"
ON "user_words"("userId", "introducedAt");
