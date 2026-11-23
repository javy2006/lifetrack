export type Rng = () => number;

/** Small, fast, deterministic PRNG (mulberry32). Same seed, same sequence. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle driven by the supplied RNG. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const held = result[i];
    result[i] = result[j];
    result[j] = held;
  }
  return result;
}

/** Creates a fresh seed for a new game. Only used outside the pure engine. */
export function createSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
