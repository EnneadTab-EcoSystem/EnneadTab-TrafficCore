import type { Rng } from "../core/rng.js";
import type { AgentKind, SegmentAgent, Vec2 } from "../core/types.js";
import type { SteeringBackend } from "./backend.js";
/**
 * Minimal road-network contract. N is the node type (EnneadCity: Axial hex
 * cell). The backend never interprets N — all geometry flows through
 * positionOf, all topology through neighborsOf/oppositeDir.
 */
export interface RoadGraph<N> {
    neighborsOf(node: N): Array<{
        dir: number;
        node: N;
    }>;
    positionOf(node: N): Vec2;
    oppositeDir(dir: number): number;
}
export interface SegmentSpec<N> {
    kind: AgentKind;
    id: number;
    from: N;
    edge: {
        dir: number;
        node: N;
    };
    /** World units per second. */
    speed: number;
    /** Signed perpendicular offset from the centerline (pedestrian sidewalks). */
    lateral: number;
    /** 0..1 start position — callers stagger with their own rng draw. */
    progress: number;
}
/**
 * Point on a segment with a signed perpendicular offset.
 * Identical to EnneadCity's computeLateral: left-of-travel normal * lateral.
 */
export declare function offsetPoint(from: Vec2, to: Vec2, t: number, lateral: number): Vec2;
/**
 * Path-following steering on a discrete road graph — the extracted
 * EnneadCity traffic/transit behavior, generalized off Babylon types:
 *
 * - each agent walks segments node-to-node at constant speed;
 * - at every arrival it picks a random non-reversing edge
 *   (dead ends may double back);
 * - pedestrians ride a lateral sidewalk offset, vehicles the centerline;
 * - purely kinematic: no inter-agent yielding or collision avoidance
 *   (the City's documented honest MVP — escalate in Phase 2 with SpatialHash
 *   + a car-following model, not here).
 *
 * Determinism: given the same graph, same rng stream, and same dt sequence,
 * update() produces bit-identical agent states. The backend holds NO
 * hidden entropy — rng is injected, time is the caller's dt.
 */
export declare class GraphSteering<N> implements SteeringBackend<SegmentAgent<N>> {
    private readonly graph;
    private readonly rng;
    constructor(graph: RoadGraph<N>, rng: Rng);
    /** Random non-reversing edge out of `node`; null when the node is isolated. */
    pickEdge(node: N, avoidDir: number | null): {
        dir: number;
        node: N;
    } | null;
    /** Build an agent already placed on `spec.edge` out of `spec.from`. */
    beginSegment(spec: SegmentSpec<N>): SegmentAgent<N>;
    /**
     * Advance one agent by dt. Returns false when it reached a genuine dead
     * end (no edges at all from the arrival node) — the caller despawns it.
     */
    advance(agent: SegmentAgent<N>, dt: number): boolean;
    update(agents: SegmentAgent<N>[], dt: number): void;
    /** Recompute pos/heading from the agent's segment + progress. Public so
     *  callers can re-place after externally moving an agent (e.g. teleports). */
    place(agent: SegmentAgent<N>): void;
}
