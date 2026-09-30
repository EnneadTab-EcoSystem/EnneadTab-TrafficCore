import type { SegmentAgent } from "../core/types.js";

/**
 * A steering backend advances agents for one tick.
 *
 * The interface is deliberately narrow: backends own routing state, callers
 * own spawn policy + rendering. GraphSteering (road networks) implements it
 * in Phase 1; a Detour-navmesh backend implements it in Phase 2 for
 * EnneadTab-Simulation — same Agent shape, different movement model.
 */
export interface SteeringBackend<A = SegmentAgent<unknown>> {
  /**
   * Advance every agent by dt seconds. Agents that reach a genuine dead end
   * are flagged alive=false; the caller decides despawn policy.
   */
  update(agents: A[], dt: number): void;
}
