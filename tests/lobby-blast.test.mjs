import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  return next(["./contact-choreography", "./ping-geometry"].includes(specifier) ? `${specifier}.ts` : specifier, context);
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
