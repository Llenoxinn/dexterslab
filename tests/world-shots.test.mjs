import assert from "node:assert/strict";
import { test } from "node:test";
import { SHOTS, shotPose, windowProgress } from "../lib/world/shots.ts";

test("a window's progress runs 0 to 1 as it crosses the screen, and clamps outside", () => {
  assert.equal(windowProgress(800, 400, 800), 0);
  assert.equal(windowProgress(-400, 400, 800), 1);
  assert.equal(windowProgress(200, 400, 800), 0.5);
  assert.equal(windowProgress(2000, 400, 800), 0);
  assert.equal(windowProgress(-5000, 400, 800), 1);
});

test("every shot starts at its from pose and ends at its to pose", () => {
  for (const [id, shot] of Object.entries(SHOTS)) {
    assert.deepEqual(shotPose(id, 0).pos, shot.from.pos, id);
    assert.deepEqual(shotPose(id, 1).look, shot.to.look, id);
    assert.deepEqual(shotPose(id, 7).pos, shot.to.pos, `${id} clamps past the end`);
  }
});

test("the camera never goes under the floor or through the roof", () => {
  for (const [id] of Object.entries(SHOTS)) {
    for (let p = 0; p <= 1; p += 0.05) {
      const { pos } = shotPose(id, p);
      assert.ok(pos[1] > 0.5 && pos[1] < 44, `${id} at ${p.toFixed(2)}: y=${pos[1]}`);
      assert.ok(Math.abs(pos[0]) < 46, `${id} stays inside the walls`);
    }
  }
});
