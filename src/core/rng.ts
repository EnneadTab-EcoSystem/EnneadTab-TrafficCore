/**
 * Deterministic, seeded randomness.
 *
 * mulberry32 is the same tiny generator EnneadTab-Simulation uses
 * (src/core/prng/mulberry32.ts) and EnneadCity ported into web/app/city/prng.ts
 * — it now lives here once, as the single shared source. NEVER Math.random()
 * inside the kernel: Simulation's byte-identical replay contract depends on
 * every draw being reproducible from the seed.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fold an arbitrary list of integers into one 32-bit seed. Order-sensitive
 * on purpose: (worldSeed, q, r) must not collide with (worldSeed, r, q).
 */
export function hashInts(...values: number[]): number {
  let h = 0x811c9dc5; // FNV-1a offset basis
  for (const v of values) {
    const n = v | 0;
    for (let shift = 0; shift < 32; shift += 8) {
      h ^= (n >>> shift) & 0xff;
      h = Math.imul(h, 0x01000193); // FNV prime
    }
  }
  return h >>> 0;
}

/** Ergonomic wrapper around a mulberry32 stream. */
export class SeededRng {
  private readonly fn: Rng;

  constructor(seed: number) {
    this.fn = mulberry32(seed);
  }

  /** Next draw in [0, 1). */
  next(): number {
    return this.fn();
  }

  /** Exposes the raw function for APIs that take an Rng. */
  asFn(): Rng {
    return this.fn;
  }

  range(min: number, max: number): number {
    return min + this.fn() * (max - min);
  }

  int(maxExclusive: number): number {
    return Math.floor(this.fn() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("SeededRng.pick: empty array");
    return items[this.int(items.length)];
  }

  chance(p: number): boolean {
    return this.fn() < p;
  }
}
