ALTER TABLE "words"
  ADD COLUMN "pronunciation" TEXT,
  ADD COLUMN "partOfSpeech" TEXT,
  ADD COLUMN "collocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
