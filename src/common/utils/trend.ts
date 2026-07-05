/**
 * Daily-count bucketing into a dense series. Shared by the review-trends
 * endpoint and the admin signup-trend endpoint.
 *
 * Given a set of review timestamps and the current UTC day, produces a DENSE
 * series of `{ date, count }` points — one for every day in the trailing
 * `days`-long window ending at `todayUtc`, oldest→newest. Days with no activity
 * are zero-filled so the client can render a continuous chart without
 * reconstructing the calendar itself.
 *
 * Each timestamp is bucketed by its UTC calendar date (`YYYY-MM-DD`).
 * Timestamps falling outside the window are ignored.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Shift a `YYYY-MM-DD` string by `delta` days, staying on UTC midnight. */
function shiftDay(day: string, delta: number): string {
  const t = Date.parse(`${day}T00:00:00.000Z`) + delta * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

export function bucketByDay(
  timestamps: Date[],
  todayUtc: string,
  days: number,
): { date: string; count: number }[] {
  // Tally activity per UTC day from the raw timestamps.
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const day = ts.toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  // Emit one slot per day across the window, oldest first. The window spans
  // `days` calendar days ending at (and including) `todayUtc`.
  const series: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDay(todayUtc, -i);
    series.push({ date, count: counts.get(date) ?? 0 });
  }

  return series;
}
