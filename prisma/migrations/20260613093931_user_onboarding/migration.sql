-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" "CefrLevel",
ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- Backfill: existing accounts predate onboarding, so mark them as already
-- onboarded (using their signup time) to avoid forcing them through the flow.
UPDATE "users" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
