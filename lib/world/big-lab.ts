import * as THREE from "three";
import { Painter, clock, createMaterials, gouache } from "@/lib/world/paint";
import { parol, starGeometry } from "@/lib/world/parol";
import { createRigs, type Rig } from "@/lib/world/rigs";
import { createProps } from "@/lib/world/props";
import { C } from "@/lib/world/palette";

/**
 * The big lab: one hall, 96 m wide, 250 m long and 48 m high, walked from the control desk at the
 * front to the vault door at the far end. Everything is painted and merged at load (see paint.ts).
 * Units are metres; the aisle runs down -z. Station positions match the camera shots in shots.ts.
 */



const HALF_PI = Math.PI / 2;
/** Rotation that turns a station built facing +z toward the aisle from its side of the hall. */
const face = (x: number) => (x < 0 ? HALF_PI : -HALF_PI);

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function floorTexture() {
  const size = 1024;
  const tiles = 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = rng(11);
  const step = size / tiles;
  for (let y = 0; y < tiles; y += 1) {
    for (let x = 0; x < tiles; x += 1) {
      const light = (x + y) % 2 === 0;
      const shade = Math.round((r() - 0.5) * 14);
      ctx.fillStyle = light ? `rgb(${150 + shade} ${200 + shade} ${212 + shade})` : `rgb(${72 + shade} ${150 + shade} ${176 + shade})`;
      ctx.fillRect(x * step, y * step, step, step);
      // A few dry-brush streaks so no tile is a flat fill.
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = light ? "#3b78a0" : "#dff3f4";
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x * step + r() * step * 0.7, y * step + r() * step, step * (0.2 + r() * 0.5), 1 + r() * 2);
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = "rgb(20 40 110 / 0.5)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= tiles; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(96 / 24, 260 / 24);
  texture.anisotropy = 4;
  return texture;
}

/** A machine tower, built facing +z. Near towers get a face full of panels, far ones are silhouettes. */
function tower(p: Painter, w: number, d: number, h: number, r: () => number, detail: boolean) {
  const bodies = [C.deep, C.steel, C.navy, C.teal, C.lilac];
  const body = bodies[Math.floor(r() * (detail ? 5 : 3))];
  p.box(w + 1.2, 1.2, d + 1.2, C.navy, { at: [0, 0.6, 0], ramp: 0.1 });
  p.soft(w, h, d, body, { at: [0, h / 2 + 1.2, 0], bucket: "gloss", ramp: 0.42 }, 0.6);
  const h2 = h * (0.2 + r() * 0.35);
  p.soft(w * 0.68, h2, d * 0.68, bodies[Math.floor(r() * 3)], { at: [0, h + 1.2 + h2 / 2, 0], bucket: "gloss", ramp: 0.3 }, 0.5);
  const top = h + 1.2 + h2;
  const crown = r();
  if (crown < 0.35) p.ball(w * 0.3, C.teal, { at: [0, top, 0], bucket: "gloss" });
  else if (crown < 0.7) {
    p.cyl(0.14, 0.2, 7, C.ice, { at: [0, top + 3.5, 0] }, 6);
    p.ball(0.42, C.red, { at: [0, top + 7.1, 0], bucket: "glow", halo: 2.2 }, 8);
  } else p.cyl(w * 0.22, w * 0.3, 3, C.steel, { at: [w * 0.12, top + 1.5, 0], bucket: "gloss" });
  if (!detail) {
    // Far towers keep only a strip of lit windows, so the depth of the hall still reads through the haze.
    for (let i = 0; i < 4; i += 1) {
      p.box(w * 0.5, 0.5, 0.2, r() < 0.5 ? C.aqua : C.warm, { at: [(r() - 0.5) * w * 0.3, h * (0.3 + i * 0.16), d / 2 + 0.1], bucket: "glow" });
    }
    return;
  }
  const f = d / 2;
  p.soft(w * 0.8, h * 0.36, 0.5, C.teal, { at: [0, h * 0.72, f], bucket: "gloss", ramp: 0.2 }, 0.2);
  // A round-cornered monitor, the lab's signature shape.
  p.soft(w * 0.4, w * 0.3, 0.9, C.ice, { at: [-w * 0.16, h * 0.76, f + 0.3], bucket: "gloss" }, 0.25);
  p.soft(w * 0.31, w * 0.21, 0.2, r() < 0.5 ? 0x9fe6e0 : 0xb9f0c8, { at: [-w * 0.16, h * 0.76, f + 0.72], bucket: "glow" }, 0.08);
  for (let i = 0; i < 3; i += 1) {
    p.cyl(0.55, 0.55, 0.3, C.cream, { at: [w * 0.22, h * 0.84 - i * 1.5, f + 0.35], rot: [HALF_PI, 0, 0] }, 14);
    p.box(0.08, 0.42, 0.06, C.red, { at: [w * 0.22, h * 0.84 - i * 1.5 + 0.14, f + 0.52], rot: [0, 0, (r() - 0.5) * 2] });
  }
  const lamps = [C.aqua, C.warm, C.red, 0x8dffb0, C.pink];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (r() < 0.22) continue;
      p.box(0.3, 0.3, 0.16, lamps[Math.floor(r() * lamps.length)], { at: [(col - 3.5) * w * 0.09, h * 0.46 - row * 0.75, f + 0.08], bucket: r() < 0.45 ? "blink" : "glow", phase: r(), halo: 0.75 });
    }
  }
  for (let i = 0; i < 6; i += 1) p.box(w * 0.56, 0.16, 0.2, C.navy, { at: [0, h * 0.14 + i * 0.42, f + 0.04], ramp: 0 });
  p.cyl(0.4, 0.4, h, C.aqua, { at: [w / 2 + 0.5, h / 2 + 1.2, d * 0.18], bucket: "gloss", ramp: 0.5 }, 10);
  p.cyl(0.26, 0.26, h * 0.7, C.amber, { at: [-w / 2 - 0.4, h * 0.35 + 1.2, d * 0.1], bucket: "gloss", ramp: 0.5 }, 8);
}

function shell(p: Painter) {
  p.box(2, 50, 262, C.navy, { at: [-49, 25, -112], ramp: 0 });
  p.box(2, 50, 262, C.navy, { at: [49, 25, -112], ramp: 0 });
  p.box(100, 50, 2, C.navy, { at: [0, 25, -238], ramp: 0 });
  p.box(100, 2, 262, 0x060a2c, { at: [0, 49, -112], ramp: 0 });
  // Roof trusses and the long pipes that run the length of the hall.
  for (let z = 6; z > -236; z -= 16) {
    p.box(96, 1.4, 1.4, C.deep, { at: [0, 44, z], ramp: 0.1 });
    p.box(1.2, 5, 1.2, C.deep, { at: [-24, 46.5, z], ramp: 0 });
    p.box(1.2, 5, 1.2, C.deep, { at: [24, 46.5, z], ramp: 0 });
  }
  const pipes: Array<[number, number, number, number]> = [[-20, 40, 1.5, C.steel], [-9, 42, 0.8, C.teal], [3, 41.5, 1.1, C.deep], [11, 42.5, 0.6, C.amber], [22, 40, 1.6, C.steel]];
  for (const [x, y, radius, color] of pipes) {
    p.cyl(radius, radius, 250, color, { at: [x, y, -112], rot: [HALF_PI, 0, 0], bucket: "gloss", ramp: 0 }, 10);
    for (let z = 0; z > -230; z -= 22) p.ring(radius + 0.12, 0.16, C.ice, { at: [x, y, z], ramp: 0 }, 12);
  }
}

function towers(p: Painter) {
  const r = rng(2026);
  // Stations take the place of a near tower on their side of the aisle.
  const reserved: Array<[number, number]> = [[-1, -32], [1, -58], [-1, -126], [1, -152]];
  const rows: Array<{ x: number; min: number; span: number; detail: boolean; width: number }> = [
    { x: 23, min: 13, span: 9, detail: true, width: 9 },
    { x: 34, min: 24, span: 10, detail: false, width: 11 },
    { x: 44, min: 34, span: 9, detail: false, width: 10 },
  ];
  for (const row of rows) {
    for (const side of [-1, 1]) {
      for (let z = -6; z > -226; z -= 13) {
        if (row.detail && reserved.some(([s, rz]) => s === side && Math.abs(rz - z) < 9)) continue;
        const w = row.width * (0.8 + r() * 0.35);
        p.push([side * (row.x + (r() - 0.5) * 2), 0, z + (r() - 0.5) * 3], face(side));
        tower(p, w, 8, row.min + r() * row.span, r, row.detail);
        p.pop();
      }
    }
  }
  // Reactor tanks: the tallest things in the room.
  for (const [x, z] of [[-37, -70], [37, -104], [-37, -160], [37, -196]] as const) {
    p.cyl(5, 5.4, 36, C.teal, { at: [x, 18, z], bucket: "gloss", ramp: 0.55 }, 20);
    p.ball(5, C.teal, { at: [x, 36, z], bucket: "gloss" }, 16);
    for (const y of [8, 17, 26]) p.ring(5.3, 0.3, 0x9fe6e0, { at: [x, y, z], rot: [HALF_PI, 0, 0], bucket: "glow" }, 28);
  }
}

function cables(p: Painter) {
  const r = rng(77);
  const colors = [C.navy, C.deep, C.steel, C.navy, C.pink, C.deep, C.teal];
  for (let i = 0; i < 30; i += 1) {
    const z = 2 - i * 7.6;
    const x0 = (r() - 0.5) * 60;
    const x1 = x0 + (r() - 0.5) * 34;
    const low = 13 + r() * 14;
    p.tube(
      [
        [x0, 44, z],
        [x0 + (x1 - x0) * 0.2, low + 9, z - 2 - r() * 3],
        [(x0 + x1) / 2, low, z - 4 + (r() - 0.5) * 6],
        [x0 + (x1 - x0) * 0.8, low + 7 + r() * 5, z - 6 - r() * 3],
        [x1, 44, z - 9],
      ],
      0.16 + r() * 0.2,
      colors[i % colors.length],
    );
  }
  // Heavy cables that droop across the top of the first shot, as in the reference paintings.
  p.tube([[-30, 30, 4], [-14, 13.5, 1], [2, 11.5, 0], [16, 15, 2], [30, 32, 5]], 0.55, C.navy, undefined, 40);
  p.tube([[-34, 26, -4], [-10, 15.5, -7], [8, 17.5, -8], [34, 28, -5]], 0.4, C.deep, undefined, 40);
}

/** A hanging lamp, its cone of light through the haze, and the pool it leaves on the floor. */
function spotlight(p: Painter, x: number, z: number, radius = 7, color = 0x2c2410, height = 26) {
  p.cyl(0.08, 0.08, 44 - height, C.navy, { at: [x, (44 + height) / 2, z], ramp: 0 }, 5);
  p.cyl(0.5, 1.5, 1.6, C.navy, { at: [x, height + 0.8, z], bucket: "gloss" }, 14);
  p.cyl(1.3, 1.3, 0.1, 0xfff0c0, { at: [x, height + 0.05, z], bucket: "glow", halo: 4, haloColor: 0xffd890 }, 14);
  p.cyl(1.1, radius, height, color, { at: [x, height / 2, z], bucket: "beam" }, 24, true);
  p.add(new THREE.ConeGeometry(radius * 1.05, 0.02, 28, 1, true), color, { at: [x, 0.04, z], bucket: "beam" });
}

function christmas(p: Painter) {
  const r = rng(1225);
  p.push([-7, 0, -9], 0, 0.55);
  p.cyl(0.55, 0.7, 2, C.wood, { at: [0, 1, 0] }, 10);
  // The pine: stacked tiers, spiral lights, red and gold ornaments, a star on top.
  const tiers = 6;
  for (let i = 0; i < tiers; i += 1) {
    const radius = 3.6 - i * 0.52;
    p.add(new THREE.ConeGeometry(radius, 2.7, 18), C.green, { at: [0, 2.6 + i * 1.55, 0], ramp: 0.55 });
  }
  const top = 2.6 + (tiers - 1) * 1.55 + 1.6;
  p.add(starGeometry(1.05, 0.46, 0.34, 0xffc94a, 0xfffbe6), C.warm, { at: [0, top + 0.75, 0], bucket: "glow", keep: true, halo: 3.4, haloColor: 0xffc860 });
  p.cyl(0.08, 0.12, 0.6, C.amber, { at: [0, top + 0.05, 0], bucket: "gloss" }, 8);
  for (let i = 0; i < 70; i += 1) {
    const t = i / 70;
    const y = 1.6 + t * (top - 2.2);
    const radius = (1 - t) * 3.5 + 0.18;
    const angle = t * Math.PI * 9;
    const at: [number, number, number] = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    if (i % 3 === 0) p.ball(0.26, i % 2 === 0 ? 0xd8322e : 0xf2b632, { at, bucket: "gloss" }, 8);
    else p.ball(0.09, r() < 0.5 ? 0xfff0b0 : 0xffc86a, { at, bucket: "blink", phase: t * 3 }, 5);
  }
  const gifts: Array<[number, number, number, number]> = [[3.2, 1.4, C.red, 0.3], [-2.6, 1.1, C.dos, -0.4], [1.2, 0.9, C.cream, 0.8]];
  for (const [x, s, color, turn] of gifts) {
    p.push([x, 0, 3 - Math.abs(x) * 0.3], turn);
    p.soft(s, s * 0.8, s, color, { at: [0, s * 0.4, 0] }, 0.08);
    p.box(s * 1.02, s * 0.82, s * 0.16, C.warm, { at: [0, s * 0.4, 0], ramp: 0 });
    p.box(s * 0.16, s * 0.82, s * 1.02, C.warm, { at: [0, s * 0.4, 0], ramp: 0 });
    p.pop();
  }
  p.pop();
  // A line of parols across the aisle, and two big ones further in.
  const palette: Array<[number, number]> = [[C.red, C.warm], [C.warm, C.pink], [0x8dffb0, C.cream], [C.pink, C.aqua], [C.cream, C.red]];
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= 12; i += 1) {
    const u = i / 12;
    points.push([-21 + u * 42, 17 - Math.sin(u * Math.PI) * 4.5, -17]);
  }
  p.tube(points, 0.05, C.navy);
  palette.forEach(([paper, trim], i) => {
    const u = (i + 1) / 6;
    parol(p, [-21 + u * 42, 17 - Math.sin(u * Math.PI) * 4.5 - 2.9, -17], 1.15, { paper, trim });
  });
  parol(p, [-13, 21, -44], 2.4, { paper: C.warm, trim: C.red }, 0.25);
  parol(p, [13, 22, -47], 2, { paper: C.pink, trim: C.cream, bulbs: [C.aqua, 0xfff0a8] }, -0.3);
  // A few more further down the hall, so the season carries all the way to the far end.
  parol(p, [-16, 23, -104], 2.2, { paper: 0x9fe6e0, trim: C.warm }, 0.4);
  parol(p, [17, 25, -138], 2.6, { paper: C.red, trim: C.warm }, -0.4);
  parol(p, [0, 30, -206], 3.2, { paper: C.warm, trim: C.pink, bulbs: [C.red, 0xfff0a8, 0x8dffb0] });
}

function consoleDesk(p: Painter) {
  p.push([0, 0, 5.8], 0, 0.6);
  // The control desk you stand behind: a long curved run in three pieces.
  p.soft(9, 1.5, 3, C.steel, { at: [0, 0.75, 0], bucket: "gloss" }, 0.3);
  for (const side of [-1, 1]) p.soft(6, 1.5, 3, C.steel, { at: [side * 7, 0.75, 1], rot: [0, -side * 0.4, 0], bucket: "gloss" }, 0.3);
  p.soft(8.6, 0.3, 2.6, C.deep, { at: [0, 1.62, 0.1], rot: [0.18, 0, 0], bucket: "gloss", ramp: 0.15 }, 0.1);
  const keys = [C.cream, C.cream, C.aqua, C.cream, C.warm, C.cream, C.cream, C.pink];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      p.soft(0.3, 0.14, 0.3, keys[(row * 3 + col) % keys.length], { at: [-0.4 + col * 0.42, 1.86 - row * 0.075, -0.75 + row * 0.42], rot: [0.18, 0, 0], bucket: "gloss", ramp: 0.1 }, 0.05);
    }
  }
  // The big red button, and two levers.
  p.cyl(0.6, 0.7, 0.2, C.cream, { at: [-2.2, 1.86, 0.3], bucket: "gloss" }, 18);
  for (const [x, lean, color] of [[-3.3, 0.35, C.aqua], [-3.8, -0.3, C.warm]] as const) {
    p.cyl(0.06, 0.06, 0.9, C.ice, { at: [x, 2.1, 0.2], rot: [lean, 0, 0] }, 6);
    p.ball(0.16, color, { at: [x, 2.52, 0.2 + lean * 0.42], bucket: "gloss" }, 8);
  }
  // Left: the CRT. Right: a roll printer with its paper running out.
  p.soft(3.4, 2.8, 2.8, C.ice, { at: [-6.6, 2.9, 0.8], rot: [0, 0.42, 0], bucket: "gloss" }, 0.5);
  p.soft(2.7, 2.1, 0.12, 0x061826, { at: [-6.05, 2.95, 2.08], rot: [0, 0.42, 0] }, 0.2);
  p.soft(3, 1.5, 2.2, C.steel, { at: [6.6, 2.25, 0.9], rot: [0, -0.42, 0], bucket: "gloss" }, 0.3);
  p.cyl(0.55, 0.55, 2, C.cream, { at: [6.5, 3.3, 0.9], rot: [0, -0.42, HALF_PI] }, 16);
  p.box(1.8, 0.03, 1.6, C.cream, { at: [6.25, 2.72, 1.9], rot: [0.5, -0.42, 0], ramp: 0 });
  for (let i = 0; i < 3; i += 1) p.box(0.3, 0.34, 0.1, [C.red, C.warm, 0x8dffb0][i], { at: [5.7 + i * 0.45, 2.2, 2.05], rot: [0, -0.42, 0], bucket: "blink" });
  p.pop();
  // A stool left out in the aisle, for scale.
  p.push([0, 0, -1.5], 0, 0.45);
  p.cyl(0.85, 0.85, 0.16, C.dos, { at: [4.5, 1.7, -6], bucket: "gloss" }, 16);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    p.cyl(0.06, 0.06, 1.7, C.ice, { at: [4.5 + Math.cos(a) * 0.6, 0.85, -6 + Math.sin(a) * 0.6], rot: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14] }, 6);
  }
  p.ring(0.55, 0.04, C.ice, { at: [4.5, 0.6, -6], rot: [HALF_PI, 0, 0] }, 16);
  p.pop();
}

/** Three giant knife switches, one per skill area. */
function breakerWall(p: Painter) {
  p.push([-18.5, 0, -32], face(-1));
  p.soft(16, 13, 1.6, C.navy, { at: [0, 7.5, 0], bucket: "gloss" }, 0.4);
  const lamps = [0x9fe6e0, C.red, 0x8dffb0];
  for (let i = 0; i < 3; i += 1) {
    const x = (i - 1) * 4.8;
    const thrown = i === 1;
    p.soft(3, 6.4, 0.4, C.cream, { at: [x, 7, 0.95] }, 0.2);
    for (const y of [4.9, 9.1]) p.soft(0.9, 0.7, 0.9, C.amber, { at: [x, y, 1.5], bucket: "gloss" }, 0.12);
    const tilt = thrown ? 0 : -0.75;
    p.box(0.3, 4.4, 0.6, C.ice, { at: [x, 4.9 + Math.cos(tilt) * 2.2, 1.7 - Math.sin(tilt) * 2.2], rot: [tilt, 0, 0], bucket: "gloss" });
    p.cyl(0.28, 0.28, 1.5, thrown ? C.red : C.wood, { at: [x, 4.9 + Math.cos(tilt) * 4.6, 1.7 - Math.sin(tilt) * 4.6], rot: [0, 0, HALF_PI], bucket: "gloss" }, 10);
    p.ball(0.55, thrown ? lamps[i] : 0x24406e, { at: [x, 12, 1.1], bucket: thrown ? "glow" : "gloss", halo: thrown ? 2.4 : 0 }, 10);
    p.cyl(0.3, 0.3, 32, C.steel, { at: [x, 28, 0.2], bucket: "gloss", ramp: 0.1 }, 8);
  }
  p.pop();
}

/** Pneumatic mail: glass tubes drop from the ceiling into a receiving tray. */
function tubes(p: Painter) {
  p.push([19, 0, -58], face(1));
  p.soft(14, 10, 1.2, C.deep, { at: [0, 6, 0], bucket: "gloss" }, 0.3);
  for (let i = 0; i < 4; i += 1) {
    const x = (i - 1.5) * 2.9;
    p.cyl(0.75, 0.75, 37, C.ice, { at: [x, 21.5, 1.6], bucket: "glass", ramp: 0 }, 14, true);
    for (let y = 6; y < 40; y += 6.5) p.ring(0.82, 0.1, C.steel, { at: [x, y, 1.6], rot: [HALF_PI, 0, 0], ramp: 0 }, 14);
    p.cyl(0.95, 1.1, 0.8, C.steel, { at: [x, 2.9, 1.6], bucket: "gloss" }, 14);
  }
  // The tray, with two canisters opened and their ID badges out.
  p.soft(13, 1.3, 3.6, C.steel, { at: [0, 0.65, 3], bucket: "gloss" }, 0.25);
  p.soft(12.4, 0.2, 3.1, C.cream, { at: [0, 1.4, 3] }, 0.08);
  for (const [x, color, turn] of [[-3.4, C.pink, 0.5], [2.2, C.warm, -0.3]] as const) {
    p.cyl(0.5, 0.5, 1.5, color, { at: [x, 2, 3.2], rot: [0, turn, HALF_PI], bucket: "gloss" }, 12);
    p.soft(1.1, 0.05, 1.5, C.cream, { at: [x + 1.6, 1.55, 3.3], rot: [0, turn * 0.6, 0], ramp: 0 }, 0.02);
    p.box(1.1, 0.06, 0.36, C.dos, { at: [x + 1.6, 1.57, 2.85], rot: [0, turn * 0.6, 0], ramp: 0 });
    p.box(0.4, 0.06, 0.4, C.navy, { at: [x + 1.4, 1.57, 3.5], rot: [0, turn * 0.6, 0], ramp: 0 });
  }
  p.pop();
  // The trunk line: the tubes join one pipe that runs all the way to the outbox at the far end.
  p.cyl(0.9, 0.9, 168, C.ice, { at: [15, 34, -142], rot: [HALF_PI, 0, 0], bucket: "glass", ramp: 0 }, 14, true);
  for (let z = -62; z > -224; z -= 12) p.ring(0.98, 0.12, C.steel, { at: [15, 34, z], ramp: 0 }, 14);
}

/** The base of the centre platform; the turning part is built separately so it can rotate. */
function platformBase(p: Painter) {
  p.cyl(11.5, 12, 0.5, C.navy, { at: [0, 0.25, -92] }, 36);
  p.cyl(10.2, 10.6, 0.5, C.steel, { at: [0, 0.75, -92], bucket: "gloss" }, 36);
  p.ring(10.4, 0.16, 0x9fe6e0, { at: [0, 1.02, -92], rot: [HALF_PI, 0, 0], bucket: "glow" }, 48);
  // The emitter overhead, after the hourglass machine in the first reference.
  p.cyl(0.5, 0.5, 14, C.navy, { at: [0, 37, -92], ramp: 0 }, 8);
  p.cyl(2.2, 3.6, 3, C.teal, { at: [0, 28.5, -92], bucket: "gloss" }, 20);
  p.cyl(3.6, 2.6, 1.2, C.steel, { at: [0, 26.4, -92], bucket: "gloss" }, 20);
  p.cyl(2.4, 2.4, 0.12, 0xc8f4ee, { at: [0, 25.75, -92], bucket: "glow", halo: 6, haloColor: 0x7fe0e8 }, 20);
  p.cyl(2.2, 9.4, 24.6, 0x0e262c, { at: [0, 13.4, -92], bucket: "beam" }, 28, true);
}

/** The three project machines, standing on the turning disc. Built around the origin. */
function projectMachines(p: Painter) {
  p.cyl(9.2, 9.2, 0.4, C.ice, { at: [0, 1.2, 0], bucket: "gloss", ramp: 0.1 }, 36);
  p.ring(6.2, 0.08, C.steel, { at: [0, 1.42, 0], rot: [HALF_PI, 0, 0], ramp: 0 }, 40);
  const place = (i: number) => {
    const a = (i / 3) * Math.PI * 2;
    p.push([Math.sin(a) * 5.6, 1.4, Math.cos(a) * 5.6], a);
  };
  // dfCTF: a vault with a flag locked inside (one already captured on the roof).
  place(0);
  p.soft(4.4, 4.6, 3.8, C.steel, { at: [0, 2.3, 0], bucket: "gloss" }, 0.4);
  p.ring(1.6, 0.22, C.cream, { at: [0, 2.4, 1.92] }, 24);
  p.cyl(1.5, 1.5, 0.3, C.deep, { at: [0, 2.4, 1.85], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 24);
  p.ring(0.75, 0.09, C.amber, { at: [0, 2.4, 2.15], bucket: "gloss" }, 16);
  for (let i = 0; i < 3; i += 1) p.box(0.1, 1.5, 0.1, C.amber, { at: [0, 2.4, 2.15], rot: [0, 0, (i / 3) * Math.PI], bucket: "gloss" });
  for (const y of [1.1, 3.7]) p.soft(0.5, 0.7, 0.4, C.ice, { at: [-1.95, y, 1.95], bucket: "gloss" }, 0.1);
  p.cyl(0.06, 0.06, 2.6, C.ice, { at: [1.2, 5.9, 0] }, 6);
  p.add(new THREE.ConeGeometry(0.6, 1.4, 3), C.red, { at: [1.9, 6.7, 0], rot: [0, 0, -HALF_PI], scale: [1, 1, 0.12], ramp: 0.1 });
  p.pop();
  // BELaude: a calculating engine whose needle climbs toward honors.
  place(1);
  p.soft(4.6, 3.2, 3.2, C.teal, { at: [0, 1.6, 0], bucket: "gloss" }, 0.35);
  p.cyl(1.25, 1.25, 0.3, C.cream, { at: [-0.9, 3.9, 1], rot: [HALF_PI, 0, 0] }, 24);
  p.ring(1.25, 0.12, C.navy, { at: [-0.9, 3.9, 1.15] }, 24);
  p.box(0.1, 1.05, 0.08, C.red, { at: [-0.62, 4.28, 1.22], rot: [0, 0, -0.62], bucket: "gloss" });
  for (let i = 0; i < 3; i += 1) {
    const radius = [1.05, 0.72, 0.5][i];
    p.cyl(radius, radius, 0.4, [C.amber, C.cream, C.amber][i], { at: [1.2 + (i === 1 ? 0.4 : 0), 3.5 + i * 0.75, -0.2], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 10);
  }
  for (let i = 0; i < 5; i += 1) p.cyl(0.3, 0.3, 0.34, C.cream, { at: [-1.4 + i * 0.7, 1.7, 1.62], rot: [0, 0, HALF_PI] }, 10);
  p.cyl(0.08, 0.08, 1.8, C.ice, { at: [2.6, 2.4, 0.6], rot: [0.4, 0, 0] }, 6);
  p.ball(0.26, C.red, { at: [2.6, 3.24, 0.95], bucket: "gloss" }, 8);
  p.pop();
  // Sylvi: a photo booth with an ID strip coming out of the slot.
  place(2);
  p.soft(3.2, 5.6, 3.2, C.dos, { at: [0, 2.8, 0], bucket: "gloss" }, 0.35);
  p.box(1.5, 3.4, 0.2, C.pink, { at: [0.6, 2.3, 1.62], ramp: 0.5 });
  p.box(1.7, 0.16, 0.26, C.ice, { at: [0.6, 4.08, 1.62], ramp: 0 });
  p.ring(0.42, 0.1, C.cream, { at: [-0.9, 4.2, 1.64] }, 14);
  p.ball(0.3, 0xc8f4ee, { at: [-0.9, 4.2, 1.6], bucket: "glow", halo: 1.1 }, 10);
  p.soft(2.6, 0.7, 0.3, C.warm, { at: [0, 5.95, 1.3], bucket: "glow" }, 0.12);
  p.box(0.6, 1.9, 0.04, C.cream, { at: [-0.9, 1.9, 1.66], ramp: 0 });
  for (let i = 0; i < 3; i += 1) p.box(0.42, 0.42, 0.02, C.deep, { at: [-0.9, 2.5 - i * 0.55, 1.69], ramp: 0 });
  p.pop();
}

/** A flat-file cabinet, one drawer per repository, with a blueprint out on the drawer. */
function cabinet(p: Painter) {
  p.push([-18.5, 0, -126], face(-1));
  p.soft(11, 5.6, 3.6, C.steel, { at: [0, 2.8, 0], bucket: "gloss" }, 0.3);
  // The drawers are a rig (rigs.ts); this is the dark well they slide out of.
  p.box(10.6, 5, 0.1, 0x070d33, { at: [0, 2.8, 1.78], ramp: 0 });
  const rolls = [C.dos, C.cream, C.dos, C.ice, C.cream];
  rolls.forEach((color, i) => p.cyl(0.24, 0.24, 3.4, color, { at: [-2.4 + i * 0.6, 5.86 + (i % 2) * 0.1, 0.4 - (i % 3) * 0.4], rot: [0, 0.2 * (i % 2), HALF_PI], ramp: 0.1 }, 10));
  // A drafting lamp over the open drawer.
  p.cyl(0.07, 0.07, 3, C.ice, { at: [4.2, 7, 0.8], rot: [0.5, 0, 0] }, 6);
  p.cyl(0.25, 0.7, 0.8, C.amber, { at: [4.2, 8.2, 1.9], rot: [0.9, 0, 0], bucket: "gloss" }, 12);
  p.cyl(0.6, 2.8, 6.6, 0x2c2511, { at: [3.6, 5, 3.6], rot: [0.5, 0, 0.1], bucket: "beam" }, 16, true);
  p.pop();
}

/** An overhead projector throwing the research paper onto a pull-down screen. */
function projector(p: Painter) {
  p.push([19, 0, -152], face(1));
  p.box(10.4, 0.4, 0.5, C.navy, { at: [0, 10.3, 0.4], ramp: 0 });
  p.box(10, 7.4, 0.14, C.cream, { at: [0, 6.4, 0.5], ramp: 0.12 });
  for (const x of [-4.9, 4.9]) p.cyl(0.1, 0.1, 10.4, C.ice, { at: [x, 5.2, 0.4] }, 6);
  // The cart and the projector itself.
  p.soft(2.8, 1.8, 2.2, C.steel, { at: [0, 1.4, 9.6], bucket: "gloss" }, 0.2);
  for (const x of [-1.1, 1.1]) p.cyl(0.25, 0.25, 0.3, C.navy, { at: [x, 0.25, 9.6], rot: [0, 0, HALF_PI] }, 10);
  p.soft(2, 1, 2, C.ice, { at: [0, 2.8, 9.6], bucket: "gloss" }, 0.2);
  p.box(1.3, 0.06, 1.3, 0xfff6d8, { at: [0, 3.33, 9.6], bucket: "glow" });
  p.cyl(0.08, 0.08, 2.4, C.ice, { at: [0.8, 4.4, 10.3] }, 6);
  p.soft(1, 0.7, 1.3, C.ice, { at: [0.3, 5.6, 9.7], bucket: "gloss" }, 0.15);
  p.cyl(0.36, 0.36, 0.3, 0xfff6d8, { at: [0.3, 5.6, 9], rot: [HALF_PI, 0, 0], bucket: "glow", halo: 2.2 }, 12);
  p.cyl(0.4, 4.8, 8.3, 0x2a2719, { at: [0.15, 6, 4.85], rot: [HALF_PI + 0.05, 0, 0], bucket: "beam" }, 20, true);
  for (let i = 0; i < 4; i += 1) p.box(0.9, 0.08, 0.9, i % 2 ? C.cream : C.ice, { at: [-0.8, 2.36 + i * 0.09, 10.2], rot: [0, i * 0.2, 0], ramp: 0 });
  p.pop();
}

/** The far end: the vault door out of the lab, the outbox where mail leaves, and the arcade cabinet. */
function exitWall(p: Painter) {
  p.soft(64, 40, 4, C.deep, { at: [0, 20, -234], bucket: "gloss", ramp: 0.5 }, 1);
  p.ring(10, 0.9, C.steel, { at: [0, 11, -231.6], bucket: "gloss" }, 40);
  p.cyl(9.2, 9.2, 1, C.teal, { at: [0, 11, -231.8], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 40);
  p.ring(10.9, 0.22, 0x9fe6e0, { at: [0, 11, -231.9], bucket: "glow" }, 48);
  // The door itself: a stepped face, a ring of locking bolts, hinges, and the wheel that opens it.
  p.cyl(7.2, 7.6, 0.6, C.steel, { at: [0, 11, -231.1], rot: [HALF_PI, 0, 0], bucket: "gloss", ramp: 0.2 }, 40);
  p.ring(5.2, 0.12, C.navy, { at: [0, 11, -230.75], ramp: 0 }, 40);
  for (let i = 0; i < 20; i += 1) {
    const a = (i / 20) * Math.PI * 2;
    p.cyl(0.32, 0.32, 0.5, C.ice, { at: [Math.cos(a) * 8.4, 11 + Math.sin(a) * 8.4, -231], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 10);
  }
  for (const y of [5.5, 16.5]) p.soft(2.2, 2.4, 1.4, C.deep, { at: [-10.3, y, -231.2], bucket: "gloss" }, 0.3);
  p.ring(2.9, 0.32, C.amber, { at: [0, 11, -230.2], bucket: "gloss" }, 36);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI;
    p.cyl(0.16, 0.16, 5.8, C.amber, { at: [0, 11, -230.2], rot: [0, 0, a], bucket: "gloss" }, 8);
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    p.ball(0.34, C.amber, { at: [Math.cos(a) * 2.9, 11 + Math.sin(a) * 2.9, -230.2], bucket: "gloss" }, 10);
  }
  p.cyl(0.9, 1.1, 1.2, C.amber, { at: [0, 11, -230.5], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 20);
  p.cyl(0.5, 0.5, 0.3, C.red, { at: [0, 11, -229.8], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 16);
  // The readout above the door.
  p.soft(34, 8, 0.6, 0x163a6a, { at: [0, 31, -231.6], bucket: "glow" }, 0.4);
  for (let i = 0; i < 26; i += 1) p.box(0.6, 0.8 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)) * 5, 0.2, i % 5 === 0 ? C.warm : 0x9fe6e0, { at: [-15.6 + i * 1.25, 31, -231.2], bucket: "blink", phase: i / 26, halo: 0 });
  // Tesla towers either side.
  for (const x of [-19, 19]) {
    p.cyl(1.4, 2.4, 10, C.steel, { at: [x, 5, -222], bucket: "gloss" }, 14);
    p.cyl(0.7, 0.9, 10, C.cream, { at: [x, 15, -222], bucket: "gloss", ramp: 0.2 }, 14);
    for (let i = 0; i < 9; i += 1) p.ring(1.05, 0.12, C.amber, { at: [x, 10.6 + i * 1.05, -222], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 18);
    p.ring(2.4, 0.7, C.steel, { at: [x, 21, -222], rot: [HALF_PI, 0, 0], bucket: "gloss" }, 24);
    p.ball(1.1, 0xc8f4ee, { at: [x, 22.4, -222], bucket: "glow", halo: 4.5, haloColor: 0x8fe8ff }, 14);
  }
  // The outbox: the trunk tube comes down to a desk with one canister ready to go.
  p.cyl(0.9, 0.9, 30, C.ice, { at: [15, 19, -226], bucket: "glass", ramp: 0 }, 14, true);
  p.cyl(1.2, 1.4, 1.2, C.steel, { at: [15, 3.6, -226], bucket: "gloss" }, 14);
  p.soft(7, 3, 3.4, C.steel, { at: [14, 1.5, -224.5], bucket: "gloss" }, 0.3);
  p.cyl(0.55, 0.62, 0.3, C.red, { at: [12.2, 3.2, -223.6], bucket: "gloss" }, 16);
  // The arcade cabinet where the runner game lives.
  p.push([-11, 0, -212], 0.45);
  p.soft(2.8, 5.2, 2.8, C.dos, { at: [0, 2.6, 0], bucket: "gloss" }, 0.3);
  p.soft(2.2, 1.7, 0.2, 0xc8f4ee, { at: [0, 3.7, 1.36], rot: [-0.2, 0, 0], bucket: "glow" }, 0.12);
  p.box(0.3, 0.3, 0.04, C.dos, { at: [-0.5, 3.4, 1.52], rot: [-0.2, 0, 0], bucket: "glow" });
  for (let i = 0; i < 3; i += 1) p.box(0.16, 0.3 + i * 0.12, 0.04, C.navy, { at: [0.2 + i * 0.3, 3.36, 1.5], rot: [-0.2, 0, 0], bucket: "glow" });
  p.soft(2.4, 0.7, 0.3, C.warm, { at: [0, 5, 1.3], bucket: "glow" }, 0.1);
  p.soft(2.6, 0.3, 1.2, C.cream, { at: [0, 2.3, 1.7], rot: [0.25, 0, 0] }, 0.08);
  p.cyl(0.05, 0.05, 0.5, C.ice, { at: [-0.6, 2.7, 1.7] }, 6);
  p.ball(0.15, C.red, { at: [-0.6, 3, 1.7], bucket: "gloss" }, 8);
  for (let i = 0; i < 2; i += 1) p.cyl(0.14, 0.14, 0.1, i ? C.warm : C.aqua, { at: [0.4 + i * 0.4, 2.52, 1.75], bucket: "gloss" }, 10);
  p.pop();
}

/** Catwalks that cross the hall high up: a person-sized thing far overhead makes the room read as huge. */
function catwalks(p: Painter) {
  for (const z of [-42, -112, -200]) {
    p.box(40, 0.4, 3, C.steel, { at: [0, 24, z], ramp: 0.1 });
    for (const dz of [-1.5, 1.5]) {
      p.box(40, 0.1, 0.1, C.ice, { at: [0, 25.3, z + dz], ramp: 0 });
      for (let x = -20; x <= 20; x += 2.5) p.box(0.08, 1.3, 0.08, C.ice, { at: [x, 24.7, z + dz], ramp: 0 });
    }
    for (const x of [-20, 20]) p.box(0.8, 24, 0.8, C.deep, { at: [x, 12, z], ramp: 0.3 });
  }
}

export type BigLab = {
  group: THREE.Group;
  /** Machines the reader can press, pull and open, one or more per shot. */
  rigs: Rig[];
  /** Advance everything that moves. `t` in seconds; `still` snaps to rest (reduced motion). */
  update: (t: number, dt: number, still: boolean) => void;
  dispose: () => void;
};

export function createBigLab(): BigLab {
  const materials = createMaterials();
  const group = new THREE.Group();

  const p = new Painter();
  shell(p);
  towers(p);
  catwalks(p);
  cables(p);
  christmas(p);
  consoleDesk(p);
  breakerWall(p);
  tubes(p);
  platformBase(p);
  cabinet(p);
  projector(p);
  exitWall(p);
  const props = createProps(group, materials, p);
  spotlight(p, 0, -6, 8);
  spotlight(p, -7, -9, 4.5, 0x241b0a, 22);
  spotlight(p, -12, -32, 7);
  spotlight(p, 13, -56, 7);
  spotlight(p, -13, -124, 7);
  spotlight(p, 8, -150, 6, 0x141c28);
  spotlight(p, 0, -180, 10, 0x241d0d, 30);
  spotlight(p, -9, -210, 6);
  spotlight(p, 12, -222, 6);
  group.add(p.build(materials));

  const turning = new Painter();
  projectMachines(turning);
  const platform = turning.build(materials);
  platform.position.set(0, 0, -92);
  // A turning caster's shadow would need the shadow map redrawn every frame; the disc is lit, not shadowed.
  platform.traverse((object) => { object.castShadow = false; });
  group.add(platform);
  const rigs = createRigs(group, materials, platform);

  const floorMap = floorTexture();
  // Waxed lino: a soft sheen that picks up the lamps and the screen glow travelling with each shot.
  const floorMaterial = gouache(new THREE.MeshPhongMaterial({ map: floorMap, specular: 0x2a3a5c, shininess: 26 }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(96, 260), floorMaterial);
  floor.rotation.x = -HALF_PI;
  floor.position.set(0, 0, -112);
  floor.receiveShadow = true;
  group.add(floor);

  // Dust in the light: a few hundred motes that drift up through the first eighty metres of each shot.
  const MOTES = 420;
  const motes = new Float32Array(MOTES * 3);
  const r = rng(5);
  for (let i = 0; i < MOTES; i += 1) {
    motes[i * 3] = (r() - 0.5) * 44;
    motes[i * 3 + 1] = r() * 26;
    motes[i * 3 + 2] = 8 - r() * 236;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(motes, 3));
  // Each mote is a soft round speck, not the hard square a bare point draws.
  const speck = document.createElement("canvas");
  speck.width = speck.height = 32;
  const sctx = speck.getContext("2d")!;
  const fall = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  fall.addColorStop(0, "rgb(255 255 255 / 1)");
  fall.addColorStop(0.35, "rgb(255 255 255 / 0.45)");
  fall.addColorStop(1, "rgb(255 255 255 / 0)");
  sctx.fillStyle = fall;
  sctx.fillRect(0, 0, 32, 32);
  const speckMap = new THREE.CanvasTexture(speck);
  const dustMaterial = new THREE.PointsMaterial({ color: 0xfff0c8, map: speckMap, size: 0.22, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  group.add(dust);

  return {
    group,
    rigs,
    update(t, dt, still) {
      clock.value = t;
      props.update(t, dt, still);
      for (const rig of rigs) rig.update(t, dt, still);
      const position = dustGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < MOTES; i += 1) {
        const y = position.getY(i) + dt * (0.12 + (i % 7) * 0.02);
        position.setY(i, y > 26 ? 0 : y);
      }
      position.needsUpdate = true;
    },
    dispose() {
      const owned = new Set<THREE.Material>();
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
      speckMap.dispose();
        if (Array.isArray(material)) material.forEach((m) => owned.add(m));
        else if (material) owned.add(material);
      });
      for (const material of Object.values(materials)) owned.add(material);
      owned.forEach((material) => material.dispose());
      floorMaterial.dispose();
      floorMap.dispose();
      dustMaterial.dispose();
    },
  };
}
