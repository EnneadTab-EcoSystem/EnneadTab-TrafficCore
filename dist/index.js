"use strict";
/**
 * @enneadtab/traffic-core — shared renderer-agnostic agent-traffic kernel.
 *
 * Phase 1 (this repo): deterministic agent lifecycle primitives + a
 * graph-following steering backend extracted from EnneadCity's traffic/
 * transit systems. EnneadCity consumes GraphSteering; EnneadTab-Simulation
 * will add a Detour-navmesh backend in Phase 2 behind the same
 * SteeringBackend interface.
 *
 * Hard rule: NOTHING in src/ may import a renderer, a DOM API, or read
 * wall-clock/time entropy directly. Randomness comes from SeededRng,
 * time from an injected Clock. That is what makes Simulation's
 * byte-identical replay contract achievable on top of this kernel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.offsetPoint = exports.GraphSteering = exports.SpatialHash = exports.WallClock = exports.FixedClock = exports.SeededRng = exports.hashInts = exports.mulberry32 = void 0;
var rng_js_1 = require("./core/rng.js");
Object.defineProperty(exports, "mulberry32", { enumerable: true, get: function () { return rng_js_1.mulberry32; } });
Object.defineProperty(exports, "hashInts", { enumerable: true, get: function () { return rng_js_1.hashInts; } });
Object.defineProperty(exports, "SeededRng", { enumerable: true, get: function () { return rng_js_1.SeededRng; } });
var clock_js_1 = require("./core/clock.js");
Object.defineProperty(exports, "FixedClock", { enumerable: true, get: function () { return clock_js_1.FixedClock; } });
Object.defineProperty(exports, "WallClock", { enumerable: true, get: function () { return clock_js_1.WallClock; } });
var spatial_hash_js_1 = require("./core/spatial-hash.js");
Object.defineProperty(exports, "SpatialHash", { enumerable: true, get: function () { return spatial_hash_js_1.SpatialHash; } });
var graph_steering_js_1 = require("./steering/graph-steering.js");
Object.defineProperty(exports, "GraphSteering", { enumerable: true, get: function () { return graph_steering_js_1.GraphSteering; } });
Object.defineProperty(exports, "offsetPoint", { enumerable: true, get: function () { return graph_steering_js_1.offsetPoint; } });
