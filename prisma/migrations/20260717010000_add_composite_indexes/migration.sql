-- Composite indexes for hot per-user queries.
CREATE INDEX "tests_userId_createdAt_idx" ON "tests"("userId", "createdAt");
CREATE INDEX "user_words_userId_status_idx" ON "user_words"("userId", "status");
