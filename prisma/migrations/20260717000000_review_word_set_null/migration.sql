-- Preserve the append-only review log when a word is deleted. Previously the
-- reviews.wordId FK cascaded the delete, wiping streak/trend history. Now the
-- column is nullable and the FK is ON DELETE SET NULL.
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_wordId_fkey";

ALTER TABLE "reviews" ALTER COLUMN "wordId" DROP NOT NULL;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE SET NULL ON UPDATE CASCADE;
