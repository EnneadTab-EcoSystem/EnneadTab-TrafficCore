/**
 * Uniform-grid spatial hash for neighbor queries.
 *
 * The current GraphSteering backend is purely kinematic (no inter-agent
 * avoidance — same as EnneadCity's honest MVP), so nothing in Phase 1
 * *requires* this. It exists so Phase 2 (car-following / pedestrian
 * separation, Simulation crowd density queries) doesn't reinvent it, and so
 * both consumers share one tested implementation.
 */

interface Entry {
  id: number;
  x: number;
  z: number;
}

export class SpatialHash {
  private readonly cells = new Map<string, Entry[]>();

  constructor(private readonly cellSize: number) {
    if (!(cellSize > 0)) throw new Error("SpatialHash: cellSize must be > 0");
  }

  private key(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(id: number, x: number, z: number): void {
    const k = this.key(x, z);
    let bucket = this.cells.get(k);
    if (!bucket) {
      bucket = [];
      this.cells.set(k, bucket);
    }
    bucket.push({ id, x, z });
  }

  /** Rebuild from a list of agents in one pass (typical per-tick usage). */
  rebuild(entries: ReadonlyArray<{ id: number; x: number; z: number }>): void {
    this.clear();
    for (const e of entries) this.insert(e.id, e.x, e.z);
  }

  get size(): number {
    let n = 0;
    for (const bucket of this.cells.values()) n += bucket.length;
    return n;
  }

  /**
   * Ids within `radius` of (x, z), exact Euclidean filter (grid is only the
   * broadphase). `excludeId` skips one id (usually the querying agent).
   */
  query(x: number, z: number, radius: number, excludeId = -1): number[] {
    const out: number[] = [];
    if (!(radius >= 0)) return out;
    const cs = this.cellSize;
    const minCx = Math.floor((x - radius) / cs);
    const maxCx = Math.floor((x + radius) / cs);
    const minCz = Math.floor((z - radius) / cs);
    const maxCz = Math.floor((z + radius) / cs);
    const r2 = radius * radius;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.cells.get(`${cx},${cz}`);
        if (!bucket) continue;
        for (const e of bucket) {
          if (e.id === excludeId) continue;
          const dx = e.x - x;
          const dz = e.z - z;
          if (dx * dx + dz * dz <= r2) out.push(e.id);
        }
      }
    }
    return out;
  }
}
