/**
 * GraphSteering behavior: edge choice, segment advance, lateral offset math,
 * dead-end handling. Uses a 4-neighborhood grid graph (dirs 0=+x, 1=+z,
 * 2=-x, 3=-z).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { GraphSteering, hashInts, mulberry32, offsetPoint } from "../dist/index.js";
import type { RoadGraph } from "../dist/index.js";

type N = string; // "x,z"

const DIRS = [
  { dx: 1, dz: 0 }, // 0 +x
  { dx: 0, dz: 1 }, // 1 +z
  { dx: -1, dz: 0 }, // 2 -x
  { dx: 0, dz: -1 }, // 3 -z
];

/** Grid graph over [0,w) x [0,h); optional `blocked` set removes nodes. */
function gridGraph(w: number, h: number, blocked: Set<string> = new Set()): RoadGraph<N> {
  const key = (x: number, z: number) => `${x},${z}`;
  return {
    neighborsOf(node) {
      const [x, z] = node.split(",").map(Number);
      const out: Array<{ dir: number; node: N }> = [];
      DIRS.forEach(({ dx, dz }, dir) => {
        const nx = x + dx;
        const nz = z + dz;
        const k = key(nx, nz);
        if (nx >= 0 && nx < w && nz >= 0 && nz < h && !blocked.has(k)) out.push({ dir, node: k });
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

function steering(seed = 1, w = 5, h = 5, blocked?: Set<string>) {
  return new GraphSteering(gridGraph(w, h, blocked), mulberry32(hashInts(0x5eed, seed)));
}

test("offsetPoint: lateral is perpendicular, left-of-travel positive", () => {
  // segment along +z from (0,0) to (0,10)
  const p = offsetPoint({ x: 0, z: 0 }, { x: 0, z: 10 }, 0.5, 2);
  assert.equal(p.x, -2); // left of +z travel is -x
  assert.equal(p.z, 5);
  const q = offsetPoint({ x: 0, z: 0 }, { x: 0, z: 10 }, 0, 0);
  assert.deepEqual(q, { x: 0, z: 0 });
});

test("pickEdge: avoids the reverse direction when alternatives exist", () => {
  const s = steering();
  for (let i = 0; i < 50; i++) {
    const e = s.pickEdge("2,2", 2); // avoid -x
    assert.ok(e && e.dir !== 2, `picked forbidden dir ${e?.dir}`);
  }
});

test("pickEdge: dead end doubles back instead of returning null", () => {
  // 1-wide corridor: node "0,0" in a 1x3 grid has exactly one neighbor
  const s = steering(1, 1, 3);
  const e = s.pickEdge("0,0", 3); // avoid the only way back (-z)... nothing else exists
  assert.ok(e, "dead end must double back, not strand the agent");
  assert.equal(e.dir, 1);
});

test("pickEdge: isolated node returns null", () => {
  const lone = new GraphSteering<string>(
    {
      neighborsOf: () => [],
      positionOf: () => ({ x: 0, z: 0 }),
      oppositeDir: (d) => d,
    },
    mulberry32(1),
  );
  assert.equal(lone.pickEdge("only", null), null);
});

test("beginSegment: agent starts placed on the segment", () => {
  const s = steering();
  const agent = s.beginSegment({
    kind: "vehicle",
    id: 1,
    from: "1,1",
    edge: { dir: 0, node: "2,1" },
    speed: 8,
    lateral: 0,
    progress: 0,
  });
  assert.deepEqual(agent.pos, { x: 10, z: 10 });
  assert.equal(agent.heading, Math.atan2(10, 0)); // +x travel
  assert.equal(agent.segmentLen, 10);
  assert.ok(agent.alive);
});

test("advance: progress grows with speed*dt/len; arrival chains a new edge", () => {
  const s = steering();
  const agent = s.beginSegment({
    kind: "vehicle",
    id: 1,
    from: "1,1",
    edge: { dir: 0, node: "2,1" },
    speed: 10, // segmentLen 10 -> 1.0 progress per second
    lateral: 0,
    progress: 0,
  });
  assert.ok(s.advance(agent, 0.5));
  assert.ok(Math.abs(agent.progress - 0.5) < 1e-12);
  assert.deepEqual(agent.fromNode, "1,1");
  // cross the node: progress resets, agent is now leaving "2,1"
  assert.ok(s.advance(agent, 0.6));
  assert.equal(agent.fromNode, "2,1");
  assert.equal(agent.progress, 0);
  assert.ok(agent.alive);
});

test("advance: genuine dead end kills the agent", () => {
  // corridor 1 wide, 2 long: "0,0" <-> "0,1". Agent at "0,1" heading +z into
  // nothing... build so arrival node is isolated: use a 1x1 graph — the only
  // node has no neighbors, so any arrival is a dead end.
  const dead = new GraphSteering<string>(
    {
      neighborsOf: () => [],
      positionOf: () => ({ x: 0, z: 0 }),
      oppositeDir: (d) => d,
    },
    mulberry32(1),
  );
  const agent = dead.beginSegment({
    kind: "vehicle",
    id: 1,
    from: "a",
    edge: { dir: 0, node: "b" },
    speed: 10,
    lateral: 0,
    progress: 0.99,
  });
  assert.equal(dead.advance(agent, 1), false);
  assert.equal(agent.alive, false);
});

test("update: advances every live agent, skips dead ones", () => {
  const s = steering();
  const mk = (id: number, from: N, dir: number, to: N) =>
    s.beginSegment({ kind: "vehicle", id, from, edge: { dir, node: to }, speed: 10, lateral: 0, progress: 0 });
  const agents = [mk(1, "1,1", 0, "2,1"), mk(2, "3,3", 2, "2,3")];
  agents[0].alive = false;
  s.update(agents, 0.5);
  assert.equal(agents[0].progress, 0); // untouched
  assert.ok(Math.abs(agents[1].progress - 0.5) < 1e-12);
});

test("pedestrian lateral offset rides the sidewalk, not the centerline", () => {
  const s = steering();
  const agent = s.beginSegment({
    kind: "pedestrian",
    id: 7,
    from: "0,0",
    edge: { dir: 1, node: "0,1" }, // +z travel
    speed: 1.5,
    lateral: 2.4, // left of travel -> -x
    progress: 0.5,
  });
  assert.ok(Math.abs(agent.pos.x - -2.4) < 1e-12, `x=${agent.pos.x}`);
  assert.ok(Math.abs(agent.pos.z - 5) < 1e-12, `z=${agent.pos.z}`);
});
