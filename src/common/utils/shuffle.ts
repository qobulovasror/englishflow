/**
 * Unbiased Fisher–Yates shuffle. Returns a new array; the input is not mutated.
 *
 * The common `array.sort(() => Math.random() - 0.5)` idiom looks correct but is
 * biased: V8's sort makes a non-uniform number of comparisons, so some
 * permutations occur far more often than others. For quiz option order that
 * shows through as predictable answer placement.
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
