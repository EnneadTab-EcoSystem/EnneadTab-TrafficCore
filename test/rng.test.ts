/** Seeded RNG contract: reproducible streams, no hidden entropy. */
import assert from "node:assert/strict";
import test from "node:test";

import { hashInts, mulberry32, SeededRng } from "../dist/index.js";

test("mulberry32: same seed -> identical stream", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  for (let i = 0; i < 200; i++) assert.equal(a(), b());
});

test("mulberry32: draws are in [0, 1)", () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("mulberry32: different seeds -> different streams", () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  let same = 0;
  for (let i = 0; i < 50; i++) if (a() === b()) same++;
  assert.ok(same < 50, "streams should differ");
});

test("hashInts: deterministic and order-sensitive", () => {
  assert.equal(hashInts(1, 2, 3), hashInts(1, 2, 3));
  assert.notEqual(hashInts(1, 2, 3), hashInts(3, 2, 1));
  assert.notEqual(hashInts(10), hashInts(11));
});

test("SeededRng: range/int/pick/chance behave", () => {
  const rng = new SeededRng(99);
  for (let i = 0; i < 200; i++) {
    const v = rng.range(5, 10);
    assert.ok(v >= 5 && v < 10);
    assert.ok(rng.int(4) >= 0 && rng.int(4) < 4);
  }
  const items = ["a", "b", "c"] as const;
  for (let i = 0; i < 50; i++) assert.ok((items as readonly string[]).includes(rng.pick(items)));
  let trues = 0;
  for (let i = 0; i < 1000; i++) if (rng.chance(0.5)) trues++;
  assert.ok(trues > 350 && trues < 650, `suspicious split: ${trues}/1000`);
});

test("SeededRng: same seed -> same convenience draws", () => {
  const a = new SeededRng(4242);
  const b = new SeededRng(4242);
  for (let i = 0; i < 100; i++) assert.equal(a.range(0, 100), b.range(0, 100));
});
