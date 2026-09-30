"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDoorCrossing = detectDoorCrossing;
exports.validateBuildingEgress = validateBuildingEgress;
exports.parseBuildingEgress = parseBuildingEgress;
exports.buildDoorFlowSeries = buildDoorFlowSeries;
function normalize(v) {
    const len = Math.hypot(v.x, v.z) || 1;
    return { x: v.x / len, z: v.z / len };
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
function detectDoorCrossing(prev, curr, door) {
    const n = normalize(door.outwardNormal);
    const rx = curr.x - prev.x;
    const rz = curr.z - prev.z;
    // Signed distances of prev/curr from the gate plane along the normal.
    const d0 = (prev.x - door.position.x) * n.x + (prev.z - door.position.z) * n.z;
    const d1 = (curr.x - door.position.x) * n.x + (curr.z - door.position.z) * n.z;
    let direction = null;
    if (d0 <= 0 && d1 > 0)
        direction = "out";
    else if (d1 <= 0 && d0 > 0)
        direction = "in";
    else
        return null;
    if (rx === 0 && rz === 0)
        return null;
    // Lateral coordinate of the crossing point along the gate segment.
    // Gate tangent (perpendicular to normal): t = (-n.z, n.x).
    const s = d0 / (d0 - d1); // 0..1 fraction prev->curr where d == 0
    const cx = prev.x + rx * s - door.position.x;
    const cz = prev.z + rz * s - door.position.z;
    const lateral = Math.abs(cx * -n.z + cz * n.x);
    return lateral <= door.widthMeters / 2 ? direction : null;
}
/** Structural validation; returns a list of human-readable errors (empty = valid). */
function validateBuildingEgress(def) {
    const errors = [];
    if (typeof def !== "object" || def === null)
        return ["building egress must be an object"];
    const d = def;
    if (typeof d.buildingId !== "string" || d.buildingId.length === 0)
        errors.push("buildingId must be a non-empty string");
    if (!Array.isArray(d.doors) || d.doors.length === 0) {
        errors.push("doors must be a non-empty array");
    }
    else {
        const seen = new Set();
        d.doors.forEach((door, i) => {
            const prefix = `doors[${i}]`;
            if (typeof door !== "object" || door === null) {
                errors.push(`${prefix} must be an object`);
                return;
            }
            const o = door;
            if (typeof o.doorId !== "string" || o.doorId.length === 0)
                errors.push(`${prefix}.doorId must be a non-empty string`);
            else if (seen.has(o.doorId))
                errors.push(`${prefix}.doorId duplicates "${o.doorId}"`);
            else
                seen.add(o.doorId);
            for (const k of ["position", "outwardNormal"]) {
                const v = o[k];
                if (typeof v?.x !== "number" || typeof v?.z !== "number" || !isFinite(v.x) || !isFinite(v.z))
                    errors.push(`${prefix}.${k} must be {x, z} finite numbers`);
            }
            const n = o.outwardNormal;
            if (n && typeof n.x === "number" && typeof n.z === "number" && Math.hypot(n.x, n.z) === 0)
                errors.push(`${prefix}.outwardNormal must be non-zero`);
            if (typeof o.widthMeters !== "number" || !isFinite(o.widthMeters) || o.widthMeters <= 0)
                errors.push(`${prefix}.widthMeters must be a positive number`);
        });
    }
    if (!Array.isArray(d.schedule)) {
        errors.push("schedule must be an array");
    }
    else {
        d.schedule.forEach((slot, i) => {
            const prefix = `schedule[${i}]`;
            if (typeof slot !== "object" || slot === null) {
                errors.push(`${prefix} must be an object`);
                return;
            }
            const o = slot;
            if (typeof o.startSec !== "number" || !isFinite(o.startSec) || o.startSec < 0)
                errors.push(`${prefix}.startSec must be a non-negative number`);
            if (typeof o.endSec !== "number" || !isFinite(o.endSec) || (typeof o.startSec === "number" && o.endSec <= o.startSec))
                errors.push(`${prefix}.endSec must be a number greater than startSec`);
            if (typeof o.expectedRatePerMin !== "number" || !isFinite(o.expectedRatePerMin) || o.expectedRatePerMin < 0)
                errors.push(`${prefix}.expectedRatePerMin must be a non-negative number`);
        });
    }
    return errors;
}
/**
 * Parse + normalize a BuildingEgress from unknown JSON. Throws on invalid
 * input. Outward normals are normalized to unit length so producers and
 * consumers agree on the gate geometry bit-for-bit.
 */
function parseBuildingEgress(json) {
    const errors = validateBuildingEgress(json);
    if (errors.length > 0)
        throw new Error(`invalid BuildingEgress: ${errors.join("; ")}`);
    const d = json;
    return {
        buildingId: d.buildingId,
        doors: d.doors.map((door) => ({
            doorId: door.doorId,
            position: { x: door.position.x, z: door.position.z },
            outwardNormal: normalize(door.outwardNormal),
            widthMeters: door.widthMeters,
        })),
        schedule: d.schedule.map((s) => ({
            startSec: s.startSec,
            endSec: s.endSec,
            expectedRatePerMin: s.expectedRatePerMin,
        })),
    };
}
/**
 * Build the dense per-tick series from raw crossings. Pure and
 * deterministic: crossings are sorted by (tick, doorId, agentId,
 * direction) before counting, so producer iteration order cannot leak
 * into the export.
 */
function buildDoorFlowSeries(buildingId, doorIds, crossings, tickSec, totalTicks) {
    const ordered = [...crossings].sort((a, b) => a.tick - b.tick ||
        (a.doorId < b.doorId ? -1 : a.doorId > b.doorId ? 1 : 0) ||
        a.agentId - b.agentId ||
        (a.direction < b.direction ? -1 : a.direction > b.direction ? 1 : 0));
    const ticks = Array.from({ length: totalTicks }, (_, tick) => {
        const counts = {};
        for (const id of doorIds)
            counts[id] = { out: 0, in: 0 };
        return { tick, timeSec: tick * tickSec, counts };
    });
    for (const c of ordered) {
        if (c.tick < 0 || c.tick >= totalTicks)
            continue;
        const row = ticks[c.tick].counts[c.doorId];
        if (!row)
            continue;
        row[c.direction]++;
    }
    return { version: 1, buildingId, tickSec, totalTicks, doorIds: [...doorIds], ticks };
}
