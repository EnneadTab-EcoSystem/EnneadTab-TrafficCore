/**
 * Determinism contract — the load-bearing property of this kernel.
 * Same graph + same seed + same dt sequence => byte-identical trajectories.
 * This is what EnneadTab-Simulation's replay guarantee will rest on.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { FixedClock, GraphSteering, hashInts, mulberry32 } from "../dist/index.js";
import type { RoadGraph, SegmentAgent } from "../dist/index.js";

type N = string;

function gridGraph(w: number, h: number): RoadGraph<N> {
  const DIRS = [
    { dx: 1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: -1 },
  ];
  return {
    neighborsOf(node) {
      const [x, z] = node.split(",").map(Number);
      const out: Array<{ dir: number; node: N }> = [];
      DIRS.forEach(({ dx, dz }, dir) => {
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < w && nz >= 0 && nz < h) out.push({ dir, node: `${nx},${nz}` });
      });
      return out;
    },
    positionOf(node) {
      const [x, z] = node.split(",").map(Number);
      return { x: x * 10, z: z * 10 };
    },
    oppositeDir: (d) => (d + 2) % 4,
  };
}

/** One full run: spawn 12 agents from one rng stream, step 300 fixed ticks. */
function run(seed: number): string {
  const rng = mulberry32(hashInts(0xdead, seed));
  const graph = gridGraph(6, 6);
  const steering = new GraphSteering(graph, rng);
  const clock = new FixedClock(1 / 30);
  const agents: SegmentAgent<N>[] = [];
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rng() * 6);
    const z = Math.floor(rng() * 6);
    const edge = steering.pickEdge(`${x},${z}`, null);
    if (!edge) continue;
    agents.push(
      steering.beginSegment({
        kind: i % 3 === 0 ? "pedestrian" : "vehicle",
        id: i,
        from: `${x},${z}`,
        edge,
        speed: 4 + rng() * 6,
        lateral: i % 3 === 0 ? (rng() < 0.5 ? 2.4 : -2.4) : 0,
        progress: rng(),
      }),
    );
  }
  for (let tick = 0; tick < 300; tick++) {
    steering.update(agents, clock.stepSize());
    clock.tick();
  }
  // Strip nothing — serialize the full derived state.
  return JSON.stringify(agents.map((a) => [a.id, a.pos, a.heading, a.progress, a.alive, a.toDir]));
}

test("same seed + FixedClock => byte-identical trajectories", () => {
  const a = run(42);
  const b = run(42);
  assert.equal(a, b);
  assert.ok(a.length > 100, "run should produce real state");
});

test("different seeds => different trajectories", () => {
  assert.notEqual(run(42), run(43));
});

test("FixedClock-driven stepping matches manual dt stepping", () => {
  const mk = (seed: number) => {
    const rng = mulberry32(hashInts(0xbeef, seed));
    return new GraphSteering(gridGraph(4, 4), rng);
  };
  const s1 = mk(7);
  const s2 = mk(7);
  const clock = new FixedClock(0.05);
  const a1 = s1.beginSegment({ kind: "vehicle", id: 1, from: "1,1", edge: { dir: 0, node: "2,1" }, speed: 6, lateral: 0, progress: 0 });
  const a2 = s2.beginSegment({ kind: "vehicle", id: 1, from: "1,1", edge: { dir: 0, node: "2,1" }, speed: 6, lateral: 0, progress: 0 });
  for (let i = 0; i < 40; i++) {
    s1.update([a1], clock.stepSize());
    clock.tick();
    s2.update([a2], 0.05);
  }
  assert.equal(JSON.stringify([a1.pos, a1.heading, a1.progress]), JSON.stringify([a2.pos, a2.heading, a2.progress]));
});
