-- Add a client supplied idempotency key so offline retries cannot grade twice.
ALTER TABLE "reviews" ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "reviews_requestId_key" ON "reviews"("requestId");
