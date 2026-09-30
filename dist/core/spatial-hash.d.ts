/**
 * Uniform-grid spatial hash for neighbor queries.
 *
 * The current GraphSteering backend is purely kinematic (no inter-agent
 * avoidance — same as EnneadCity's honest MVP), so nothing in Phase 1
 * *requires* this. It exists so Phase 2 (car-following / pedestrian
 * separation, Simulation crowd density queries) doesn't reinvent it, and so
 * both consumers share one tested implementation.
 */
export declare class SpatialHash {
    private readonly cellSize;
    private readonly cells;
    constructor(cellSize: number);
    private key;
    clear(): void;
    insert(id: number, x: number, z: number): void;
    /** Rebuild from a list of agents in one pass (typical per-tick usage). */
    rebuild(entries: ReadonlyArray<{
        id: number;
        x: number;
        z: number;
    }>): void;
    get size(): number;
    /**
     * Ids within `radius` of (x, z), exact Euclidean filter (grid is only the
     * broadphase). `excludeId` skips one id (usually the querying agent).
     */
    query(x: number, z: number, radius: number, excludeId?: number): number[];
}
