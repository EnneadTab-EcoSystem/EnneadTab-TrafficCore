# @enneadtab/traffic-core

Shared **renderer-agnostic agent-traffic kernel** for EnneadTab-EcoSystem —
the modular foundation that lets `EnneadCity` (web, Babylon) and
`EnneadTab-Simulation` (desktop, Electron) run traffic/pedestrian agents on
the same tested core instead of two divergent ports.

Follows the ecosystem's shared-package pattern (`@enneadtab/assistant-core`):
consumed as a git dependency, pure TypeScript, zero renderer dependencies.

## What's inside

```
src/
  core/
    types.ts         Vec2, AgentKind, SegmentAgent — plain-data agent shape
    rng.ts           mulberry32 + hashInts + SeededRng (the ONE shared PRNG;
                     both consumers previously ported this independently)
    clock.ts         Clock interface; FixedClock (deterministic replay) and
                     WallClock (live ambient sims)
    spatial-hash.ts  uniform-grid neighbor queries (Phase 2 car-following /
                     crowd density; not required by Phase 1 steering)
  steering/
    backend.ts       SteeringBackend — the narrow interface every movement
                     model implements: update(agents, dt)
    graph-steering.ts GraphSteering — path-following on a discrete road graph,
                     extracted from EnneadCity's traffic/transit systems
```

## The one hard rule

**Nothing in `src/` may import a renderer, touch the DOM, call `Math.random()`,
or read wall-clock time.** Randomness comes from an injected `Rng`, time from
an injected `Clock` / the caller's `dt`. This is what makes
EnneadTab-Simulation's byte-identical replay contract achievable on top of
this kernel: same seed + same `dt` sequence ⇒ bit-identical trajectories
(proven by `test/determinism.test.ts`).

## Usage (EnneadCity pattern)

```ts
import {
  GraphSteering, mulberry32, hashInts,
  type RoadGraph, type SegmentAgent,
} from "@enneadtab/traffic-core";

// 1. Adapt your graph (here: a hex road graph) to the narrow contract.
const graph: RoadGraph<MyNode> = {
  neighborsOf: (n) => roadGraph.neighborsOf(n),          // [{dir, node}]
  positionOf: (n) => { const w = axialToWorld(n); return { x: w.x, z: w.z }; },
  oppositeDir: (d) => oppositeDir(d),
};

// 2. One rng stream per system, seeded — never Math.random().
const steering = new GraphSteering(graph, mulberry32(hashInts(0xa77c1c, 1)));

// 3. Spawn: pick an edge, then begin a segment. Spawn *policy* (counts,
//    radii, templates) stays in the consumer.
const edge = steering.pickEdge(cell, null);
const agent: SegmentAgent<MyNode> = steering.beginSegment({
  kind: "vehicle", id: nextId++, from: cell, edge,
  speed: 8, lateral: 0, progress: rng(), // stagger with your own draw
});

// 4. Tick: advance, then render from the DERIVED pos/heading.
//    Thin adapter at the boundary: Babylon Vector3 <-> {x, z}.
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
  steering.update(agents, dt);
  for (const a of agents) {
    node.position.set(a.pos.x, GROUND_Y, a.pos.z);
    node.rotation.y = a.heading;
  }
  // despawn: agents flagged alive=false reached a genuine dead end
});
```

## Consuming as a git dependency

```json
"@enneadtab/traffic-core": "github:EnneadTab-EcoSystem/EnneadTab-TrafficCore#<sha>"
```

`dist/` is committed (built with `tsc`), so no consumer-side build step or
`transpilePackages` is needed — `main`/`types` point at `dist`. `npm test`
builds first, so tests always run against the published artifact.

Note: `npm ci` does not verify integrity for git deps — hand-editing the
lockfile's resolved SHAs for this package is safe.

## Roadmap

- **Phase 1 (this repo, done):** kernel primitives + `GraphSteering`;
  EnneadCity's traffic/transit rewired onto it with identical behavior.
- **Phase 2 — Simulation re-expression:** add a `NavmeshSteering` backend
  wrapping Detour Crowd behind `SteeringBackend`; re-express
  EnneadTab-Simulation's agent update against `SegmentAgent`/`SeededRng`/
  `FixedClock` so indoor crowd scenarios gain the byte-identical replay
  contract from this kernel instead of a local port.
- **Phase 3 — BuildingEgress door bridge:** versioned JSON protocol
  `BuildingEgress { buildingId, doors[], schedule[] }` — Simulation exports
  interior egress for a landmark building, EnneadCity spawns it as sidewalk
  pedestrians at the claimed plot's doors. (The crowd spilling out of the
  stadium onto city streets.)
- **Later:** car-following / separation steering on top of `SpatialHash`
  (escalation path for the current purely-kinematic MVP).

## Development

```bash
npm install
npm test        # builds dist, then runs node:test against it
npm run typecheck
```
