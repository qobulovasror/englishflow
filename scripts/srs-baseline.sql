-- Run with psql after the interval-metrics migration is deployed:
--   psql "$DATABASE_URL" -v srs_cutover_at='2026-09-30 00:00:00+00' -f scripts/srs-baseline.sql
-- Use a timestamp after all application instances have completed rollout.
-- Rows written by an older instance during rollout have NULL interval data and
-- are excluded as well; a genuine first review has intervalBefore = 0.
\if :{?srs_cutover_at}
\else
  \echo 'Pass -v srs_cutover_at="YYYY-MM-DD HH:MM:SS+00" (time after the full app rollout)'
  \quit 2
\endif

SELECT
  "intervalBefore" AS scheduled_interval_days,
  COUNT(*) AS review_count,
  COUNT(DISTINCT "userId") AS learner_count,
  COUNT(*) FILTER (WHERE rating = 'AGAIN') AS again_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rating <> 'AGAIN') / NULLIF(COUNT(*), 0),
    2
  ) AS recall_success_percent
FROM reviews
WHERE "createdAt" >= :'srs_cutover_at'::timestamptz
  AND "intervalBefore" IS NOT NULL
GROUP BY "intervalBefore"
ORDER BY "intervalBefore";

SELECT
  COUNT(*) AS total_reviews,
  COUNT(DISTINCT "userId") AS learners,
  COUNT(*) FILTER (WHERE rating = 'AGAIN') AS again_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rating <> 'AGAIN') / NULLIF(COUNT(*), 0),
    2
  ) AS recall_success_percent
FROM reviews
WHERE "createdAt" >= :'srs_cutover_at'::timestamptz
  AND "intervalBefore" IS NOT NULL;
