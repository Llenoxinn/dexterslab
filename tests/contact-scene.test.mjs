import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import * as THREE from "three";
import { CONTACT_WORD_POINTS, pingConversion } from "../lib/contact-choreography.ts";
import { createStudioWindows } from "../lib/studio-daylight.ts";

registerHooks({ resolve(specifier, context, next) {
  return next(["./contact-choreography", "./ping-geometry"].includes(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { createJourney } = await import("../lib/lab-journey.ts");

test("contact objects form the word in screen space and return to their original transforms", () => {
  const root = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(root);
  for (let i = 0; i < 80; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.4, .5, .3), new THREE.MeshStandardMaterial());
    mesh.position.set((i % 10) - 5, 1 + Math.floor(i / 10), -2);
    root.add(mesh);
  }
  const journey = createJourney(root, { center: new THREE.Vector3(), toCamera: new THREE.Vector3(0, 0, 1) });
  const camera = new THREE.PerspectiveCamera(30, 1.5, .5, 200);
  camera.position.set(0, 5, 30);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld();
  const contact = { message: 1, links: 0, wordX: 0, wordY: .5, cellX: .07, cellY: .1,
    cellSize: .5, orbitX: 0, orbitY: 0, orbitRadiusX: .8, orbitRadiusY: .75, social: 0, energy: 1 };
  const input = { camera, time: 1, scroll: 10000, contentEdge: .8, pointer: null,
    from: "frame", to: "frame", mix: 1, built: Infinity, contact };
  journey.apply(input);
  root.updateMatrixWorld(true);
  for (const p of journey.pieces.filter((p) => p.slot >= 0 && p.slot < CONTACT_WORD_POINTS.length)) {
    const point = CONTACT_WORD_POINTS[p.slot];
    const projected = p.obj.localToWorld(p.center.clone()).project(camera);
    assert.ok(Math.abs(projected.x - point.x * contact.cellX) < .00001);
    assert.ok(Math.abs(projected.y - (contact.wordY + point.y * contact.cellY)) < .00001);
  }
  for (const aspect of [.4, 1.5, 3]) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    for (const amount of [0, .2, .5, .8, 1]) {
      journey.reset();
      journey.apply({ ...input, contact: { ...contact, message: amount, links: 1 - amount } });
      root.traverse((o) => {
        assert.ok([...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].every(Number.isFinite));
      });
    }
  }
  journey.reset();
  journey.apply({ ...input, contact: { ...contact, message: 0, links: 1, linksElapsed: 16 } });
  const words = scene.getObjectByName("contact-ping-words").children;
  assert.ok(words.length > 40);
  assert.ok(words.every((word) => word.visible && word.material.opacity === 1));
  const positions = words.map((word) => word.position.clone());
  assert.ok(new Set(positions.map((p) => p.toArray().join(","))).size > 40, "PING words retain separate positions");
  journey.reset();
  journey.apply({ ...input, time: 2, contact: { ...contact, message: 0, links: 1, linksElapsed: 16 } });
  assert.ok(words.every((word, i) => word.position.distanceTo(positions[i]) > .01), "Every PING word continues orbiting");
  journey.reset();
  assert.ok(words.every((word) => !word.visible));
  for (const p of journey.pieces) {
    assert.deepEqual(p.obj.position.toArray(), p.homePos.toArray());
    assert.deepEqual(p.obj.scale.toArray(), p.homeScale.toArray());
  }
});

test("studio windows leave genuine openings and visible louvres cast shadows", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const { windows } = createStudioWindows(root, material, material);
  assert.equal(windows.length, 2);
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(6.35, 4.5, 0), new THREE.Vector3(0, 0, -1));
  const hits = ray.intersectObject(windows[0], true);
  assert.ok(hits.length > 0, "Opening has a sky pane");
  assert.ok(hits.every((hit) => !hit.object.castShadow), "Opaque wall must not block the opening");
  assert.ok(windows.every((window) => window.children.filter((child) => child.castShadow).length > 10));
});

test("PING changes happen individually across ten seconds while the rest remain props", () => {
  const phases = (seconds) => Array.from({ length: 62 }, (_, slot) => pingConversion(seconds, slot, 62));
  assert.ok(phases(4).every((phase) => phase === 0));
  const midway = phases(9);
  assert.ok(midway.filter((phase) => phase === 1).length > 15);
  assert.ok(midway.filter((phase) => phase === 0).length > 15);
  assert.ok(midway.filter((phase) => phase > 0 && phase < 1).length <= 5);
  assert.ok(phases(16).every((phase) => phase === 1));
});
