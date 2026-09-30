/**
 * BuildingEgress door-bridge contract tests: crossing geometry, validation,
 * parsing/normalization, and deterministic series building.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  detectDoorCrossing,
  validateBuildingEgress,
  parseBuildingEgress,
  buildDoorFlowSeries,
  type BuildingEgress,
  type DoorFlow,
} from "../dist/index.js";

const door: DoorFlow = {
  doorId: "main",
  position: { x: 0, z: 0 },
  outwardNormal: { x: 0, z: 1 },
  widthMeters: 2,
};

test("detectDoorCrossing: inside->outside within the gate is 'out'", () => {
  assert.equal(
    detectDoorCrossing({ x: 0.2, z: -1 }, { x: 0.2, z: 1 }, door),
    "out",
  );
});

test("detectDoorCrossing: outside->inside within the gate is 'in'", () => {
  assert.equal(
    detectDoorCrossing({ x: -0.3, z: 1 }, { x: -0.3, z: -1 }, door),
    "in",
  );
});

test("detectDoorCrossing: crossing outside the gate width does not count", () => {
  assert.equal(
    detectDoorCrossing({ x: 5, z: -1 }, { x: 5, z: 1 }, door),
    null,
  );
});

test("detectDoorCrossing: moving parallel to the gate never crosses", () => {
  assert.equal(
    detectDoorCrossing({ x: -3, z: -0.5 }, { x: 3, z: -0.5 }, door),
    null,
  );
});

test("detectDoorCrossing: no movement is not a crossing", () => {
  assert.equal(detectDoorCrossing({ x: 0, z: -1 }, { x: 0, z: -1 }, door), null);
});

test("detectDoorCrossing: staying on one side is not a crossing", () => {
  assert.equal(
    detectDoorCrossing({ x: 0, z: -2 }, { x: 0.5, z: -1 }, door),
    null,
  );
});

test("detectDoorCrossing: normalizes a non-unit outward normal", () => {
  const wide = { ...door, outwardNormal: { x: 0, z: 5 } };
  assert.equal(
    detectDoorCrossing({ x: 0, z: -1 }, { x: 0, z: 1 }, wide),
    "out",
  );
});

test("detectDoorCrossing: crossing exactly at the gate edge counts", () => {
  // lateral == widthMeters/2 is inclusive
  assert.equal(
    detectDoorCrossing({ x: 1, z: -1 }, { x: 1, z: 1 }, door),
    "out",
  );
});

const validDef = {
  buildingId: "hq-tower",
  doors: [
    {
      doorId: "main",
      position: { x: 10, z: 20 },
      outwardNormal: { x: 0, z: 2 },
      widthMeters: 1.8,
    },
  ],
  schedule: [{ startSec: 0, endSec: 3600, expectedRatePerMin: 12 }],
};

test("validateBuildingEgress: accepts a well-formed definition", () => {
  assert.deepEqual(validateBuildingEgress(validDef), []);
});

test("validateBuildingEgress: reports every structural problem", () => {
  const errors = validateBuildingEgress({
    buildingId: "",
    doors: [
      { doorId: "a", position: { x: 0, z: 0 }, outwardNormal: { x: 0, z: 0 }, widthMeters: 1 },
      { doorId: "a", position: { x: 0, z: "nope" }, outwardNormal: { x: 0, z: 1 }, widthMeters: -2 },
    ],
    schedule: [{ startSec: 10, endSec: 5, expectedRatePerMin: -1 }],
  });
  assert.ok(errors.some((e) => e.includes("buildingId")), "buildingId");
  assert.ok(errors.some((e) => e.includes("non-zero")), "zero normal");
  assert.ok(errors.some((e) => e.includes('duplicates "a"')), "duplicate doorId");
  assert.ok(errors.some((e) => e.includes("position")), "bad position");
  assert.ok(errors.some((e) => e.includes("widthMeters")), "bad width");
  assert.ok(errors.some((e) => e.includes("endSec")), "bad window");
  assert.ok(errors.some((e) => e.includes("expectedRatePerMin")), "bad rate");
});

test("parseBuildingEgress: normalizes normals and round-trips through JSON", () => {
  const parsed: BuildingEgress = parseBuildingEgress(JSON.parse(JSON.stringify(validDef)));
  assert.equal(parsed.buildingId, "hq-tower");
  assert.equal(parsed.doors[0].outwardNormal.x, 0);
  assert.equal(parsed.doors[0].outwardNormal.z, 1);
  assert.deepEqual(validateBuildingEgress(parsed), []);
});

test("parseBuildingEgress: throws on invalid input", () => {
  assert.throws(() => parseBuildingEgress({ buildingId: "x" }), /invalid BuildingEgress/);
  assert.throws(() => parseBuildingEgress(null), /invalid BuildingEgress/);
});

test("buildDoorFlowSeries: dense ticks, counts per door, deterministic order", () => {
  const series = buildDoorFlowSeries(
    "hq-tower",
    ["main", "side"],
    [
      { doorId: "side", tick: 2, timeSec: 0.2, agentId: 9, direction: "in" },
      { doorId: "main", tick: 1, timeSec: 0.1, agentId: 3, direction: "out" },
      { doorId: "main", tick: 1, timeSec: 0.1, agentId: 1, direction: "out" },
      { doorId: "main", tick: 99, timeSec: 9.9, agentId: 1, direction: "out" }, // out of range: dropped
      { doorId: "ghost", tick: 1, timeSec: 0.1, agentId: 1, direction: "out" }, // unknown door: dropped
    ],
    0.1,
    4,
  );
  assert.equal(series.version, 1);
  assert.equal(series.ticks.length, 4);
  assert.deepEqual(series.ticks[0].counts, { main: { out: 0, in: 0 }, side: { out: 0, in: 0 } });
  assert.deepEqual(series.ticks[1].counts.main, { out: 2, in: 0 });
  assert.deepEqual(series.ticks[2].counts.side, { out: 0, in: 1 });
  assert.equal(series.ticks[1].timeSec, 0.1);

  // Deterministic regardless of input order: shuffle and rebuild.
  const shuffled = buildDoorFlowSeries(
    "hq-tower",
    ["main", "side"],
    [
      { doorId: "main", tick: 1, timeSec: 0.1, agentId: 1, direction: "out" },
      { doorId: "side", tick: 2, timeSec: 0.2, agentId: 9, direction: "in" },
      { doorId: "main", tick: 1, timeSec: 0.1, agentId: 3, direction: "out" },
    ],
    0.1,
    4,
  );
  assert.equal(JSON.stringify(shuffled), JSON.stringify({ ...series, ticks: series.ticks }));
});

test("buildDoorFlowSeries: serializes to JSON and back", () => {
  const series = buildDoorFlowSeries("b", ["d"], [], 0.5, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(series)), series);
});
