/**
 * Injected time sources. Simulation loops must NEVER read Date.now() or
 * performance.now() directly — always go through a Clock.
 *
 * - FixedClock: fixed-dt stepping. This is what makes Simulation's
 *   byte-identical replay contract possible: same seed + same step count =
 *   same trajectory, on any machine.
 * - WallClock: live ambient sims (EnneadCity traffic). Same interface, no
 *   determinism promise.
 */
export interface Clock {
    /** Seconds since an arbitrary epoch (construction for WallClock, 0 for FixedClock). */
    now(): number;
}
export declare class FixedClock implements Clock {
    private readonly dt;
    private t;
    constructor(dt: number);
    now(): number;
    stepSize(): number;
    /** Advance by `steps` fixed ticks; returns the new time. */
    tick(steps?: number): number;
    reset(): void;
}
export declare class WallClock implements Clock {
    private readonly t0;
    now(): number;
}
