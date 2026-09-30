/**
 * BuildingEgress — the shared door-bridge contract between
 * EnneadTab-Simulation (producer) and EnneadTab-EnneadCity (consumer).
 *
 * Simulation counts agents crossing each building door per fixed tick and
 * exports a DoorFlowSeries; City maps door positions onto its sidewalk/
 * road graph and spawns kernel-driven pedestrians at the scheduled rates.
 *
 * Everything here is plain data + pure functions: no renderer, no clock
 * reads, no Math.random. Crossing detection is exact float arithmetic, so
 * a series built from a deterministic replay is itself deterministic.
 */
import type { Vec2 } from "./types.js";
/**
 * One building door, modelled as an observation gate: a point on the
 * threshold, the outward unit normal (building interior -> outside), and
 * the clear width in meters. Agents crossing the gate segment within
 * widthMeters/2 of `position` are counted.
 */
export interface DoorFlow {
    doorId: string;
    position: Vec2;
    outwardNormal: Vec2;
    widthMeters: number;
}
/**
 * One scheduled egress window: between startSec and endSec (simulation
 * seconds), pedestrians leave at expectedRatePerMin. The City treats the
 * rate as a Poisson-ish expectation and jitters individual spawns with
 * its own seeded rng — the schedule is a contract, not a replay.
 */
export interface EgressSlot {
    startSec: number;
    endSec: number;
    expectedRatePerMin: number;
}
/** A building's doors plus the schedule the City should honor. */
export interface BuildingEgress {
    buildingId: string;
    doors: DoorFlow[];
    schedule: EgressSlot[];
}
export type CrossingDirection = "out" | "in";
/** One observed door crossing on one tick. */
export interface DoorCrossing {
    doorId: string;
    tick: number;
    timeSec: number;
    agentId: number;
    direction: CrossingDirection;
}
/** Per-tick counts for every door (zero-filled, so the series is dense). */
export interface DoorFlowTick {
    tick: number;
    timeSec: number;
    counts: Record<string, {
        out: number;
        in: number;
    }>;
}
/**
 * The JSON-serializable export Simulation produces and City consumes.
 * `doorIds` is the canonical door order; every tick row carries counts
 * for every door so consumers never have to outer-join.
 */
export interface DoorFlowSeries {
    version: 1;
    buildingId: string;
    tickSec: number;
    totalTicks: number;
    doorIds: string[];
    ticks: DoorFlowTick[];
}
/**
 * Pure crossing test: did the agent's segment from prev -> curr cross the
 * door's gate segment? Returns the direction along the door's outward
 * normal, or null. Deterministic: exact float arithmetic, no branches on
 * anything but the geometry.
 *
 * The gate is the segment of length widthMeters centered on
 * door.position, perpendicular to the outward normal. A crossing counts
 * when the signed distance along the normal changes sign (d0 <= 0 < d1 is
 * "out", d1 <= 0 < d0 is "in") AND the crossing point lands within the
 * gate's half-width.
 */
export declare function detectDoorCrossing(prev: Vec2, curr: Vec2, door: DoorFlow): CrossingDirection | null;
/** Structural validation; returns a list of human-readable errors (empty = valid). */
export declare function validateBuildingEgress(def: unknown): string[];
/**
 * Parse + normalize a BuildingEgress from unknown JSON. Throws on invalid
 * input. Outward normals are normalized to unit length so producers and
 * consumers agree on the gate geometry bit-for-bit.
 */
export declare function parseBuildingEgress(json: unknown): BuildingEgress;
/**
 * Build the dense per-tick series from raw crossings. Pure and
 * deterministic: crossings are sorted by (tick, doorId, agentId,
 * direction) before counting, so producer iteration order cannot leak
 * into the export.
 */
export declare function buildDoorFlowSeries(buildingId: string, doorIds: string[], crossings: DoorCrossing[], tickSec: number, totalTicks: number): DoorFlowSeries;
