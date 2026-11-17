import * as THREE from "three";
import { C } from "@/lib/world/palette";
import { Painter, scopeMaterial, type Bucket } from "@/lib/world/paint";

/**
 * Set dressing that fills the hall between the stations: reel-to-reel computers, a chemistry bench and
 * two lab robots. Their bodies are painted into the shared painter (merged, cheap); the parts that move
 * (reels, bubbles, screens) are their own small meshes.
 */

type V3 = [number, number, number];
type Materials = Record<Bucket, THREE.Material>;
const HALF_PI = Math.PI / 2;

function anchor(root: THREE.Object3D, at: V3, rotY: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(...at);
  group.rotation.y = rotY;
  group.scale.setScalar(scale);
  root.add(group);
  return group;
}

/** A tape computer: two reels, a scope, dials and a row of lamps. Built facing +z. */
function tapeBank(p: Painter) {
  p.box(5.4, 0.8, 2.8, C.navy, { at: [0, 0.4, 0], ramp: 0.1 });
  p.soft(5, 8, 2.4, 0x3a5aa8, { at: [0, 4.8, 0], bucket: "gloss", ramp: 0.45 }, 0.45);
  p.soft(5.3, 0.6, 2.7, C.deep, { at: [0, 9.05, 0], bucket: "gloss" }, 0.2);
  for (const x of [-1.25, 1.25]) {
    p.cyl(1.15, 1.15, 0.1, C.navy, { at: [x, 6.6, 1.2], rot: [HALF_PI, 0, 0], ramp: 0 }, 28);
    p.ring(1.17, 0.06, C.ice, { at: [x, 6.6, 1.26], ramp: 0 }, 28);
  }
  // The head block the tape runs across, with its two guide rollers.
  p.soft(0.9, 0.7, 0.36, C.ice, { at: [0, 5.45, 1.3], bucket: "gloss" }, 0.1);
  for (const x of [-0.6, 0.6]) p.cyl(0.12, 0.12, 0.3, C.cream, { at: [x, 5.45, 1.35], rot: [HALF_PI, 0, 0] }, 10);
  p.box(2.5, 0.03, 0.03, 0x3a2212, { at: [0, 5.82, 1.42], ramp: 0 });
  // The scope bezel; the screen itself is a shader (see createProps).
  p.soft(2.9, 1.6, 0.22, 0x061826, { at: [-0.65, 3.4, 1.22] }, 0.18);
  for (let i = 0; i < 3; i += 1) {
    p.cyl(0.26, 0.26, 0.16, C.cream, { at: [1.65, 4 - i * 0.62, 1.25], rot: [HALF_PI, 0, 0] }, 14);
    p.box(0.05, 0.22, 0.04, C.red, { at: [1.65, 4.05 - i * 0.62, 1.34], rot: [0, 0, i - 1] });
  }
  for (let i = 0; i < 7; i += 1) p.box(0.24, 0.24, 0.1, [C.aqua, C.warm, C.red, 0x8dffb0][i % 4], { at: [-1.8 + i * 0.6, 2.05, 1.22], bucket: "blink" });
  for (let i = 0; i < 4; i += 1) p.box(3.8, 0.1, 0.06, C.navy, { at: [0, 1.15 + i * 0.2, 1.21], ramp: 0 });
}

/** One reel: a cream flange with three windows, a pack of wound tape, and three spokes. Faces +z. */
function reel(p: Painter) {
  p.cyl(1, 1, 0.06, C.cream, { rot: [HALF_PI, 0, 0], ramp: 0 }, 32);
  p.cyl(0.64, 0.64, 0.08, 0x3a2212, { at: [0, 0, 0.02], rot: [HALF_PI, 0, 0], ramp: 0 }, 28);
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2;
    p.cyl(0.13, 0.13, 0.08, C.navy, { at: [Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0.01], rot: [HALF_PI, 0, 0], ramp: 0 }, 12);
    p.box(0.07, 0.42, 0.04, C.cream, { at: [Math.cos(a + 1) * 0.36, Math.sin(a + 1) * 0.36, 0.08], rot: [0, 0, a + 1 - HALF_PI], ramp: 0 });
  }
  p.cyl(0.18, 0.18, 0.14, C.steel, { at: [0, 0, 0.04], rot: [HALF_PI, 0, 0] }, 12);
}

/** The chemistry bench: flasks, a still with its condenser, a rack of tubes and a burner. Faces +z. */
function chemBench(p: Painter) {
  p.soft(5, 0.9, 1.6, C.steel, { at: [0, 0.45, 0], bucket: "gloss", ramp: 0.4 }, 0.12);
  for (let i = 0; i < 3; i += 1) {
    p.box(1.4, 0.6, 0.04, C.lilac, { at: [-1.6 + i * 1.6, 0.48, 0.81] });
    p.box(0.4, 0.06, 0.06, C.amber, { at: [-1.6 + i * 1.6, 0.68, 0.85], ramp: 0 });
  }
  p.soft(5.2, 0.12, 1.8, C.cream, { at: [0, 0.96, 0], ramp: 0.1 }, 0.04);
  // A shelf at the back with bottles.
  for (const x of [-2.4, 2.4]) p.box(0.08, 1.2, 0.08, C.ice, { at: [x, 1.62, -0.75], ramp: 0 });
  p.box(5, 0.08, 0.4, C.ice, { at: [0, 1.95, -0.72], ramp: 0.1 });
  [C.amber, C.green, C.dos, C.red, C.amber, C.teal, C.pink].forEach((color, i) => {
    const h = 0.26 + (i % 3) * 0.08;
    p.cyl(0.08, 0.09, h, color, { at: [-2 + i * 0.62, 1.99 + h / 2, -0.72], bucket: "gloss" }, 10);
    p.cyl(0.035, 0.035, 0.08, C.navy, { at: [-2 + i * 0.62, 2.03 + h, -0.72] }, 6);
  });
  // Two conical flasks.
  for (const [x, color] of [[-1.9, C.pink], [-1.3, 0x8dffb0]] as const) {
    p.cyl(0.12, 0.22, 0.18, color, { at: [x, 1.11, 0.2], bucket: "glow" }, 16);
    p.cyl(0.06, 0.25, 0.4, C.ice, { at: [x, 1.22, 0.2], bucket: "glass" }, 16);
    p.cyl(0.06, 0.06, 0.18, C.ice, { at: [x, 1.51, 0.2], bucket: "glass" }, 10);
  }
  // The still: a round flask on a ring stand over a burner, its condenser coiling down to a beaker.
  p.box(0.5, 0.04, 0.4, C.navy, { at: [0.3, 1.04, 0.1], ramp: 0 });
  p.cyl(0.02, 0.02, 1.1, C.ice, { at: [0.45, 1.57, -0.05] }, 6);
  p.ring(0.2, 0.02, C.ice, { at: [0.3, 1.42, 0.1], rot: [HALF_PI, 0, 0], ramp: 0 }, 16);
  p.ball(0.16, C.aqua, { at: [0.3, 1.58, 0.1], bucket: "glow" }, 14);
  p.ball(0.23, C.ice, { at: [0.3, 1.62, 0.1], bucket: "glass" }, 16);
  p.cyl(0.05, 0.05, 0.3, C.ice, { at: [0.3, 1.95, 0.1], bucket: "glass" }, 8);
  p.cyl(0.05, 0.07, 0.2, C.steel, { at: [0.3, 1.14, 0.1], bucket: "gloss" }, 10);
  p.add(new THREE.ConeGeometry(0.045, 0.18, 10), 0x6fb8ff, { at: [0.3, 1.33, 0.1], bucket: "glow" });
  const coil: V3[] = [[0.3, 2.1, 0.1], [0.6, 2.1, 0.1]];
  for (let i = 0; i <= 24; i += 1) {
    const a = i * 0.7;
    coil.push([0.75 + i * 0.03, 2.05 - i * 0.034, 0.1 + Math.sin(a) * 0.12]);
  }
  coil.push([1.55, 1.25, 0.1]);
  p.tube(coil, 0.035, C.ice, { bucket: "glass", ramp: 0 }, 80);
  p.cyl(0.17, 0.17, 0.12, C.aqua, { at: [1.55, 1.08, 0.1], bucket: "glow" }, 16);
  p.cyl(0.18, 0.18, 0.34, C.ice, { at: [1.55, 1.19, 0.1], bucket: "glass" }, 16, true);
  // A rack of test tubes.
  p.box(0.9, 0.06, 0.24, C.wood, { at: [-0.5, 1.3, 0.35] });
  p.box(0.9, 0.06, 0.24, C.wood, { at: [-0.5, 1.05, 0.35] });
  [C.red, C.warm, 0x8dffb0, C.aqua, C.pink].forEach((color, i) => {
    p.cyl(0.035, 0.035, 0.14 + (i % 2) * 0.06, color, { at: [-0.82 + i * 0.16, 1.15, 0.35], bucket: "glow" }, 8);
    p.cyl(0.042, 0.042, 0.42, C.ice, { at: [-0.82 + i * 0.16, 1.26, 0.35], bucket: "glass" }, 8);
  });
  // A notebook left open, and a stool pushed in.
  p.box(0.6, 0.03, 0.42, C.cream, { at: [2.1, 1.04, 0.35], rot: [0, 0.3, 0], ramp: 0 });
  p.box(0.02, 0.035, 0.42, C.navy, { at: [2.1, 1.05, 0.35], rot: [0, 0.3, 0], ramp: 0 });
}

/** A lab robot after the helpers in the reference: treads, a barrel chest with lamps, a dome head and a visor. Faces +z. */
function robot(p: Painter) {
  const shell = 0xd8e2f2;
  for (const x of [-0.8, 0.8]) {
    p.soft(0.7, 0.7, 2.2, C.navy, { at: [x, 0.35, 0], bucket: "gloss" }, 0.3);
    for (const z of [-0.75, 0, 0.75]) p.cyl(0.26, 0.26, 0.74, C.steel, { at: [x, 0.35, z], rot: [0, 0, HALF_PI], bucket: "gloss" }, 12);
  }
  p.cyl(0.7, 0.95, 0.5, C.steel, { at: [0, 0.95, 0], bucket: "gloss" }, 20);
  p.cyl(0.95, 0.85, 1.9, shell, { at: [0, 2.15, 0], bucket: "gloss", ramp: 0.5 }, 24);
  p.ring(0.96, 0.06, C.dos, { at: [0, 1.5, 0], rot: [HALF_PI, 0, 0], ramp: 0 }, 24);
  p.soft(1.1, 0.75, 0.12, C.deep, { at: [0, 2.25, 0.86], bucket: "gloss" }, 0.08);
  for (let i = 0; i < 3; i += 1) p.ball(0.09, [C.red, C.warm, 0x8dffb0][i], { at: [-0.3 + i * 0.3, 2.4, 0.93], bucket: "blink" }, 8);
  for (let i = 0; i < 3; i += 1) p.box(0.7, 0.05, 0.04, C.aqua, { at: [0, 2.12 - i * 0.1, 0.93], bucket: "glow" });
  for (const side of [-1, 1]) {
    p.ball(0.3, C.steel, { at: [side * 1.05, 2.85, 0], bucket: "gloss" }, 12);
    p.tube([[side * 1.1, 2.85, 0], [side * 1.45, 2.2, 0.25], [side * 1.35, 1.65, 0.75]], 0.12, C.steel, { bucket: "gloss" }, 16);
    p.ball(0.16, C.steel, { at: [side * 1.35, 1.62, 0.78], bucket: "gloss" }, 10);
    for (const f of [-1, 1]) p.box(0.08, 0.32, 0.1, C.amber, { at: [side * 1.35 + f * 0.1, 1.42, 0.86], rot: [0, 0, f * 0.25], bucket: "gloss" });
  }
  p.cyl(0.16, 0.2, 0.3, C.steel, { at: [0, 3.25, 0] }, 10);
  p.ball(0.75, shell, { at: [0, 3.8, 0], scale: [1, 0.85, 1], bucket: "gloss", ramp: 0.4 }, 22);
  p.soft(1.15, 0.34, 0.5, 0x061826, { at: [0, 3.86, 0.42], bucket: "gloss" }, 0.15);
  p.soft(0.95, 0.12, 0.1, 0x7ff5d6, { at: [0, 3.86, 0.68], bucket: "blink", phase: 0.1 }, 0.04);
  for (const side of [-1, 1]) p.cyl(0.18, 0.18, 0.16, C.dos, { at: [side * 0.74, 3.8, 0], rot: [0, 0, HALF_PI], bucket: "gloss" }, 12);
  p.cyl(0.03, 0.03, 0.8, C.ice, { at: [0, 4.85, 0] }, 6);
  p.ball(0.12, C.red, { at: [0, 5.3, 0], bucket: "blink", phase: 0.4 }, 8);
}

/** A rolling instrument cart with a plasma globe on top. Built at the origin; the globe's centre is at `GLOBE`. */
const GLOBE: V3 = [0, 2.62, 0];
const GLOBE_R = 0.62;
function plasmaCart(p: Painter) {
  p.soft(1.7, 0.14, 1.2, C.steel, { at: [0, 0.42, 0], bucket: "gloss" }, 0.05);
  p.soft(1.7, 0.14, 1.2, C.steel, { at: [0, 1.5, 0], bucket: "gloss" }, 0.05);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.52, 0.52]) {
      p.cyl(0.05, 0.05, 1.3, C.ice, { at: [x, 0.95, z] }, 6);
      p.ball(0.12, C.navy, { at: [x, 0.13, z] }, 8);
    }
  }
  // A drawer of spare tubes on the lower shelf, and a cable coiled beside it.
  p.soft(1.1, 0.42, 0.8, C.deep, { at: [-0.1, 0.7, 0], bucket: "gloss" }, 0.06);
  p.box(0.36, 0.06, 0.04, C.amber, { at: [-0.1, 0.74, 0.41], ramp: 0 });
  p.ring(0.18, 0.04, C.navy, { at: [0.58, 0.55, 0.1], rot: [HALF_PI, 0, 0], ramp: 0 }, 14);
  // The globe's base: a turned black plinth with a brass band and a pilot lamp.
  p.cyl(0.42, 0.55, 0.5, 0x0d1236, { at: [0, 1.82, 0], bucket: "gloss" }, 24);
  p.ring(0.47, 0.035, C.amber, { at: [0, 1.95, 0], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 24);
  p.cyl(0.2, 0.3, 0.22, 0x0d1236, { at: [0, 2.1, 0], bucket: "gloss" }, 16);
  p.ball(0.05, C.red, { at: [0, 1.8, 0.5], bucket: "blink", phase: 0.2 }, 6);
  p.ball(GLOBE_R, 0xb9c4ff, { at: GLOBE, bucket: "glass", ramp: 0 }, 28);
  p.ball(0.11, 0xe6d4ff, { at: GLOBE, bucket: "glow", halo: 1.8, haloColor: 0xb27dff }, 12);
}

export function createProps(root: THREE.Group, materials: Materials, p: Painter) {
  const reels: Array<{ mesh: THREE.Group; speed: number; spin: number; phase: number }> = [];
  const banks: Array<[V3, number]> = [
    [[14, 0, -24], -HALF_PI],
    [[-14, 0, -66], HALF_PI],
    [[14, 0, -114], -HALF_PI],
    [[-14, 0, -142], HALF_PI],
    [[-14, 0, -186], HALF_PI],
    [[14, 0, -198], -HALF_PI],
  ];
  const reelParts = (() => {
    const q = new Painter();
    reel(q);
    const built = q.build(materials);
    built.traverse((object) => {
      object.castShadow = false;
    });
    return built;
  })();
  banks.forEach(([at, rotY], i) => {
    p.push(at, rotY);
    tapeBank(p);
    p.pop();
    const holder = anchor(root, at, rotY);
    for (const [k, x] of [-1.25, 1.25].entries()) {
      const mesh = reelParts.clone();
      mesh.position.set(x, 6.6, 1.3);
      holder.add(mesh);
      reels.push({ mesh, speed: (k === 0 ? 1 : -1.3) * (1.4 + (i % 3) * 0.5), spin: 0, phase: i * 1.7 + k });
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), scopeMaterial(i % 2 ? 0xffd27a : 0x7ff5d6, i));
    screen.position.set(-0.65, 3.4, 1.34);
    holder.add(screen);
  });

  p.push([-5.5, 0, -2], HALF_PI);
  chemBench(p);
  p.pop();
  // Bubbles rising in the flasks and the beaker.
  const bench = anchor(root, [-5.5, 0, -2], HALF_PI);
  const sources: V3[] = [[-1.9, 1.06, 0.2], [-1.3, 1.06, 0.2], [0.3, 1.5, 0.1], [1.55, 1.04, 0.1]];
  const BUBBLES = 48;
  const bubble = new Float32Array(BUBBLES * 3);
  const seeds = new Float32Array(BUBBLES);
  for (let i = 0; i < BUBBLES; i += 1) seeds[i] = Math.random();
  const bubbleGeometry = new THREE.BufferGeometry();
  bubbleGeometry.setAttribute("position", new THREE.BufferAttribute(bubble, 3));
  const bubbleMaterial = new THREE.PointsMaterial({ color: 0xe8fffb, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false });
  const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
  bubbles.frustumCulled = false;
  bench.add(bubbles);

  for (const [at, rotY, scale] of [[[9, 0, -28], -0.6, 0.8], [[-11, 0, -82], 0.7, 1]] as Array<[V3, number, number]>) {
    p.push(at, rotY, scale);
    robot(p);
    p.pop();
  }

  // The plasma globe in the aisle: filaments crawl from the core to the glass, and each one drifts.
  const CART: V3 = [2.4, 0, -4.6];
  p.push(CART, -0.35);
  plasmaCart(p);
  p.pop();
  const globe = anchor(root, [CART[0] + GLOBE[0], GLOBE[1], CART[2] + GLOBE[2]], 0);
  const FILAMENTS = 7;
  const STEPS = 9;
  const filament = new Float32Array(FILAMENTS * STEPS * 2 * 3);
  const filamentGeometry = new THREE.BufferGeometry();
  filamentGeometry.setAttribute("position", new THREE.BufferAttribute(filament, 3));
  const filamentMaterial = new THREE.LineBasicMaterial({ color: 0xd6a8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const filaments = new THREE.LineSegments(filamentGeometry, filamentMaterial);
  filaments.frustumCulled = false;
  globe.add(filaments);
  const tips = Array.from({ length: FILAMENTS }, (_, i) => ({ theta: (i / FILAMENTS) * Math.PI * 2, phi: 0.6 + (i % 3) * 0.5, seed: i * 1.37 }));
  const tip = new THREE.Vector3();
  const drawFilaments = (t: number) => {
    let o = 0;
    for (const f of tips) {
      const theta = f.theta + Math.sin(t * 0.7 + f.seed) * 0.8;
      const phi = f.phi + Math.sin(t * 0.53 + f.seed * 2) * 0.45;
      tip.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(GLOBE_R * 0.97);
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 1; i <= STEPS; i += 1) {
        const u = i / STEPS;
        // Kinked, not straight: each step wanders sideways, most in the middle of the run.
        const kink = Math.sin(u * Math.PI) * 0.09;
        const n = Math.sin(t * 13 + i * 3.1 + f.seed * 5);
        const x = tip.x * u + n * kink;
        const y = tip.y * u + Math.cos(t * 11 + i * 2.3 + f.seed) * kink;
        const z = tip.z * u - n * kink;
        filament.set([px, py, pz, x, y, z], o);
        o += 6;
        px = x;
        py = y;
        pz = z;
      }
    }
    filamentGeometry.getAttribute("position").needsUpdate = true;
  };
  drawFilaments(0);

  return {
    update(t: number, dt: number, still: boolean) {
      if (!still) drawFilaments(t);
      for (const r of reels) {
        // Reels run in bursts and pause, the way a tape drive seeks.
        const running = still ? 0 : Math.sin(t * 0.45 + r.phase) > -0.25 ? 1 : 0;
        r.spin += (running - r.spin) * Math.min(1, dt * 3);
        r.mesh.rotation.z += r.speed * r.spin * dt;
      }
      for (let i = 0; i < BUBBLES; i += 1) {
        const [sx, sy, sz] = sources[i % sources.length];
        const life = still ? seeds[i] : (t * (0.35 + seeds[i] * 0.4) + seeds[i]) % 1;
        const wobble = Math.sin(t * 9 + i) * 0.015;
        bubble[i * 3] = sx + (seeds[i] - 0.5) * 0.14 + wobble;
        bubble[i * 3 + 1] = sy + life * 0.22;
        bubble[i * 3 + 2] = sz + (((seeds[i] * 7) % 1) - 0.5) * 0.12;
      }
      bubbleGeometry.getAttribute("position").needsUpdate = true;
    },
  };
}
