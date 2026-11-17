import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceSpring } from "../lib/spring.ts";

test("pointer spring converges across display rates and handles interrupted motion", () => {
  for (const fps of [30, 60, 120]) {
    const axis = { position: 0, velocity: 0 };
    for (let frame = 0; frame < fps * 3; frame++) advanceSpring(axis, .5, 1 / fps);
    assert.equal(axis.position, .5);
    for (let frame = 0; frame < fps * 3; frame++) advanceSpring(axis, -.5, 1 / fps);
    assert.equal(axis.position, -.5);
    assert.equal(axis.velocity, 0);
    advanceSpring(axis, .3, 60);
    assert.ok(Number.isFinite(axis.position) && Math.abs(axis.position) < 1);
  }
});
