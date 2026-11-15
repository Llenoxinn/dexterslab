import assert from "node:assert/strict";
import { test } from "node:test";
import { createGovernor, msaaFor, qualityTiers } from "../lib/render-quality.ts";

test("quality tiers drop MSAA once the image is supersampled and never repeat a tier", () => {
  const tiers = qualityTiers(2, 2);
  assert.deepEqual(tiers[0], { ratio: 2, samples: 0, ao: 0.5 });
  assert.equal(tiers.at(-1).ratio, 0.75);
  assert.equal(new Set(tiers.map((t) => `${t.ratio}|${t.ao}`)).size, tiers.length);
  assert.equal(msaaFor(1), 4);
  assert.equal(qualityTiers(1, 1.5)[0].samples, 2, "small devices get 2 samples");
  assert.equal(qualityTiers(1, 2)[0].ratio, 1);
  assert.equal(qualityTiers(3, 1.5)[0].ratio, 1.5);
});

test("the governor steps down on sustained slow frames, ignores hitches, and does not oscillate", () => {
  const g = createGovernor(4, { window: 10, warmup: 1, upAfter: 2 });
  const feed = (ms, frames) => { for (let i = 0; i < frames; i++) g.sample(ms); return g.index; };
  assert.equal(feed(40, 10), 0, "warmup window is ignored");
  assert.equal(feed(400, 50), 0, "tab-switch gaps are ignored");
  assert.equal(feed(30, 10), 1);
  assert.equal(feed(16.7, 20), 0, "two good windows at vsync recover");
  assert.equal(feed(30, 10), 1, "left tier 0 a second time");
  assert.equal(feed(16.7, 200), 1, "tier 0 is now off limits");
  assert.equal(feed(30, 100), 3, "floors at the last tier");
  assert.equal(g.fail(), 3);
});
