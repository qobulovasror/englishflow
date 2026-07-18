-- Soft delete for decks: archive instead of cascading away enrolled users'
-- progress.
ALTER TABLE "decks" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "decks_deletedAt_idx" ON "decks"("deletedAt");
