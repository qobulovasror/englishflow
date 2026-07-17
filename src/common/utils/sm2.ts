/**
 * SM-2 spaced-repetition algorithm (SuperMemo 2), Anki-style 4-button variant.
 *
 * The user grades each review with one of four ratings. AGAIN means the answer
 * was not recalled (a lapse); HARD/GOOD/EASY are successful recalls of varying
 * confidence, mapped to SM-2 response qualities 3/4/5.
 *
 *   reps        SM-2 `n` — consecutive successful reviews (resets to 0 on AGAIN)
 *   easeFactor  SM-2 `EF` — starts at 2.5, clamped to a 1.3 floor
 *   interval    current scheduling gap in whole days
 *   lapses      number of times the card was failed after reaching interval >= 1
 *
 * Reference: https://super-memory.com/english/ol/sm2.htm
 */

export enum Rating {
  AGAIN = 'AGAIN',
  HARD = 'HARD',
  GOOD = 'GOOD',
  EASY = 'EASY',
}

/** Map a button rating to the SM-2 response quality q (0..5). */
const QUALITY: Record<Rating, number> = {
  [Rating.AGAIN]: 0,
  [Rating.HARD]: 3,
  [Rating.GOOD]: 4,
  [Rating.EASY]: 5,
};

export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;

// Anki-style lapse penalty applied to the ease factor on AGAIN. The raw SM-2
// formula for q=0 subtracts 0.8 per lapse, which slams a card to the 1.3 floor
// after two failures and is far harsher than modern SRS schedulers.
export const LAPSE_EASE_PENALTY = 0.2;

// After a failed recall the card re-enters a short relearning step instead of
// disappearing until tomorrow (raw SM-2 would set interval = 1 day). Expressed
// in minutes; `interval` stays 0 (sub-day) so the card is due again this session.
export const RELEARN_STEP_MINUTES = 10;

export interface Sm2State {
  repetitionCount: number;
  easeFactor: number;
  interval: number;
  lapses: number;
}

export interface Sm2Result extends Sm2State {
  /** Days from `now` until the card is next due. */
  interval: number;
  nextReviewAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * Compute the next SM-2 state for a card given the user's rating.
 *
 * `now` is injected so callers (and tests) control the clock — the project bans
 * argless `new Date()` in some contexts and this keeps the function pure.
 */
export function sm2(state: Sm2State, rating: Rating, now: Date): Sm2Result {
  const q = QUALITY[rating];
  let { repetitionCount, easeFactor, interval, lapses } = state;

  if (q < 3) {
    // Failed recall: reset the streak and drop into a short relearning step
    // (interval 0 => due again in RELEARN_STEP_MINUTES, not tomorrow). Count a
    // lapse only if the card had actually graduated (interval >= 1). Apply a
    // mild, fixed ease penalty rather than the punishing raw SM-2 q=0 formula.
    if (interval >= 1) lapses += 1;
    repetitionCount = 0;
    interval = 0;
    easeFactor -= LAPSE_EASE_PENALTY;
  } else {
    if (repetitionCount === 0) {
      interval = 1;
    } else if (repetitionCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitionCount += 1;
    // EF update on success uses the graded quality directly (SM-2).
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }

  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

  const nextReviewAt =
    interval >= 1
      ? new Date(now.getTime() + interval * MS_PER_DAY)
      : new Date(now.getTime() + RELEARN_STEP_MINUTES * MS_PER_MINUTE);

  return { repetitionCount, easeFactor, interval, lapses, nextReviewAt };
}
