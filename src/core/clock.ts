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

export class FixedClock implements Clock {
  private t = 0;

  constructor(private readonly dt: number) {
    if (!(dt > 0)) throw new Error("FixedClock: dt must be > 0");
  }

  now(): number {
    return this.t;
  }

  stepSize(): number {
    return this.dt;
  }

  /** Advance by `steps` fixed ticks; returns the new time. */
  tick(steps = 1): number {
    this.t += this.dt * steps;
    return this.t;
  }

  reset(): void {
    this.t = 0;
  }
}

export class WallClock implements Clock {
  private readonly t0: number = Date.now() / 1000;

  now(): number {
    return Date.now() / 1000 - this.t0;
  }
}
