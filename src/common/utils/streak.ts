/**
 * Daily-streak computation over a set of active days.
 *
 * Each "active day" is a UTC calendar date string (`YYYY-MM-DD`) on which the
 * user did at least one review. The input may be unsorted and contain
 * duplicates — it is normalised internally.
 *
 *   current  consecutive active days ending at "today". Counted from today if
 *            today is active; otherwise from yesterday (so a streak that simply
 *            hasn't been continued yet today is not reported as broken). If
 *            neither today nor yesterday is active, the current streak is 0.
 *   longest  the longest consecutive run of active days anywhere in the set.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days between two `YYYY-MM-DD` strings (b - a), using UTC midnight. */
function dayDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00.000Z`);
  const tb = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((tb - ta) / MS_PER_DAY);
}

/** Shift a `YYYY-MM-DD` string by `delta` days. */
function shiftDay(day: string, delta: number): string {
  const t = Date.parse(`${day}T00:00:00.000Z`) + delta * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

export function computeStreaks(
  activeDays: string[],
  today: string,
): { current: number; longest: number } {
  const unique = [...new Set(activeDays)].sort();

  if (unique.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Longest run anywhere: walk the sorted unique days, extending the run while
  // each day is exactly one after the previous.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (dayDiff(unique[i - 1], unique[i]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  // Current streak: pick the anchor (today if active, else yesterday if active),
  // then count consecutive active days backwards from it.
  const active = new Set(unique);
  let anchor: string | null = null;
  if (active.has(today)) {
    anchor = today;
  } else if (active.has(shiftDay(today, -1))) {
    anchor = shiftDay(today, -1);
  }

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (active.has(cursor)) {
      current += 1;
      cursor = shiftDay(cursor, -1);
    }
  }

  return { current, longest };
}
