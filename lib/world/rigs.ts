import * as THREE from "three";
import { experience, githubProjects, researchWorks } from "@/lib/content";
import { C } from "@/lib/world/palette";
import { Painter, scopeMaterial, type Bucket } from "@/lib/world/paint";
import { SHOTS, type ShotId } from "@/lib/world/shots";

/**
 * The machines the reader can work. Each rig belongs to one shot, has invisible hit boxes for the
 * pointer, and does one thing when triggered (by a click in the lab or by the button in the page).
 * `index` is what the machine is showing now: an org, a project, a repo or a paper.
 */
export type Rig = {
  shot: ShotId;
  hits: THREE.Object3D[];
  index: number;
  trigger: () => void;
  update: (t: number, dt: number, still: boolean) => void;
};

type V3 = [number, number, number];
type Materials = Record<Bucket, THREE.Material>;

const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;
const hidden = new THREE.MeshBasicMaterial({ visible: false });

function anchor(root: THREE.Object3D, at: V3, rotY = 0, scale = 1) {
  const group = new THREE.Group();
  group.position.set(...at);
  group.rotation.y = rotY;
  group.scale.setScalar(scale);
  root.add(group);
  return group;
}

/** A moving part: painted like everything else, but its own mesh so it can move. It casts no shadow (the shadow map is static). */
function part(materials: Materials, build: (p: Painter) => void) {
  const p = new Painter();
  build(p);
  const group = p.build(materials);
  group.traverse((object) => {
    object.castShadow = false;
  });
  return group;
}

function hitBox(parent: THREE.Object3D, size: V3, at: V3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), hidden);
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** Exponential approach: frame-rate independent, and exact when `still` (reduced motion). */
const approach = (value: number, target: number, rate: number, dt: number, still: boolean) =>
  still ? target : value + (target - value) * (1 - Math.exp(-rate * dt));

/** The big red button on the control desk: press it and /dev/dexter opens on the CRT. */
function consoleRig(root: THREE.Group, materials: Materials): Rig {
  const desk = anchor(root, [0, 0, 5.8], 0, 0.6);
  const cap = part(materials, (p) => {
    p.cyl(0.42, 0.46, 0.3, C.red, { bucket: "gloss", ramp: 0.45 }, 22);
    p.cyl(0.3, 0.34, 0.04, 0xff8a7a, { at: [0, 0.16, 0], bucket: "gloss", ramp: 0 }, 22);
  });
  cap.position.set(-2.2, 2.06, 0.3);
  desk.add(cap);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), scopeMaterial(0x7ff5d6, 0.3));
  screen.position.set(-6.05 + Math.sin(0.42) * 0.09, 2.95, 2.08 + Math.cos(0.42) * 0.09);
  screen.rotation.y = 0.42;
  desk.add(screen);
  let press = 0;
  return {
    shot: "console",
    hits: [hitBox(desk, [1.6, 1, 1.6], [-2.2, 2.06, 0.3])],
    index: 0,
    trigger() {
      press = 1;
      window.setTimeout(() => window.dispatchEvent(new Event("lab:open-terminal")), 160);
    },
    update(_t, dt, still) {
      press = approach(press, 0, 7, dt, still);
      cap.position.y = 2.06 - 0.13 * press;
    },
  };
}

/** Pneumatic mail: canisters ride up the glass tubes; a trigger brings one down hard into the tray. */
function tubesRig(root: THREE.Group, materials: Materials): Rig {
  const station = anchor(root, [19, 0, -58], -HALF_PI);
  const colors = [C.pink, C.warm, 0x9fe6e0, C.cream];
  const canisters = colors.map((color, i) => {
    const canister = part(materials, (p) => {
      p.cyl(0.5, 0.5, 1.3, color, { bucket: "gloss", ramp: 0.4 }, 14);
      for (const y of [-0.65, 0.65]) p.ball(0.5, C.steel, { at: [0, y, 0], scale: [1, 0.55, 1], bucket: "gloss" }, 12);
      p.ring(0.51, 0.06, C.navy, { at: [0, 0.2, 0], rot: [HALF_PI, 0, 0], ramp: 0 }, 16);
      p.box(0.5, 0.36, 0.04, C.cream, { at: [0, -0.15, 0.5], ramp: 0 });
    });
    canister.position.set((i - 1.5) * 2.9, [6.2, 11.5, 4.4, 17][i], 1.6);
    station.add(canister);
    return { canister, mode: "up" as "up" | "drop" | "hold", hold: 0, squash: 0 };
  });
  const rig: Rig = {
    shot: "tubes",
    hits: [hitBox(station, [12, 16, 6], [0, 8, 2.5])],
    index: 0,
    trigger() {
      rig.index = (rig.index + 1) % experience.length;
      const c = canisters[rig.index % canisters.length];
      c.mode = "drop";
      c.canister.position.y = 39;
    },
    update(_t, dt, still) {
      for (const c of canisters) {
        const y = c.canister.position.y;
        if (c.mode === "drop") {
          const next = still ? 3.6 : y - 34 * dt;
          if (next <= 3.6) {
            c.canister.position.y = 3.6;
            c.mode = "hold";
            c.hold = 1.4;
            c.squash = 1;
          } else c.canister.position.y = next;
        } else if (c.mode === "hold") {
          c.hold -= dt;
          if (c.hold <= 0 && !still) c.mode = "up";
        } else if (!still) {
          c.canister.position.y = y > 39 ? 3.4 : y + 2.6 * dt;
        }
        c.squash = approach(c.squash, 0, 9, dt, still);
        c.canister.scale.set(1 + c.squash * 0.12, 1 - c.squash * 0.16, 1 + c.squash * 0.12);
      }
    },
  };
  return rig;
}

/** The centre platform turns a third of the way round to bring the next project's machine to the front. */
function platformRig(platform: THREE.Group): Rig {
  const [cx, , cz] = SHOTS.platform.to.pos;
  // Machine i stands at angle i * 120 degrees on the disc; this is the angle that faces the camera.
  const facing = Math.atan2(cx - platform.position.x, cz - platform.position.z);
  let target = facing;
  let turn = facing;
  platform.rotation.y = facing;
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 8, 16), hidden);
  hit.position.y = 4;
  platform.add(hit);
  const rig: Rig = {
    shot: "platform",
    hits: [hit],
    index: 0,
    trigger() {
      rig.index += 1;
      target = facing - (rig.index * TAU) / 3;
    },
    update(t, dt, still) {
      turn = approach(turn, target, 2.6, dt, still);
      platform.rotation.y = turn + (still ? 0 : Math.sin(t * 0.5) * 0.035);
    },
  };
  return rig;
}

/** One drawing per drawer, so no two blueprints are the same. */
function blueprint(p: Painter, seed: number) {
  p.box(2.8, 0.04, 3, C.dos, { at: [0, 0.5, 0.3], ramp: 0 });
  p.box(2.6, 0.045, 2.8, 0x2f3fe0, { at: [0, 0.505, 0.3], ramp: 0 });
  const line = (w: number, x: number, z: number, turn = 0) => p.box(w, 0.05, 0.05, C.cream, { at: [x, 0.53, z], rot: [0, turn, 0], ramp: 0 });
  for (let i = 0; i < 4; i += 1) line(0.6 + ((seed * 7 + i * 3) % 5) * 0.22, -0.55 + (i % 2) * 0.1, -0.9 + i * 0.22);
  const kind = seed % 3;
  if (kind === 0) {
    // A gear.
    p.ring(0.55, 0.035, C.cream, { at: [0.5, 0.53, 0.9], rot: [HALF_PI, 0, 0], ramp: 0 }, 24);
    for (let i = 0; i < 10; i += 1) line(0.18, 0.5 + Math.cos((i / 10) * TAU) * 0.62, 0.9 + Math.sin((i / 10) * TAU) * 0.62, -(i / 10) * TAU);
    p.ring(0.16, 0.03, C.cream, { at: [0.5, 0.53, 0.9], rot: [HALF_PI, 0, 0], ramp: 0 }, 12);
  } else if (kind === 1) {
    // A circuit: a chip with legs and traces.
    p.box(0.7, 0.05, 0.5, C.cream, { at: [0.4, 0.53, 0.9], ramp: 0 });
    for (let i = 0; i < 4; i += 1) for (const side of [-1, 1]) line(0.2, 0.15 + i * 0.17, 0.9 + side * 0.36, HALF_PI);
    line(1, -0.2, 1.45);
    line(0.6, 0.9, 0.5, HALF_PI);
  } else {
    // A plot: axes and a rising curve.
    line(1.2, 0.3, 1.45);
    line(1, -0.3, 0.95, HALF_PI);
    for (let i = 0; i < 6; i += 1) p.ball(0.05, C.warm, { at: [-0.2 + i * 0.2, 0.55, 1.35 - Math.pow(i / 5, 1.6) * 0.8], ramp: 0 }, 6);
  }
}

/** The flat-file cabinet: one drawer per repository. Opening the next one closes the last. */
function cabinetRig(root: THREE.Group, materials: Materials): Rig {
  const station = anchor(root, [-18.5, 0, -126], HALF_PI);
  const drawers = githubProjects.slice(0, 9).map((_, i) => {
    const row = 2 - Math.floor(i / 3);
    const col = i % 3;
    const drawer = part(materials, (p) => {
      p.box(3, 1, 3.4, C.steel, { at: [0, -0.05, 0.2], ramp: 0.3 });
      p.soft(3.2, 1.3, 0.3, C.ice, { at: [0, 0, 1.85], bucket: "gloss", ramp: 0.2 }, 0.1);
      p.soft(1.2, 0.16, 0.24, C.amber, { at: [0, -0.1, 2.08], bucket: "gloss" }, 0.06);
      p.box(0.8, 0.3, 0.03, C.cream, { at: [0, 0.32, 2.01], ramp: 0 });
      blueprint(p, i);
    });
    drawer.position.set((col - 1) * 3.5, 1.2 + row * 1.6, 0);
    station.add(drawer);
    return drawer;
  });
  const rig: Rig = {
    shot: "cabinet",
    hits: [hitBox(station, [11, 5.6, 5], [0, 2.8, 2])],
    index: 0,
    trigger() {
      rig.index = (rig.index + 1) % drawers.length;
    },
    update(_t, dt, still) {
      drawers.forEach((drawer, i) => {
        drawer.position.z = approach(drawer.position.z, i === rig.index ? 2.9 : 0, 6, dt, still);
      });
    },
  };
  return rig;
}

/** Slide 0: docking. A protein, the ligand in its pocket, and the binding energies. */
function dockingSlide(p: Painter) {
  p.box(5.6, 0.6, 0.05, C.dos, { at: [-1.6, 8.9, 0.6], ramp: 0 });
  for (let i = 0; i < 3; i += 1) p.box(3.6 - i * 0.8, 0.18, 0.05, C.steel, { at: [-2.6 - i * 0.4, 8, 0.6 - i * 0.0], ramp: 0 });
  const blob: V3[] = [[0, 0, 0], [0.6, 0.3, 0.1], [-0.5, 0.4, 0], [0.2, 0.8, 0], [-0.3, -0.5, 0.1], [0.7, -0.4, 0], [1.1, 0.3, 0], [-0.9, -0.1, 0], [0.3, -0.9, 0], [-0.6, 0.9, 0.1], [0.9, 0.9, 0], [1.2, -0.3, 0.1], [-1.1, 0.5, 0]];
  blob.forEach(([x, y, z], i) => p.ball(0.42 + (i % 3) * 0.08, i % 4 === 0 ? 0x5aa3d8 : C.teal, { at: [2.2 + x, 5.8 + y, 0.7 + z], bucket: "gloss", ramp: 0.2 }, 10));
  // The ligand, docked in the pocket on the left of the protein.
  p.rods([[0.6, 6.1, 1.1], [0.95, 5.85, 1.15], [1.25, 6.05, 1.2]], 0.05, C.cream);
  for (const [x, y] of [[0.6, 6.1], [0.95, 5.85], [1.25, 6.05]]) p.ball(0.16, C.red, { at: [x, y, 1.15], bucket: "gloss" }, 8);
  // Binding energies: the lower the bar, the better the fit.
  [1.5, 2.3, 1.1, 1.9].forEach((h, i) => p.box(0.5, h, 0.05, i === 2 ? C.red : C.steel, { at: [-4 + i * 0.75, 3.1 + h / 2, 0.6], ramp: 0 }));
  p.box(3.2, 0.05, 0.05, C.navy, { at: [-2.9, 3.08, 0.62], ramp: 0 });
}

/** Slide 1: a petri dish with inhibition zones round the extract discs, and a falling growth curve. */
function petriSlide(p: Painter) {
  p.box(5.6, 0.6, 0.05, C.dos, { at: [-1.6, 8.9, 0.6], ramp: 0 });
  for (let i = 0; i < 3; i += 1) p.box(3.2 - i * 0.6, 0.18, 0.05, C.steel, { at: [-2.8 - i * 0.3, 8, 0.6], ramp: 0 });
  p.cyl(1.9, 1.9, 0.04, 0xe9dfb8, { at: [2.3, 5.6, 0.6], rot: [HALF_PI, 0, 0], ramp: 0 }, 40);
  p.ring(1.9, 0.07, C.steel, { at: [2.3, 5.6, 0.64], ramp: 0 }, 40);
  const zones: V3[] = [[1.6, 6.2, 0.55], [2.9, 6.1, 0.42], [2.3, 4.9, 0.3]];
  for (const [x, y, radius] of zones) {
    p.cyl(radius, radius, 0.02, 0xfbf6e4, { at: [x, y, 0.64], rot: [HALF_PI, 0, 0], ramp: 0 }, 24);
    p.cyl(0.14, 0.14, 0.03, C.cream, { at: [x, y, 0.67], rot: [HALF_PI, 0, 0], ramp: 0 }, 12);
  }
  for (let i = 0; i < 40; i += 1) {
    const a = i * 2.39996;
    const radius = 0.4 + ((i * 37) % 13) / 9;
    const x = 2.3 + Math.cos(a) * radius;
    const y = 5.6 + Math.sin(a) * radius;
    if (zones.some(([zx, zy, zr]) => Math.hypot(x - zx, y - zy) < zr + 0.1) || radius > 1.75) continue;
    p.ball(0.07, C.amber, { at: [x, y, 0.66], ramp: 0 }, 6);
  }
  const curve: V3[] = [];
  for (let i = 0; i <= 8; i += 1) curve.push([-4.2 + i * 0.4, 3.4 + 2 * Math.exp(-i * 0.45), 0.62]);
  p.rods(curve, 0.05, C.red);
  p.box(3.4, 0.05, 0.05, C.navy, { at: [-2.6, 3.3, 0.62], ramp: 0 });
  p.box(0.05, 2.4, 0.05, C.navy, { at: [-4.3, 4.5, 0.62], ramp: 0 });
}

/** The overhead projector: each click puts the next paper on the screen. */
function projectorRig(root: THREE.Group, materials: Materials): Rig {
  const station = anchor(root, [19, 0, -152], -HALF_PI);
  const builders = [dockingSlide, petriSlide];
  const slides = researchWorks.map((_, i) => {
    const slide = part(materials, builders[i % builders.length]);
    slide.visible = i === 0;
    station.add(slide);
    return slide;
  });
  let swap = 1;
  const rig: Rig = {
    shot: "projector",
    hits: [hitBox(station, [11, 9, 3], [0, 6.4, 1]), hitBox(station, [3.4, 6.5, 3], [0, 3.2, 9.6])],
    index: 0,
    trigger() {
      rig.index = (rig.index + 1) % slides.length;
      slides.forEach((slide, i) => (slide.visible = i === rig.index));
      swap = 0;
    },
    update(_t, dt, still) {
      swap = approach(swap, 1, 9, dt, still);
      // The new sheet lands on the stage a little out of square, and settles.
      const slide = slides[rig.index];
      if (slide) {
        slide.position.x = (1 - swap) * 0.25;
        slide.rotation.z = (1 - swap) * 0.02;
      }
    },
  };
  return rig;
}

/**
 * One paper pennant hung between two points on the cord: a triangle that narrows to its tip, cupped a
 * little as cloth and paper are, and papered on both faces so it reads from behind as well.
 */
function pennant(a: V3, b: V3, drop: number, cup: number, twist: number) {
  const cols = 4;
  const rows = 5;
  const point = (s: number, t: number): V3 => {
    // s runs across (0 at a, 1 at b), t runs down (0 on the cord, 1 at the tip).
    const u = 0.5 + (s - 0.5) * (1 - t * 0.97);
    const across = 2 * u - 1;
    return [
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u - drop * t,
      a[2] + cup * Math.sin(Math.PI * t * 0.85) * (1 - across * across * 0.6) + twist * t * across,
    ];
  };
  const front: number[] = [];
  const back: number[] = [];
  const quad = (p00: V3, p10: V3, p01: V3, p11: V3) => {
    front.push(...p00, ...p01, ...p10, ...p10, ...p01, ...p11);
    // The back face sits a paper's thickness behind, wound the other way so it faces out.
    const off = (p: V3): V3 => [p[0], p[1], p[2] - 0.014];
    back.push(...off(p00), ...off(p10), ...off(p01), ...off(p10), ...off(p11), ...off(p01));
  };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      quad(point(c / cols, r / rows), point((c + 1) / cols, r / rows), point(c / cols, (r + 1) / rows), point((c + 1) / cols, (r + 1) / rows));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([...front, ...back], 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Banderitas: five lines of bunting. Tug them and they swing, then settle back to a breeze. */
function banderitasRig(root: THREE.Group, materials: Materials): Rig {
  const colors = [C.red, C.warm, C.dos, C.cream, 0x9fe6e0, C.pink];
  const lines = Array.from({ length: 5 }, (_, line) => {
    const z = -171 - line * 4.6;
    const high = 19 + (line % 2) * 2.5;
    const sag = 6.5 + (line % 3) * 0.8;
    const at = (u: number): V3 => [-30 + u * 60, -Math.sin(u * Math.PI) * sag, 0];
    const group = part(materials, (p) => {
      const points: V3[] = [];
      for (let i = 0; i <= 24; i += 1) points.push(at(i / 24));
      // Jute twine, not a cream rod.
      p.tube(points, 0.06, 0xc9a46a, { ramp: 0 }, 60);
      const span = 0.72 / 60;
      for (let i = 1; i < 20; i += 1) {
        const u = i / 20;
        const color = colors[(i + line * 2) % colors.length];
        // Both top corners sit on the cord itself, so every pennant follows the sag instead of floating under it.
        const left = at(u - span);
        const right = at(u + span);
        const seed = (i * 7 + line * 3) % 5;
        p.add(pennant(left, right, 1.5 + (seed % 2) * 0.12, 0.1 + seed * 0.03, (seed - 2) * 0.05), color, { ramp: 0.32 });
        // The hem: the paper folded over the twine, glued down along its length.
        p.tube([left, at(u), right], 0.085, color, { ramp: 0 }, 6);
      }
    });
    group.position.set(0, high, z);
    root.add(group);
    return group;
  });
  let amp = 0;
  return {
    shot: "banderitas",
    hits: [hitBox(root, [62, 16, 26], [0, 15, -180])],
    index: 0,
    trigger() {
      amp = 0.42;
    },
    update(t, dt, still) {
      amp = approach(amp, 0, 1.1, dt, still);
      lines.forEach((line, i) => {
        line.rotation.x = still ? 0 : (0.03 + amp) * Math.sin(t * (2.1 + i * 0.13) + i * 0.9);
      });
    },
  };
}

/** The outbox: send a canister up the tube into the trunk line, and two Tesla coils arcing by the door. */
function outboxRig(root: THREE.Group, materials: Materials): Rig {
  const canister = part(materials, (p) => {
    p.cyl(0.5, 0.5, 1.4, C.warm, { bucket: "gloss", ramp: 0.4 }, 14);
    for (const y of [-0.7, 0.7]) p.ball(0.5, C.steel, { at: [0, y, 0], scale: [1, 0.55, 1], bucket: "gloss" }, 12);
    p.ring(0.51, 0.06, C.red, { at: [0, 0.25, 0], rot: [HALF_PI, 0, 0], ramp: 0 }, 16);
  });
  const rest = new THREE.Vector3(15, 5.4, -226);
  canister.position.copy(rest);
  root.add(canister);
  let mode: "rest" | "up" | "away" | "gone" | "back" = "rest";
  let speed = 0;
  let timer = 0;

  // Lightning: each coil throws two jagged arcs, redrawn a dozen times a second while they are on.
  const ARCS = 4;
  const STEPS = 14;
  const arcPositions = new Float32Array(ARCS * STEPS * 2 * 3);
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
  const arcMaterial = new THREE.LineBasicMaterial({ color: 0xd4f8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const arcs = new THREE.LineSegments(arcGeometry, arcMaterial);
  arcs.frustumCulled = false;
  root.add(arcs);
  let nextArc = 0;
  const strike = () => {
    let o = 0;
    for (let a = 0; a < ARCS; a += 1) {
      const x0 = a < 2 ? -19 : 19;
      const start = new THREE.Vector3(x0, 22.4, -222);
      // One arc of each pair reaches toward the other coil; the other strikes the air or the toroid.
      const end = a % 2 === 0
        ? new THREE.Vector3(x0 * (0.35 + Math.random() * 0.3), 21 + Math.random() * 6, -222 + (Math.random() - 0.5) * 6)
        : new THREE.Vector3(x0 + (Math.random() - 0.5) * 9, 22 + (Math.random() - 0.4) * 8, -222 + (Math.random() - 0.5) * 8);
      let prev = start.clone();
      for (let i = 1; i <= STEPS; i += 1) {
        const u = i / STEPS;
        const jitter = Math.sin(u * Math.PI) * 1.6;
        const point = start.clone().lerp(end, u).add(new THREE.Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter));
        arcPositions.set([prev.x, prev.y, prev.z, point.x, point.y, point.z], o);
        o += 6;
        prev = point;
      }
    }
    arcGeometry.getAttribute("position").needsUpdate = true;
  };
  strike();

  return {
    shot: "outbox",
    hits: [hitBox(root, [9, 10, 7], [14.5, 5, -225])],
    index: 0,
    trigger() {
      if (mode !== "rest") return;
      mode = "up";
      speed = 4;
    },
    update(t, dt, still) {
      if (!still && t >= nextArc) {
        nextArc = t + 0.06 + Math.random() * 0.08;
        // Bursts with gaps, like a real coil, not a constant buzz.
        arcs.visible = Math.sin(t * 1.7) + Math.sin(t * 4.3) > -0.6;
        if (arcs.visible) strike();
      }
      if (still) {
        mode = "rest";
        canister.position.copy(rest);
        canister.visible = true;
        return;
      }
      if (mode === "up") {
        speed += 46 * dt;
        canister.position.y += speed * dt;
        if (canister.position.y >= 34) {
          canister.position.y = 34;
          mode = "away";
          timer = 1;
        }
      } else if (mode === "away") {
        canister.position.z += 50 * dt;
        timer -= dt;
        if (timer <= 0) {
          canister.visible = false;
          mode = "gone";
          timer = 0.9;
        }
      } else if (mode === "gone") {
        timer -= dt;
        if (timer <= 0) {
          canister.position.set(rest.x, 3.2, rest.z);
          canister.visible = true;
          mode = "back";
        }
      } else if (mode === "back") {
        canister.position.y = approach(canister.position.y, rest.y, 5, dt, false);
        if (Math.abs(canister.position.y - rest.y) < 0.01) {
          canister.position.y = rest.y;
          mode = "rest";
        }
      }
    },
  };
}

export function createRigs(root: THREE.Group, materials: Materials, platform: THREE.Group): Rig[] {
  return [
    consoleRig(root, materials),
    tubesRig(root, materials),
    platformRig(platform),
    cabinetRig(root, materials),
    projectorRig(root, materials),
    banderitasRig(root, materials),
    outboxRig(root, materials),
  ];
}
