import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { diveStage, divePose, underwaterAmount, blastProgress, clearAmount } from "../lib/dive-path.ts";

const anchors = { diveStart: 50, diveEnd: 900, descendStart: 2400, descendEnd: 3300, blastStart: 5000, blastEnd: 5600 };
const pose = (p, t) => ({ position: new THREE.Vector3(...p), target: new THREE.Vector3(...t) });
const rig = pose([0, 18, 30], [3, 0.5, 2]);
const water = pose([3, 12, 20], [3, -0.26, 14]);
const lobby = pose([3, -11, 22], [3, -13, 12]);

test("scroll maps to the dive chapters, holds while reading, and stays in the lobby", () => {
  assert.equal(diveStage(0, anchors), 0);
  assert.equal(diveStage(900, anchors), 1);
  assert.equal(diveStage(1600, anchors), 1, "holds over the water while the headline plays");
  assert.equal(diveStage(3300, anchors), 2);
  assert.equal(diveStage(4200, anchors), 2, "holds in the lobby");
  assert.equal(diveStage(99999, anchors), 2, "never surfaces: the BOOM is under water");
  let last = -1;
  for (let y = 0; y <= 6000; y += 25) {
    const s = diveStage(y, anchors);
    assert.ok(s >= last, `monotonic at ${y}`);
    last = s;
  }
});

test("blast progress is scrubbed by scroll and the water clears at its end", () => {
  assert.equal(blastProgress(4999, anchors), 0);
  assert.equal(blastProgress(5000, anchors), 0);
  assert.equal(blastProgress(5600, anchors), 1);
  assert.equal(blastProgress(99999, anchors), 1);
  let last = -1;
  for (let y = 4800; y <= 5800; y += 10) {
    const b = blastProgress(y, anchors);
    assert.ok(b >= last, `monotonic at ${y}`);
    last = b;
  }
  assert.equal(clearAmount(0), 0);
  assert.equal(clearAmount(0.6), 0);
  assert.equal(clearAmount(1), 1);
  assert.ok(clearAmount(0.8) > 0 && clearAmount(0.8) < 1);
});

test("poses hit every authored endpoint and cross the water once, going down", () => {
  const out = pose([0, 0, 0], [0, 0, 0]);
  for (const [s, expected] of [[0, rig], [1, water], [2, lobby]]) {
    divePose(s, rig, water, lobby, -0.26, out);
    assert.ok(out.position.distanceTo(expected.position) < 1e-6, `position at s=${s}`);
    assert.ok(out.target.distanceTo(expected.target) < 1e-6, `target at s=${s}`);
  }
  let crossings = 0;
  let above = true;
  for (let s = 0; s <= 2; s += 0.01) {
    divePose(s, rig, water, lobby, -0.26, out);
    const nowAbove = out.position.y > -0.26;
    if (nowAbove !== above) crossings++;
    above = nowAbove;
  }
  assert.equal(crossings, 1, "dives in once and stays under");
  assert.equal(underwaterAmount(5, -0.26), 0);
  assert.equal(underwaterAmount(-5, -0.26), 1);
});
