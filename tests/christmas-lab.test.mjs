import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { createChristmasDecor } from "../lib/christmas-lab.ts";

function scene() {
  const root = new THREE.Group();
  const core = new THREE.Group();
  const terminal = new THREE.Group();
  root.add(core, terminal);
  return { root, ...createChristmasDecor(root, core, terminal) };
}

test("Christmas lab includes parols, a window, and wrapped gifts with finite animation poses", () => {
  const lab = scene();
  const parols = [];
  const gifts = [];
  lab.root.traverse((object) => {
    if (object.name === "parol-lantern") parols.push(object);
    if (object.name === "wrapped-gift") gifts.push(object);
  });
  assert.equal(parols.length, 3);
  assert.equal(gifts.length, 4);
  assert.ok(lab.root.getObjectByName("laboratory-window"));
  lab.root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry.type === "SphereGeometry" && object.geometry.parameters.radius === 1) {
      assert.ok(Math.max(...object.scale.toArray()) < 0.3, "Small decorative spheres must retain their base radius");
    }
  });
  for (const time of [0, 0.016, 1, 60, 3600, NaN]) {
    lab.tick(time);
    lab.root.traverse((object) => {
      for (const value of [...object.position.toArray(), ...object.scale.toArray(), object.rotation.x, object.rotation.y, object.rotation.z]) {
        assert.ok(Number.isFinite(value), `${object.name || object.type} has an invalid transform`);
      }
    });
    for (const puff of lab.root.getObjectByName("mug-steam").children) {
      assert.ok(puff.scale.x < 0.1, "Mug steam must not become a giant translucent sphere");
    }
  }
});

test("gift lids open, close, and support an immediate reduced-motion state", () => {
  const lab = scene();
  const gift = lab.root.getObjectByName("wrapped-gift");
  assert.equal(lab.activate(gift.children[0], true), true);
  lab.tick(0);
  assert.equal(gift.getObjectByName("gift-surprise").visible, true);
  assert.equal(lab.activate(gift.children[0], true), true);
  lab.tick(0);
  assert.equal(gift.getObjectByName("gift-surprise").visible, false);
  assert.equal(lab.activate(new THREE.Object3D()), false);
});
