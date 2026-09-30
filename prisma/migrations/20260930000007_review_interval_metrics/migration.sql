-- Additive measurement fields. Existing reviews cannot be assigned a known
-- scheduling interval retroactively, so NULL marks the interval as unknown.
ALTER TABLE "reviews"
  ADD COLUMN "intervalBefore" INTEGER,
  ADD COLUMN "intervalAfter" INTEGER;
