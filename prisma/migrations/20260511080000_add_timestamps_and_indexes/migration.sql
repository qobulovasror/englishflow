-- Add updatedAt to existing tables (DEFAULT backfills existing rows;
-- Prisma's @updatedAt manages future writes at the ORM level).
ALTER TABLE "users"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "words"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "user_words"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "tests"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes on foreign keys (Postgres does NOT auto-index FKs).
-- These speed up: "list my words", "list my tests", cascade-delete cleanup,
-- and the WordStatus filter used in /learning/daily.
CREATE INDEX "words_createdById_idx" ON "words"("createdById");
CREATE INDEX "user_words_wordId_idx" ON "user_words"("wordId");
CREATE INDEX "user_words_status_idx" ON "user_words"("status");
CREATE INDEX "tests_userId_idx" ON "tests"("userId");
CREATE INDEX "test_questions_testId_idx" ON "test_questions"("testId");
CREATE INDEX "test_questions_wordId_idx" ON "test_questions"("wordId");
