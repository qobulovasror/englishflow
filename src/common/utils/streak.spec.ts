import { computeStreaks } from './streak';

const TODAY = '2026-06-29';

describe('computeStreaks', () => {
  it('returns zeros for no activity', () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single active day that is today', () => {
    expect(computeStreaks([TODAY], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('counts a streak ending today', () => {
    const days = ['2026-06-27', '2026-06-28', '2026-06-29'];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('counts from yesterday when today has no activity', () => {
    const days = ['2026-06-27', '2026-06-28'];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it('reports a broken streak as 0 when neither today nor yesterday active', () => {
    const days = ['2026-06-25', '2026-06-26'];
    expect(computeStreaks(days, TODAY)).toMatchObject({ current: 0 });
  });

  it('normalises unsorted input with duplicates', () => {
    const days = [
      '2026-06-29',
      '2026-06-27',
      '2026-06-29',
      '2026-06-28',
      '2026-06-27',
    ];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('finds the longest run even when it is not the current one', () => {
    // A 4-day run in the past, then a gap, then a 2-day run ending today.
    const days = [
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-28',
      '2026-06-29',
    ];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 2, longest: 4 });
  });

  it('treats a gap as breaking the current streak', () => {
    const days = ['2026-06-26', '2026-06-28', '2026-06-29'];
    // 26 -> (gap on 27) -> 28, 29: current run is just 28+29 = 2.
    expect(computeStreaks(days, TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it('handles a single active day far in the past', () => {
    expect(computeStreaks(['2026-01-01'], TODAY)).toEqual({
      current: 0,
      longest: 1,
    });
  });

  it('counts a single active yesterday', () => {
    expect(computeStreaks(['2026-06-28'], TODAY)).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it('crosses a month boundary correctly', () => {
    const today = '2026-07-01';
    const days = ['2026-06-29', '2026-06-30', '2026-07-01'];
    expect(computeStreaks(days, today)).toEqual({ current: 3, longest: 3 });
  });
});
