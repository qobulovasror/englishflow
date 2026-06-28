-- AlterTable
ALTER TABLE "test_questions" ALTER COLUMN "selectedAnswer" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_words" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "words" ALTER COLUMN "updatedAt" DROP DEFAULT;
