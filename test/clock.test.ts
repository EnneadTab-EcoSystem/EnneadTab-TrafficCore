/** Clock contract: FixedClock is exactly reproducible, WallClock just moves forward. */
import assert from "node:assert/strict";
import test from "node:test";

import { FixedClock, WallClock } from "../dist/index.js";

test("FixedClock: ticks accumulate exactly", () => {
  const clock = new FixedClock(0.25);
  assert.equal(clock.now(), 0);
  assert.equal(clock.stepSize(), 0.25);
  clock.tick();
  assert.equal(clock.now(), 0.25);
  clock.tick(3);
  assert.equal(clock.now(), 1);
});

test("FixedClock: reset returns to zero", () => {
  const clock = new FixedClock(0.1);
  clock.tick(10);
  clock.reset();
  assert.equal(clock.now(), 0);
});

test("FixedClock: rejects non-positive dt", () => {
  assert.throws(() => new FixedClock(0), /dt must be > 0/);
  assert.throws(() => new FixedClock(-1), /dt must be > 0/);
});

test("WallClock: starts at ~0 and never goes backwards", () => {
  const clock = new WallClock();
  const t0 = clock.now();
  assert.ok(t0 >= 0 && t0 < 5, `unexpected start: ${t0}`);
  const t1 = clock.now();
  assert.ok(t1 >= t0);
});
