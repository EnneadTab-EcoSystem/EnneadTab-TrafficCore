"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallClock = exports.FixedClock = void 0;
class FixedClock {
    constructor(dt) {
        this.dt = dt;
        this.t = 0;
        if (!(dt > 0))
            throw new Error("FixedClock: dt must be > 0");
    }
    now() {
        return this.t;
    }
    stepSize() {
        return this.dt;
    }
    /** Advance by `steps` fixed ticks; returns the new time. */
    tick(steps = 1) {
        this.t += this.dt * steps;
        return this.t;
    }
    reset() {
        this.t = 0;
    }
}
exports.FixedClock = FixedClock;
class WallClock {
    constructor() {
        this.t0 = Date.now() / 1000;
    }
    now() {
        return Date.now() / 1000 - this.t0;
    }
}
exports.WallClock = WallClock;
