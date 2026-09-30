"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphSteering = void 0;
exports.offsetPoint = offsetPoint;
function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Point on a segment with a signed perpendicular offset.
 * Identical to EnneadCity's computeLateral: left-of-travel normal * lateral.
 */
function offsetPoint(from, to, t, lateral) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    return {
        x: lerp(from.x, to.x, t) + (-dz / len) * lateral,
        z: lerp(from.z, to.z, t) + (dx / len) * lateral,
    };
}
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
class GraphSteering {
    constructor(graph, rng) {
        this.graph = graph;
        this.rng = rng;
    }
    /** Random non-reversing edge out of `node`; null when the node is isolated. */
    pickEdge(node, avoidDir) {
        const options = this.graph.neighborsOf(node);
        if (options.length === 0)
            return null;
        const filtered = avoidDir === null ? options : options.filter((o) => o.dir !== avoidDir);
        const pool = filtered.length > 0 ? filtered : options; // dead end: allow doubling back
        return pool[Math.floor(this.rng() * pool.length)];
    }
    /** Build an agent already placed on `spec.edge` out of `spec.from`. */
    beginSegment(spec) {
        const from = this.graph.positionOf(spec.from);
        const to = this.graph.positionOf(spec.edge.node);
        const agent = {
            id: spec.id,
            kind: spec.kind,
            fromNode: spec.from,
            toNode: spec.edge.node,
            toDir: spec.edge.dir,
            from,
            to,
            segmentLen: Math.hypot(to.x - from.x, to.z - from.z),
            progress: spec.progress,
            speed: spec.speed,
            lateral: spec.lateral,
            pos: { x: from.x, z: from.z },
            heading: 0,
            alive: true,
        };
        this.place(agent);
        return agent;
    }
    /**
     * Advance one agent by dt. Returns false when it reached a genuine dead
     * end (no edges at all from the arrival node) — the caller despawns it.
     */
    advance(agent, dt) {
        agent.progress += agent.segmentLen > 0.0001 ? (agent.speed * dt) / agent.segmentLen : 1;
        if (agent.progress >= 1) {
            const next = this.pickEdge(agent.toNode, this.graph.oppositeDir(agent.toDir));
            if (!next) {
                agent.alive = false;
                return false;
            }
            agent.fromNode = agent.toNode;
            agent.toNode = next.node;
            agent.toDir = next.dir;
            agent.from = agent.to;
            agent.to = this.graph.positionOf(next.node);
            agent.segmentLen = Math.hypot(agent.to.x - agent.from.x, agent.to.z - agent.from.z);
            agent.progress = 0;
        }
        this.place(agent);
        return true;
    }
    update(agents, dt) {
        for (const agent of agents) {
            if (agent.alive)
                this.advance(agent, dt);
        }
    }
    /** Recompute pos/heading from the agent's segment + progress. Public so
     *  callers can re-place after externally moving an agent (e.g. teleports). */
    place(agent) {
        const t = Math.min(1, agent.progress);
        agent.pos = offsetPoint(agent.from, agent.to, t, agent.lateral);
        const dx = agent.to.x - agent.from.x;
        const dz = agent.to.z - agent.from.z;
        if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
            agent.heading = Math.atan2(dx, dz);
        }
    }
}
exports.GraphSteering = GraphSteering;
