import { bucketByDay } from './trend';

const TODAY = '2026-06-29';

/** A Date at noon UTC on the given `YYYY-MM-DD` (mid-day avoids TZ edge cases). */
function at(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

describe('bucketByDay', () => {
  it('returns a dense zero-filled window when there is no activity', () => {
    const series = bucketByDay([], TODAY, 7);

    expect(series).toHaveLength(7);
    expect(series.every((p) => p.count === 0)).toBe(true);
    expect(series[0].date).toBe('2026-06-23');
    expect(series[6].date).toBe('2026-06-29');
  });

  it('is ordered oldest→newest and spans exactly `days` entries', () => {
    const series = bucketByDay([], TODAY, 30);

    expect(series).toHaveLength(30);
    expect(series[0].date).toBe('2026-05-31');
    expect(series[29].date).toBe(TODAY);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].date > series[i - 1].date).toBe(true);
    }
  });

  it('zero-fills gaps between active days', () => {
    const series = bucketByDay([at('2026-06-27'), at('2026-06-29')], TODAY, 5);

    expect(series).toEqual([
      { date: '2026-06-25', count: 0 },
      { date: '2026-06-26', count: 0 },
      { date: '2026-06-27', count: 1 },
      { date: '2026-06-28', count: 0 },
      { date: '2026-06-29', count: 1 },
    ]);
  });

  it('counts multiple reviews on the same day', () => {
    const series = bucketByDay(
      [at('2026-06-29'), at('2026-06-29'), at('2026-06-29')],
      TODAY,
      3,
    );

    expect(series[2]).toEqual({ date: '2026-06-29', count: 3 });
    expect(series[0].count).toBe(0);
    expect(series[1].count).toBe(0);
  });

  it('ignores timestamps outside the window (boundary)', () => {
    // Window of 3 days ending today: 2026-06-27, -28, -29.
    // The day before the window start (-26) must not be counted.
    const series = bucketByDay(
      [at('2026-06-26'), at('2026-06-27')],
      TODAY,
      3,
    );

    expect(series).toEqual([
      { date: '2026-06-27', count: 1 },
      { date: '2026-06-28', count: 0 },
      { date: '2026-06-29', count: 0 },
    ]);
  });

  it('handles a single-day window', () => {
    expect(bucketByDay([at(TODAY)], TODAY, 1)).toEqual([
      { date: TODAY, count: 1 },
    ]);
  });

  it('crosses a month boundary correctly', () => {
    const series = bucketByDay([at('2026-06-30')], '2026-07-01', 3);

    expect(series).toEqual([
      { date: '2026-06-29', count: 0 },
      { date: '2026-06-30', count: 1 },
      { date: '2026-07-01', count: 0 },
    ]);
  });
});
