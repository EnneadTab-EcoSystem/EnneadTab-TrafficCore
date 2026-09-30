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
export declare function mulberry32(seed: number): Rng;
/**
 * Fold an arbitrary list of integers into one 32-bit seed. Order-sensitive
 * on purpose: (worldSeed, q, r) must not collide with (worldSeed, r, q).
 */
export declare function hashInts(...values: number[]): number;
/** Ergonomic wrapper around a mulberry32 stream. */
export declare class SeededRng {
    private readonly fn;
    constructor(seed: number);
    /** Next draw in [0, 1). */
    next(): number;
    /** Exposes the raw function for APIs that take an Rng. */
    asFn(): Rng;
    range(min: number, max: number): number;
    int(maxExclusive: number): number;
    pick<T>(items: readonly T[]): T;
    chance(p: number): boolean;
}
