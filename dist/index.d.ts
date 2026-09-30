/**
 * @enneadtab/traffic-core — shared renderer-agnostic agent-traffic kernel.
 *
 * Phase 1 (this repo): deterministic agent lifecycle primitives + a
 * graph-following steering backend extracted from EnneadCity's traffic/
 * transit systems. EnneadCity consumes GraphSteering; EnneadTab-Simulation
 * will add a Detour-navmesh backend in Phase 2 behind the same
 * SteeringBackend interface.
 *
 * Phase 3 (0.2.0): the BuildingEgress door-bridge contract — Simulation
 * counts door crossings per tick and exports a DoorFlowSeries; City maps
 * doors onto its sidewalk graph and spawns pedestrians at the scheduled
 * rates. Pure data + pure functions in core/egress.ts.
 *
 * Hard rule: NOTHING in src/ may import a renderer, a DOM API, or read
 * wall-clock/time entropy directly. Randomness comes from SeededRng,
 * time from an injected Clock. That is what makes Simulation's
 * byte-identical replay contract achievable on top of this kernel.
 */
export type { Vec2, AgentKind, SegmentAgent } from "./core/types.js";
export { mulberry32, hashInts, SeededRng } from "./core/rng.js";
export type { Rng } from "./core/rng.js";
export { FixedClock, WallClock } from "./core/clock.js";
export type { Clock } from "./core/clock.js";
export { SpatialHash } from "./core/spatial-hash.js";
export type { SteeringBackend } from "./steering/backend.js";
export { GraphSteering, offsetPoint } from "./steering/graph-steering.js";
export type { RoadGraph, SegmentSpec } from "./steering/graph-steering.js";
export { detectDoorCrossing, validateBuildingEgress, parseBuildingEgress, buildDoorFlowSeries, } from "./core/egress.js";
export type { DoorFlow, EgressSlot, BuildingEgress, CrossingDirection, DoorCrossing, DoorFlowTick, DoorFlowSeries, } from "./core/egress.js";
