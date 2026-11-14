import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceSpring } from "../lib/spring.ts";
import { STUDIO_BACK_WINDOW, STUDIO_SUN_DIRECTION, studioSunPatch } from "../lib/studio-daylight.ts";

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

test("the studio sun ray lands inside the floor and matches the window opening", () => {
  const patch = studioSunPatch();
  assert.ok(Math.abs(patch.y) < .00001);
  assert.ok(patch.x > -7.3 && patch.x < 13);
  assert.ok(patch.z > -4.3 && patch.z < 9.2);
  const distance = STUDIO_BACK_WINDOW.y / STUDIO_SUN_DIRECTION.y;
  const source = patch.clone().addScaledVector(STUDIO_SUN_DIRECTION, distance);
  assert.ok(Math.abs(source.x - STUDIO_BACK_WINDOW.x) < .00001);
  assert.ok(Math.abs(source.z - STUDIO_BACK_WINDOW.z) < .00001);
});
