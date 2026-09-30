/** SpatialHash: exact-radius neighbor queries across cell boundaries. */
import assert from "node:assert/strict";
import test from "node:test";

import { SpatialHash } from "../dist/index.js";

test("query finds nearby ids and excludes distant ones", () => {
  const h = new SpatialHash(10);
  h.insert(1, 0, 0);
  h.insert(2, 3, 4); // distance 5
  h.insert(3, 100, 100);
  assert.deepEqual(h.query(0, 0, 5).sort(), [1, 2]);
  assert.deepEqual(h.query(0, 0, 4.9), [1]);
});

test("query works across cell boundaries", () => {
  const h = new SpatialHash(10);
  h.insert(1, 9.9, 0); // cell 0
  h.insert(2, 10.1, 0); // cell 1 — only 0.2 away
  assert.deepEqual(h.query(9.9, 0, 1).sort(), [1, 2]);
});

test("query honors excludeId", () => {
  const h = new SpatialHash(10);
  h.insert(1, 0, 0);
  h.insert(2, 1, 0);
  assert.deepEqual(h.query(0, 0, 5, 1), [2]);
});

test("radius 0 matches only the exact point", () => {
  const h = new SpatialHash(10);
  h.insert(1, 5, 5);
  h.insert(2, 5.001, 5);
  assert.deepEqual(h.query(5, 5, 0), [1]);
});

test("rebuild replaces contents; size tracks entries", () => {
  const h = new SpatialHash(10);
  h.rebuild([
    { id: 1, x: 0, z: 0 },
    { id: 2, x: 50, z: 50 },
  ]);
  assert.equal(h.size, 2);
  assert.deepEqual(h.query(0, 0, 1), [1]);
  h.rebuild([]);
  assert.equal(h.size, 0);
  assert.deepEqual(h.query(0, 0, 1000), []);
});

test("constructor rejects non-positive cellSize", () => {
  assert.throws(() => new SpatialHash(0), /cellSize must be > 0/);
});
