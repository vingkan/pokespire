/**
 * Seeded RNG for deterministic card drafting.
 * Uses a simple linear congruential generator (LCG).
 */

/**
 * Create a seeded random number generator.
 * Returns a function that generates numbers in [0, 1).
 */
export function createRng(seed: number): () => number {
  let state = seed;

  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Sample n items from an array without replacement.
 */
export function sampleCards<T>(rng: () => number, pool: T[], count: number): T[] {
  if (count >= pool.length) {
    return [...pool];
  }

  const poolCopy = [...pool];
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor(rng() * poolCopy.length);
    result.push(poolCopy[index]);
    poolCopy.splice(index, 1);
  }

  return result;
}

/**
 * Advance the RNG state by n steps.
 * Useful for skipping ahead in the sequence.
 */
export function advanceRng(rng: () => number, n: number): void {
  for (let i = 0; i < n; i++) {
    rng();
  }
}
