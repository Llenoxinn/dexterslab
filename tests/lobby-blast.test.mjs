import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  return next(["./contact-choreography", "./ping-geometry", "./lab-materials"].includes(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { parkBelow } = await import("../lib/lab-journey.ts");

test("the burst parks every prop below the bottom edge, spread across the width", () => {
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  let left = 0;
  for (let i = 0; i < 200; i++) {
    const [nx, ny, depth] = parkBelow(rand() * Math.PI * 2, rand());
    assert.ok(ny < -1.1, `below the screen: ${ny}`);
    assert.ok(Math.abs(nx) <= 0.9, `inside the width: ${nx}`);
    assert.ok(depth >= 26 && depth <= 34, `depth ${depth}`);
    if (nx < 0) left++;
  }
  assert.ok(left > 60 && left < 140, "both halves of the screen get props");
});

const THREE = await import("three");
const { blastOffset } = await import("../lib/lab-lobby.ts");

test("blast offsets start at home, fly out fast against the water's drag, then sink", () => {
  const dir = new THREE.Vector3(4, 1, -2);
  const out = new THREE.Vector3();
  assert.equal(blastOffset(0, dir, 1.5, out).length(), 0, "at rest every piece is exactly home");
  assert.equal(blastOffset(-1, dir, 1.5, out).length(), 0, "before the blast too");
  const half = blastOffset(0.5, dir, 1.5, out.clone()).sub(new THREE.Vector3(0, -1.5 * 0.25, 0)).length();
  assert.ok(half > 0.9 * dir.length() * (1 - Math.exp(-3)), "most of the travel happens early");
  const y80 = blastOffset(0.8, dir, 1.5, new THREE.Vector3()).y;
  const y100 = blastOffset(1, dir, 1.5, new THREE.Vector3()).y;
  assert.ok(y100 < y80, "pieces settle downward at the end");
});
