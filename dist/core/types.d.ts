/** Plain 2D math — the core never touches a renderer vector type. Callers
 *  adapt at the boundary (e.g. Babylon's Vector3 -> {x, z}). */
export interface Vec2 {
    x: number;
    z: number;
}
export type AgentKind = "vehicle" | "pedestrian";
/**
 * One simulated agent on a road-graph segment. `pos`/`heading` are DERIVED
 * by the steering backend on every advance() — callers must treat them as
 * read-only and re-render from them, never write them.
 */
export interface SegmentAgent<N = unknown> {
    id: number;
    kind: AgentKind;
    /** Routing endpoints in the backend's graph node type. */
    fromNode: N;
    toNode: N;
    toDir: number;
    /** Segment endpoints in world units (from positionOf). */
    from: Vec2;
    to: Vec2;
    segmentLen: number;
    /** 0..1 along the current segment. */
    progress: number;
    /** World units per second. */
    speed: number;
    /** Signed perpendicular offset from the segment centerline
     *  (positive = left of travel). Pedestrians use this for sidewalks. */
    lateral: number;
    /** Derived world position (includes lateral offset). */
    pos: Vec2;
    /** Derived heading, radians, atan2(dx, dz) convention. */
    heading: number;
    /** False once the agent reaches a genuine dead end; the caller despawns. */
    alive: boolean;
}
