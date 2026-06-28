import {
  sm2,
  Rating,
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
} from './sm2';

const NOW = new Date('2026-06-14T00:00:00.000Z');

const fresh = () => ({
  repetitionCount: 0,
  easeFactor: DEFAULT_EASE_FACTOR,
  interval: 0,
  lapses: 0,
});

const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));

describe('sm2', () => {
  it('schedules a brand-new GOOD card 1 day out', () => {
    const r = sm2(fresh(), Rating.GOOD, NOW);
    expect(r.repetitionCount).toBe(1);
    expect(r.interval).toBe(1);
    expect(daysBetween(NOW, r.nextReviewAt)).toBe(1);
  });

  it('uses the canonical 1 -> 6 -> interval*EF progression', () => {
    const first = sm2(fresh(), Rating.GOOD, NOW);
    expect(first.interval).toBe(1);

    const second = sm2(first, Rating.GOOD, NOW);
    expect(second.interval).toBe(6);
    expect(second.repetitionCount).toBe(2);

    const third = sm2(second, Rating.GOOD, NOW);
    expect(third.interval).toBe(Math.round(6 * second.easeFactor));
  });

  it('resets the streak and re-learns on AGAIN', () => {
    const mature = {
      repetitionCount: 4,
      easeFactor: 2.5,
      interval: 30,
      lapses: 0,
    };
    const r = sm2(mature, Rating.AGAIN, NOW);
    expect(r.repetitionCount).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.lapses).toBe(1);
  });

  it('does not count a lapse for a never-graduated card', () => {
    const r = sm2(fresh(), Rating.AGAIN, NOW);
    expect(r.lapses).toBe(0);
    expect(r.interval).toBe(1);
  });

  it('keeps GOOD ease-factor stable (q=4)', () => {
    const r = sm2(fresh(), Rating.GOOD, NOW);
    expect(r.easeFactor).toBeCloseTo(DEFAULT_EASE_FACTOR, 5);
  });

  it('raises ease-factor on EASY and lowers it on HARD', () => {
    const easy = sm2(fresh(), Rating.EASY, NOW);
    const hard = sm2(fresh(), Rating.HARD, NOW);
    expect(easy.easeFactor).toBeGreaterThan(DEFAULT_EASE_FACTOR);
    expect(hard.easeFactor).toBeLessThan(DEFAULT_EASE_FACTOR);
  });

  it('clamps ease-factor to the 1.3 floor under repeated AGAIN/HARD', () => {
    let state = fresh();
    for (let i = 0; i < 20; i++) {
      state = sm2(state, Rating.AGAIN, NOW);
    }
    expect(state.easeFactor).toBe(MIN_EASE_FACTOR);
  });
});
