"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { createFilipinoLab, narraTexture, sawaliTexture, signTexture } from "@/lib/filipino-lab";
import { createChristmasDecor } from "@/lib/christmas-lab";
import { addLabProps } from "@/lib/lab-props";

export type FocusStation = "terminal" | "core" | "tank" | "bench" | "rack";
export type StationId = "overview" | FocusStation | "free";

type Lab3DCanvasProps = {
  station: StationId;
  onStationChange: (station: StationId) => void;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
};

const INK_DEEP = 0x0a0a5d;
const INK = 0x1313ba;
const NEON = 0x6666fd;
const LAVENDER = 0xcbcbef;
const PAPER = 0xf6f6fc;

const DEG = Math.PI / 180;
/** Load-in length: the last props land a little under three seconds after the first frame. */
const ASSEMBLE_SECONDS = 3.1;
const LIMITS = { thetaMin: -60 * DEG, thetaMax: 60 * DEG, phiMin: 38 * DEG, phiMax: 88 * DEG, radiusMin: 2.6 };
/** The lab is a diorama seen from outside; these bounds only keep the camera above the table and out of the back wall. */
const ROOM = { x: 40, zFront: 40, yMin: 0.6, yMax: 40 };
/** Cutaway room: floor slab from the back wall (z = -4.3) to an open front edge. */
const ROOM_DEPTH = 13.5;
const ROOM_CENTER_Z = -4.3 + ROOM_DEPTH / 2;
/** The floor runs from the left wall (x = -7.3) out past the right of the original lab, to x = 13. */
const ROOM_WIDTH = 20.3;
const ROOM_CENTER_X = -7.3 + ROOM_WIDTH / 2;
const WALL_H = 7;

/** Clay render: one matte white for everything, DOS blue for the lab hardware, a pale table to sit on. */
const CLAY = 0xf3f3f5;
const ACCENT = 0x2323d2;
const BACKDROP = 0xeef0f6;

type Preset = { target: [number, number, number]; theta: number; phi: number; radius: number };

const OVERVIEW: Preset = { target: [2.6, 1.5, 2.4], theta: 8 * DEG, phi: 58 * DEG, radius: 33 };

const PRESETS: Record<FocusStation, Preset> = {
  terminal: { target: [0.75, 1.75, -3.3], theta: 14 * DEG, phi: 80 * DEG, radius: 4.6 },
  core: { target: [-2.4, 1.6, 0.8], theta: -18 * DEG, phi: 70 * DEG, radius: 6.5 },
  tank: { target: [4.6, 1.85, 0.3], theta: 22 * DEG, phi: 74 * DEG, radius: 7.5 },
  bench: { target: [-6.1, 1.5, 1.2], theta: 55 * DEG, phi: 68 * DEG, radius: 6 },
  rack: { target: [-4.6, 1.6, -3.4], theta: -10 * DEG, phi: 74 * DEG, radius: 6.5 },
};

/** Straight-on view of the CRT, used while the /dev/dexter window is open. */
const TERMINAL_CLOSE: Preset = { target: [0.7, 1.74, -3.4], theta: 17 * DEG, phi: 86 * DEG, radius: 2.8 };

const STATION_LABELS: Record<FocusStation, string> = {
  terminal: "Open /dev/dexter",
  core: "Christmas specimen",
  tank: "Specimen tank",
  bench: "Chem bench",
  rack: "Server rack",
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function pixelTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function createCrtTexture() {
  return pixelTexture(64, 48, (ctx) => {
    ctx.fillStyle = "#0a0a5d";
    ctx.fillRect(0, 0, 64, 48);
    ctx.fillStyle = "#6666fd";
    ctx.fillRect(0, 0, 64, 7);
    ctx.fillStyle = "#f6f6fc";
    ctx.fillRect(3, 2, 3, 3);
    ctx.fillRect(9, 3, 22, 1);
    // prompt chevron
    ctx.fillRect(5, 13, 2, 2);
    ctx.fillRect(7, 15, 2, 2);
    ctx.fillRect(5, 17, 2, 2);
    ctx.fillRect(12, 15, 26, 2);
    // output lines
    ctx.fillStyle = "#cbcbef";
    ctx.fillRect(5, 24, 40, 2);
    ctx.fillRect(5, 29, 30, 2);
    ctx.fillStyle = "#6666fd";
    ctx.fillRect(5, 34, 46, 2);
    ctx.fillStyle = "#f6f6fc";
    ctx.fillRect(5, 41, 2, 2);
    ctx.fillRect(7, 43, 2, 2);
  });
}

type LabBuild = {
  stations: THREE.Object3D[];
  markers: Map<FocusStation, THREE.Mesh>;
  tick: (t: number) => void;
  activate: (object: THREE.Object3D, instant?: boolean) => boolean;
  /** Materials that keep DOS blue in the clay render. */
  accents: Set<THREE.Material>;
  /** Materials that keep their own look (the CRT screen and the painted sign). */
  keep: Set<THREE.Material>;
};

function buildLab(root: THREE.Group, textures: THREE.Texture[]): LabBuild {
  const geos = new Map<string, THREE.BufferGeometry>();
  const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
    let g = geos.get(key);
    if (!g) {
      g = make();
      geos.set(key, g);
    }
    return g as T;
  };
  const box = (w: number, h: number, d: number) => cached(`b:${w}:${h}:${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(0.07, Math.min(w, h, d) * 0.2)));
  const cyl = (rt: number, rb: number, h: number, seg = 12, open = false) =>
    cached(`c:${rt}:${rb}:${h}:${seg}:${open}`, () => new THREE.CylinderGeometry(rt, rb, h, Math.max(24, seg), 1, open));
  const torus = (r: number, tube: number, seg = 20) =>
    cached(`t:${r}:${tube}:${seg}`, () => new THREE.TorusGeometry(r, tube, 10, Math.max(48, seg)));
  const ball = (r: number) => cached(`s:${r}`, () => new THREE.SphereGeometry(r, 20, 12));

  const put = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    shadow = true,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  };
  const flat = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = put(parent, geo, mat, x, y, z, false);
    m.rotation.x = Math.PI / 2;
    return m;
  };
  const group = (parent: THREE.Object3D, x = 0, y = 0, z = 0, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    return g;
  };
  const tube = (parent: THREE.Object3D, mat: THREE.Material, radius: number, pts: Array<[number, number, number]>) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return put(parent, new THREE.TubeGeometry(curve, pts.length * 8, radius, 6, false), mat);
  };

  const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04, flatShading: false, ...extra });

  // Filipino wooden lab: narra floorboards and woven sawali walls.
  const floorTex = narraTexture([4, 6]);
  const wallTex = sawaliTexture([16, 14]);
  const sideWallTex = sawaliTexture([20, 14]);
  textures.push(wallTex, sideWallTex);
  const crtTex = createCrtTexture();
  textures.push(floorTex, crtTex);

  const M = {
    // Warm woods for the room and furniture; the lab hardware keeps the site's ink blues.
    wall: std(0xd6c0a2, { map: wallTex, roughness: 0.9 }),
    sideWall: std(0xb89c7c, { map: sideWallTex, roughness: 0.9 }),
    floor: std(0xffffff, { roughness: 0.5, metalness: 0.02, map: floorTex }),
    paper: std(0xf1ead9),
    lav: std(0xc9cbe8),
    ink: std(0x2a3a8f),
    mid: std(0x4f78c9),
    deep: std(0x3a2214, { roughness: 0.6 }),
    steel: std(0xa4b7c6, { metalness: 0.45, roughness: 0.4 }),
    neon: std(NEON, { emissive: NEON, emissiveIntensity: 1.3 }),
    glow: std(0xffe2b2, { emissive: 0xffc67d, emissiveIntensity: 0.75 }),
    glass: new THREE.MeshStandardMaterial({
      color: PAPER,
      transparent: true,
      opacity: 0.24,
      roughness: 0.1,
      depthWrite: false,
    }),
    liquid: std(NEON, { emissive: NEON, emissiveIntensity: 0.9, transparent: true, opacity: 0.6, depthWrite: false }),
    tankFluid: std(0x3fe0d0, { emissive: 0x1bb5a8, emissiveIntensity: 0.7, transparent: true, opacity: 0.26, depthWrite: false }),
    holo: new THREE.MeshBasicMaterial({
      color: NEON,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    screen: new THREE.MeshBasicMaterial({ map: crtTex, toneMapped: false }),
    blueprint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }),
    led: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  };

  const markers = new Map<FocusStation, THREE.Mesh>();
  const station = (id: FocusStation, x: number, z: number, markerPos: [number, number, number]) => {
    const g = group(root, x, 0, z);
    g.userData.station = id;
    const marker = put(g, cached("marker", () => new THREE.OctahedronGeometry(0.09, 0)), M.glow, ...markerPos, false);
    marker.userData.baseY = markerPos[1];
    markers.set(id, marker);
    return g;
  };

  // ---------- Shell: a cutaway diorama. A floor slab, the back wall and the left wall; the
  // front and right stay open so the camera looks in from outside, like a model on a table. ----------
  put(root, box(ROOM_WIDTH, 0.4, ROOM_DEPTH), M.floor, ROOM_CENTER_X, -0.2, ROOM_CENTER_Z).castShadow = false;
  put(root, box(ROOM_WIDTH, WALL_H, 0.3), M.wall, ROOM_CENTER_X, WALL_H / 2, -4.15).castShadow = false;
  put(root, box(0.3, WALL_H, ROOM_DEPTH), M.sideWall, -7.15, WALL_H / 2, ROOM_CENTER_Z).castShadow = false;
  put(root, box(0.06, 0.2, ROOM_DEPTH), M.deep, -6.97, 0.1, ROOM_CENTER_Z, false);
  put(root, box(0.05, 0.1, ROOM_DEPTH), M.mid, -6.975, 4.6, ROOM_CENTER_Z, false);
  put(root, box(ROOM_WIDTH - 0.6, 0.2, 0.06), M.deep, ROOM_CENTER_X, 0.1, -3.97, false);
  put(root, box(ROOM_WIDTH - 0.6, 0.1, 0.05), M.mid, ROOM_CENTER_X, 4.6, -3.975, false);


  // ---------- Terminal: desk, CRT, shelf, oscilloscope ----------
  const terminal = station("terminal", 1.0, -3.3, [-0.3, 2.42, 0]);
  put(terminal, box(3.6, 0.12, 1.3), M.deep, 0, 1.0, 0);
  put(terminal, box(0.12, 0.94, 1.1), M.paper, -1.7, 0.47, 0);
  put(terminal, box(0.12, 0.94, 1.1), M.paper, 1.7, 0.47, 0);
  put(terminal, box(0.9, 0.8, 1.1), M.paper, 1.15, 0.54, 0);
  put(terminal, box(0.4, 0.05, 0.04), M.ink, 1.15, 0.74, 0.57);
  put(terminal, box(0.4, 0.05, 0.04), M.ink, 1.15, 0.42, 0.57);

  const crt = group(terminal, -0.3, 1.06, -0.12, 0.3);
  put(crt, box(0.7, 0.12, 0.6), M.lav, 0, 0.06, 0);
  put(crt, box(1.3, 1.0, 0.5), M.paper, 0, 0.66, 0.2);
  put(crt, box(0.95, 0.75, 0.5), M.lav, 0, 0.62, -0.3);
  put(crt, box(1.12, 0.84, 0.06), M.deep, 0, 0.68, 0.46);
  put(crt, new THREE.PlaneGeometry(1.0, 0.72), M.screen, 0, 0.68, 0.495, false);
  const cursor = put(crt, box(0.11, 0.035, 0.01), M.glow, -0.26, 0.385, 0.5, false);
  put(crt, box(0.05, 0.04, 0.03), M.neon, 0.52, 0.22, 0.46, false);
  const keyboard = group(crt, 0.02, 0.0, 0.72);
  put(keyboard, box(1.0, 0.07, 0.36), M.paper, 0, 0.035, 0);
  for (let r = 0; r < 3; r++) put(keyboard, box(0.88, 0.03, 0.07), r === 1 ? M.mid : M.lav, 0, 0.085, -0.11 + r * 0.11);
  put(crt, box(0.14, 0.06, 0.22), M.paper, 0.78, 0.03, 0.72);
  put(terminal, cyl(0.09, 0.08, 0.2), M.paper, 1.0, 1.16, 0.25);
  put(terminal, box(0.05, 0.12, 0.04), M.paper, 1.11, 1.16, 0.25);
  for (let i = 0; i < 3; i++) {
    const disk = put(terminal, box(0.3, 0.035, 0.3), i === 1 ? M.neon : M.ink, 1.4, 1.08 + i * 0.037, -0.25);
    disk.rotation.y = i * 0.35;
  }

  const chair = group(terminal, 0.95, 0, 1.25, -0.55);
  put(chair, cyl(0.34, 0.38, 0.06, 8), M.deep, 0, 0.03, 0);
  put(chair, cyl(0.05, 0.05, 0.5, 8), M.steel, 0, 0.3, 0);
  put(chair, box(0.62, 0.1, 0.6), M.ink, 0, 0.6, 0);
  put(chair, box(0.62, 0.7, 0.1), M.ink, 0, 1.05, 0.3);

  put(terminal, box(2.6, 0.08, 0.5), M.paper, 0.2, 2.75, -0.42);
  put(terminal, box(0.08, 0.3, 0.4), M.ink, -0.9, 2.58, -0.45);
  put(terminal, box(0.08, 0.3, 0.4), M.ink, 1.3, 2.58, -0.45);
  for (let i = 0; i < 7; i++) {
    const x = -0.9 + i * 0.36;
    if (i === 2 || i === 5) {
      for (let b = 0; b < 3; b++) {
        put(terminal, box(0.08, 0.34 - b * 0.04, 0.3), [M.ink, M.deep, M.mid][b], x - 0.09 + b * 0.09, 2.96 - b * 0.02, -0.42);
      }
    } else {
      const h = 0.26 + (i % 3) * 0.08;
      put(terminal, cyl(0.1, 0.1, h, 8), M.glass, x, 2.79 + h / 2, -0.42, false);
      put(terminal, cyl(0.08, 0.08, h * 0.55, 8), i % 2 === 0 ? M.neon : M.ink, x, 2.8 + h * 0.275, -0.42, false);
      put(terminal, cyl(0.05, 0.05, 0.06, 8), M.deep, x, 2.82 + h, -0.42, false);
    }
  }

  const scope = group(root, 0.55, 0.75, -3.34);
  put(scope, box(1.6, 1.05, 0.14), M.deep, 2.75, 2.45, -0.6);
  put(scope, box(1.15, 0.72, 0.02), M.ink, 2.6, 2.48, -0.52, false);
  for (let k = 0; k < 3; k++) put(scope, box(0.1, 0.1, 0.06), k === 0 ? M.neon : M.paper, 3.38, 2.74 - k * 0.24, -0.52, false);
  const scopeDots: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    scopeDots.push(put(scope, box(0.06, 0.06, 0.02), M.glow, 2.07 + i * 0.07, 2.48, -0.5, false));
  }

  // ---------- Back-wall blueprint board + gas cylinders ----------
  // A hand-painted "Maligayang Pasko!" board where the blueprint used to hang.
  // Mounted on the back wall (the cutaway room has no ceiling to hang it from).
  put(root, box(1.72, 0.9, 0.08), M.deep, 3.1, 4.55, -3.95);
  const board = put(root, new THREE.PlaneGeometry(1.6, 0.8), M.blueprint, 3.1, 4.55, -3.905, false);
  board.receiveShadow = false;
  for (const [x, z, mat] of [
    [6.35, -3.4, M.paper],
    [5.8, -3.5, M.lav],
  ] as const) {
    put(root, cyl(0.24, 0.24, 1.7), mat, x, 0.85, z);
    put(root, cyl(0.1, 0.2, 0.2), M.deep, x, 1.8, z);
    put(root, cyl(0.25, 0.25, 0.08), M.ink, x, 1.2, z);
  }
  // ---------- Tesla coil on the open floor ----------
  const coil = group(root, 3.6, 0, -2.6);
  put(coil, box(0.9, 0.3, 0.9), M.deep, 0, 0.15, 0);
  put(coil, cyl(0.1, 0.16, 1.2, 8), M.paper, 0, 0.9, 0);
  for (let i = 0; i < 3; i++) flat(coil, torus(0.2, 0.035, 12), M.neon, 0, 0.55 + i * 0.3, 0);
  flat(coil, torus(0.34, 0.11, 14), M.steel, 0, 1.62, 0).castShadow = true;
  put(coil, cyl(0.03, 0.03, 1.25, 6), M.steel, 0.2, 0.62, 1.2);
  put(coil, ball(0.1), M.paper, 0.2, 1.3, 1.2);
  const arcStart = new THREE.Vector3(3.65, 1.66, -2.25);
  const arcEnd = new THREE.Vector3(3.8, 1.36, -1.44);
  const arcPts = Array.from({ length: 7 }, () => new THREE.Vector3());
  const arcSegs = Array.from({ length: 6 }, () => put(root, box(0.045, 0.045, 1), M.glow, 0, 0, 0, false));

  // ---------- Server rack on the left wall ----------
  const rack = station("rack", -4.6, -3.45, [0.25, 3.2, 0]);
  rack.rotation.y = -Math.PI / 2;
  const ledSlots: Array<[number, number, number]> = [];
  for (let k = 0; k < 2; k++) {
    const z = (k - 0.5) * 1.08;
    put(rack, box(0.9, 2.7, 1.0), M.deep, 0, 1.35, z);
    put(rack, box(0.96, 0.08, 1.06), M.ink, 0, 2.74, z);
    for (let u = 0; u < 6; u++) {
      const y = 0.38 + u * 0.4;
      put(rack, box(0.02, 0.3, 0.84), M.ink, 0.46, y, z, false);
      put(rack, box(0.02, 0.05, 0.28), M.lav, 0.475, y - 0.06, z + 0.22, false);
      for (let j = 0; j < 4; j++) ledSlots.push([0.478, y + 0.06, z - 0.32 + j * 0.11]);
    }
  }
  const leds = new THREE.InstancedMesh(box(0.02, 0.06, 0.06), M.led, ledSlots.length);
  const ledMatrix = new THREE.Matrix4();
  const ledColors = [new THREE.Color(NEON), new THREE.Color(PAPER), new THREE.Color(0x2424d6)];
  ledSlots.forEach((p, i) => {
    leds.setMatrixAt(i, ledMatrix.makeTranslation(...p));
    leds.setColorAt(i, ledColors[i % 3]);
  });
  rack.add(leds);

  // floor cables: rack -> core -> tank
  tube(root, M.lav, 0.05, [
    [-4.6, 0.05, -2.9],
    [-4.2, 0.05, -1.0],
    [-3.5, 0.05, 0.3],
    [-3.15, 0.05, 0.7],
  ]);
  tube(root, M.lav, 0.05, [
    [-1.65, 0.05, 0.9],
    [0.5, 0.05, 1.7],
    [2.5, 0.05, 1.0],
    [3.6, 0.05, 0.4],
  ]);

  // The specimen platform becomes the Christmas tree's display plinth.
  const core = station("core", -2.4, 0.8, [0, 4.1, 0]);
  put(core, cyl(0.8, 0.95, 0.6), M.deep, 0, 0.3, 0);
  put(core, cyl(0.72, 0.72, 0.08), M.paper, 0, 0.64, 0);
  flat(core, torus(0.5, 0.025), M.glow, 0, 0.7, 0);
  const christmas = createChristmasDecor(root, core, terminal);

  // ---------- Specimen tank with a rotating helix ----------
  const tank = station("tank", 4.6, 0.3, [0, 3.95, 0]);
  put(tank, cyl(1.0, 1.1, 0.5), M.deep, 0, 0.25, 0);
  flat(tank, torus(0.93, 0.05, 24), M.neon, 0, 0.52, 0);
  put(tank, cyl(0.74, 0.74, 2.3, 16), M.tankFluid, 0, 1.7, 0, false);
  put(tank, cyl(0.8, 0.8, 2.5, 16, true), M.glass, 0, 1.8, 0, false);
  put(tank, cyl(0.95, 0.85, 0.4), M.deep, 0, 3.22, 0);
  put(tank, cyl(0.3, 0.3, 0.1), M.paper, 0, 3.47, 0);
  tube(tank, M.steel, 0.09, [
    // Up out of the tank, back along the ceiling line, and up the back wall (the room is open on top).
    [-0.35, 3.3, -0.45],
    [-0.45, 4.2, -1.1],
    [-0.5, 4.5, -2.6],
    [-0.5, 4.7, -3.9],
    [-0.5, 6.9, -3.95],
  ]);
  const helix = group(tank, 0, 1.75, 0);
  for (let i = 0; i < 12; i++) {
    const a = i * 0.55;
    const y = (i - 5.5) * 0.17;
    put(helix, ball(0.08), M.paper, Math.cos(a) * 0.36, y, Math.sin(a) * 0.36, false);
    put(helix, ball(0.08), M.neon, -Math.cos(a) * 0.36, y, -Math.sin(a) * 0.36, false);
    const rung = put(helix, cyl(0.02, 0.02, 0.72, 5), M.lav, 0, y, 0, false);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = -a;
  }
  const tankBubbles = Array.from({ length: 6 }, (_, i) => {
    const b = put(tank, ball(0.05), M.glow, Math.sin(i * 2.1) * 0.5, 1, Math.cos(i * 2.1) * 0.5, false);
    b.userData.phase = i / 6;
    return b;
  });
  const consoleUnit = group(tank, -1.35, 0, 0.9, 0.5);
  put(consoleUnit, box(0.5, 0.9, 0.4), M.paper, 0, 0.45, 0);
  const panel = put(consoleUnit, box(0.56, 0.06, 0.46), M.deep, 0, 0.94, 0.02);
  panel.rotation.x = 0.35;
  put(consoleUnit, box(0.1, 0.05, 0.1), M.neon, -0.14, 1.0, 0.06, false);
  put(consoleUnit, box(0.1, 0.05, 0.1), M.glow, 0.06, 1.0, 0.06, false);

  // ---------- Chem bench on the left wall ----------
  const bench = station("bench", -6.3, 1.2, [0.15, 2.3, 0.7]);
  put(bench, box(1.2, 0.94, 2.5), M.paper, 0, 0.47, 0);
  put(bench, box(1.3, 0.12, 2.6), M.deep, 0, 1.0, 0);
  for (const z of [-0.62, 0.62]) {
    put(bench, box(0.02, 0.72, 1.14), M.lav, 0.605, 0.47, z, false);
    put(bench, box(0.04, 0.26, 0.05), M.ink, 0.63, 0.6, z + (z < 0 ? 0.42 : -0.42), false);
  }

  const stir = group(bench, 0.05, 1.06, 0.72);
  put(stir, box(0.62, 0.12, 0.62), M.lav, 0, 0.06, 0);
  put(stir, box(0.06, 0.04, 0.02), M.neon, 0.2, 0.06, 0.32, false);
  const lathe = (pts: Array<[number, number]>) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 14);
  put(stir, lathe([[0.01, 0], [0.27, 0], [0.28, 0.06], [0.1, 0.42], [0.09, 0.62], [0.13, 0.66]]), M.glass, 0, 0.12, 0, false);
  put(stir, lathe([[0.01, 0.02], [0.24, 0.02], [0.245, 0.07], [0.17, 0.24], [0.01, 0.24]]), M.liquid, 0, 0.12, 0, false);
  const stirBar = put(stir, box(0.16, 0.03, 0.04), M.paper, 0, 0.16, 0, false);
  const flaskBubbles = Array.from({ length: 4 }, (_, i) => {
    const b = put(stir, box(0.05, 0.05, 0.05), i % 2 === 0 ? M.glow : M.neon, 0, 0.8, 0, false);
    b.userData.phase = i / 4;
    return b;
  });

  const tubes = group(bench, 0.12, 1.06, -0.12, -0.3);
  put(tubes, box(0.7, 0.05, 0.24), M.steel, 0, 0.025, 0);
  put(tubes, box(0.7, 0.04, 0.24), M.steel, 0, 0.34, 0);
  put(tubes, box(0.04, 0.34, 0.2), M.steel, -0.33, 0.18, 0);
  put(tubes, box(0.04, 0.34, 0.2), M.steel, 0.33, 0.18, 0);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.19;
    put(tubes, cyl(0.06, 0.06, 0.46, 8), M.glass, x, 0.28, 0, false);
    put(tubes, cyl(0.045, 0.045, 0.2 + i * 0.05, 8), i === 1 ? M.paper : M.neon, x, 0.16 + i * 0.025, 0, false);
  }

  const stand = group(bench, -0.05, 1.06, -0.9);
  put(stand, box(0.5, 0.05, 0.36), M.steel, 0, 0.025, 0);
  put(stand, cyl(0.025, 0.025, 1.1, 6), M.steel, -0.2, 0.58, 0);
  flat(stand, torus(0.16, 0.02, 12), M.steel, 0.02, 0.5, 0);
  put(stand, box(0.2, 0.03, 0.03), M.steel, -0.1, 0.5, 0, false);
  put(stand, ball(0.2), M.glass, 0.02, 0.6, 0, false);
  put(stand, ball(0.14), M.liquid, 0.02, 0.55, 0, false);
  put(stand, cyl(0.06, 0.06, 0.24, 8, true), M.glass, 0.02, 0.88, 0, false);
  put(stand, cyl(0.06, 0.09, 0.2, 8), M.deep, 0.02, 0.15, 0);
  const flame = put(stand, new THREE.ConeGeometry(0.05, 0.16, 6), M.glow, 0.02, 0.33, 0, false);

  put(bench, box(0.45, 0.08, 2.2), M.deep, -0.42, 2.4, 0);
  for (let i = 0; i < 5; i++) {
    const z = -0.8 + i * 0.4;
    put(bench, cyl(0.11, 0.11, 0.3, 8), M.glass, -0.42, 2.59, z, false);
    put(bench, cyl(0.09, 0.09, 0.12 + (i % 3) * 0.05, 8), i % 2 === 0 ? M.ink : M.neon, -0.42, 2.51 + (i % 3) * 0.025, z, false);
    put(bench, cyl(0.12, 0.12, 0.05, 8), M.deep, -0.42, 2.76, z, false);
  }

  // ---------- Patrol drone ----------
  const drone = group(root, 0, 3.4, 0);
  put(drone, box(0.42, 0.16, 0.42), M.paper, 0, 0, 0);
  // Big cartoon eyes make the patrol drone a little lab buddy.
  const droneEyes = group(drone, 0, 0.0, 0.215);
  for (const sx of [-0.09, 0.09]) {
    put(droneEyes, cyl(0.062, 0.062, 0.02, 20), M.paper, sx, 0, 0, false).rotation.x = Math.PI / 2;
    put(droneEyes, cyl(0.03, 0.03, 0.022, 16), M.deep, sx, -0.005, 0.006, false).rotation.x = Math.PI / 2;
  }
  put(drone, box(0.03, 0.18, 0.03), M.deep, 0, 0.16, -0.1, false);
  const rotors = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      put(drone, box(0.05, 0.06, 0.05), M.deep, sx * 0.3, 0.09, sz * 0.3, false);
      return put(drone, box(0.34, 0.015, 0.05), M.ink, sx * 0.3, 0.13, sz * 0.3, false);
    }),
  );

  // Paint the sign once the display font has loaded, so the lettering isn't a fallback face.
  const paintSign = () => {
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim() || "sans-serif";
    const sign = signTexture(font);
    textures.push(sign);
    M.blueprint.map = sign;
    M.blueprint.needsUpdate = true;
  };
  if (document.fonts?.status === "loaded") paintSign();
  else document.fonts?.ready.then(paintSign, paintSign);
  const filipino = createFilipinoLab(root, M.deep);
  textures.push(...filipino.textures);

  let lastArc = -1;
  let lastLed = -1;
  const tmp = new THREE.Vector3();

  return {
    stations: [terminal, core, tank, bench, rack],
    accents: new Set<THREE.Material>([M.ink, M.neon, M.liquid, M.tankFluid, M.holo, M.glow]),
    keep: new Set<THREE.Material>([M.screen, M.blueprint, M.led]),
    markers,
    activate: christmas.activate,
    tick: (t: number) => {
      cursor.visible = Math.floor(t * 2) % 2 === 0;

      for (let i = 0; i < scopeDots.length; i++) {
        const y = Math.sin(i * 0.6 - t * 5) * 0.2 * Math.cos(i * 0.2 + t * 1.3);
        scopeDots[i].position.y = 2.48 + y;
      }

      const arcTick = Math.floor(t * 12);
      if (arcTick !== lastArc) {
        lastArc = arcTick;
        const live = arcTick % 9 < 6;
        for (let i = 0; i < arcPts.length; i++) {
          const a = i / (arcPts.length - 1);
          arcPts[i].lerpVectors(arcStart, arcEnd, a);
          if (i > 0 && i < arcPts.length - 1) {
            arcPts[i].x += (Math.random() - 0.5) * 0.2;
            arcPts[i].y += (Math.random() - 0.5) * 0.22 + Math.sin(a * Math.PI) * 0.18;
            arcPts[i].z += (Math.random() - 0.5) * 0.2;
          }
        }
        for (let i = 0; i < arcSegs.length; i++) {
          const seg = arcSegs[i];
          seg.visible = live;
          seg.position.lerpVectors(arcPts[i], arcPts[i + 1], 0.5);
          seg.lookAt(arcPts[i + 1]);
          seg.scale.z = arcPts[i].distanceTo(arcPts[i + 1]);
        }
      }

      const ledTick = Math.floor(t * 7);
      if (ledTick !== lastLed) {
        lastLed = ledTick;
        for (let n = 0; n < 6; n++) {
          leds.setColorAt((Math.random() * ledSlots.length) | 0, ledColors[(Math.random() * 3) | 0]);
        }
        if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
      }

      christmas.tick(t);
      filipino.tick(t);
      // The drone blinks every few seconds.
      droneEyes.scale.y = (t % 3.7) < 0.12 ? 0.15 : 1;

      helix.rotation.y = t * 0.32;
      for (const b of tankBubbles) {
        const c = (t * 0.22 + (b.userData.phase as number)) % 1;
        b.position.y = 0.7 + c * 2.1;
        b.scale.setScalar(0.6 + c * 0.8);
      }

      stirBar.rotation.y = t * 12;
      for (const b of flaskBubbles) {
        const c = (t * 0.5 + (b.userData.phase as number)) % 1;
        b.position.y = 0.8 + c * 0.6;
        b.position.x = Math.sin((c + (b.userData.phase as number)) * 9) * 0.06;
        b.scale.setScalar(1 - c * 0.7);
      }
      flame.scale.y = 1 + Math.sin(t * 17) * 0.25;

      const da = t * 0.18;
      drone.position.set(1.8 + Math.cos(da) * 3, 3.9 + Math.sin(t * 1.7) * 0.12, -0.6 + Math.sin(da) * 1.5);
      tmp.set(1.8 + Math.cos(da + 0.2) * 3, drone.position.y, -0.6 + Math.sin(da + 0.2) * 1.5);
      drone.lookAt(tmp);
      for (const r of rotors) r.rotation.y = t * 30;

      for (const m of markers.values()) {
        m.position.y = (m.userData.baseY as number) + Math.sin(t * 2.2 + m.id) * 0.07;
        m.rotation.y = t * 1.6;
      }
    },
  };
}

/**
 * Re-skins the whole lab as a matte clay model: every surface becomes one white, the lab hardware
 * turns DOS blue, glass stays glass, and the practical lights switch off (the sun does the lighting).
 */
function applyClay(root: THREE.Object3D, lab: Pick<LabBuild, "accents" | "keep">) {
  const clay = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.92, metalness: 0 });
  const accent = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.6, metalness: 0, emissive: ACCENT, emissiveIntensity: 0.15 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.3, depthWrite: false });
  const accentGlass = new THREE.MeshStandardMaterial({
    color: ACCENT,
    roughness: 0.3,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const replaced = new Set<THREE.Material>();
  const swap = (m: THREE.Material) => {
    if (lab.keep.has(m)) return m;
    replaced.add(m);
    const seeThrough = m.transparent && m.opacity < 0.95;
    if (lab.accents.has(m) || m.userData.accent) return seeThrough ? accentGlass : accent;
    return seeThrough ? glass : clay;
  };
  root.traverse((o) => {
    if (o instanceof THREE.Light) o.visible = false;
    if (!(o instanceof THREE.Mesh)) return;
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  for (const m of replaced) m.dispose();
}

/**
 * Window light: slatted blinds that only the sun can see (layer 1) throw striped shadows across
 * the floor, and a faint shaft of haze runs from the window down to where the stripes land.
 */
function addSunlight(scene: THREE.Scene, sunDir: THREE.Vector3): THREE.Texture[] {
  const windowAt = new THREE.Vector3(-2.25, 3.05, -3.62);
  const w = 2.6;
  const h = 2.4;

  const blinds = new THREE.Group();
  blinds.position.copy(windowAt);
  const slatMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  const slat = new THREE.BoxGeometry(w, 0.13, 0.04);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(slat, slatMat);
    m.position.y = -h / 2 + 0.12 + i * 0.27;
    m.rotation.x = -0.35;
    blinds.add(m);
  }
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.04), slatMat);
  blinds.add(mullion);
  blinds.traverse((o) => {
    o.layers.set(1);
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  scene.add(blinds);

  // The shaft: two crossed planes along the sun ray, brightest mid-way and soft at every edge.
  const len = windowAt.y / sunDir.y;
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { uHalf: { value: new THREE.Vector3(w / 2, h / 2, len / 2) } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 uHalf; varying vec3 vP;
      void main() {
        vec3 q = abs(vP) / uHalf;
        float edge = (1.0 - smoothstep(0.45, 1.0, q.x)) * (1.0 - smoothstep(0.45, 1.0, q.y));
        float along = 1.0 - smoothstep(0.2, 1.0, q.z);
        gl_FragColor = vec4(1.0, 0.985, 0.95, 0.2 * edge * along);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shaft = new THREE.Group();
  shaft.name = "sun-shaft";
  shaft.position.copy(windowAt).addScaledVector(sunDir, -len / 2);
  shaft.lookAt(shaft.position.clone().add(sunDir));
  const across = new THREE.PlaneGeometry(w, len);
  across.rotateX(Math.PI / 2);
  const down = new THREE.PlaneGeometry(len, h);
  down.rotateY(Math.PI / 2);
  shaft.add(new THREE.Mesh(across, shaftMat), new THREE.Mesh(down, shaftMat));
  scene.add(shaft);
  return [];
}

type RigApi = {
  sync: (station: StationId, zoomed: boolean) => void;
  zoomBy: (factor: number) => void;
};

export function Lab3DCanvas({ station, onStationChange, zoomed, onZoomChange }: Lab3DCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<RigApi | null>(null);
  const stationRef = useRef(station);
  const zoomedRef = useRef(zoomed);
  const onStationRef = useRef(onStationChange);
  const onZoomRef = useRef(onZoomChange);
  stationRef.current = station;
  zoomedRef.current = zoomed;
  onStationRef.current = onStationChange;
  onZoomRef.current = onZoomChange;

  useEffect(() => {
    const host = hostRef.current;
    const tip = tipRef.current;
    if (!host) return;
    let disposed = false;
    const wheelHost = host.parentElement ?? host;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isCalm = () => reducedMotion.matches || document.documentElement.dataset.labFx === "calm";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

    // WebGL can be unavailable (GPU blocked, too many live contexts, old hardware). The hero
    // then falls back to its CSS backdrop and the copy, instead of crashing the page.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" });
    } catch {
      host.dataset.webgl = "off";
      return;
    }
    delete host.dataset.webgl;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.imageRendering = "auto";
    host.dataset.renderStyle = "clay";
    host.appendChild(renderer.domElement);

    // Daylight on a white model: a soft sky fill, and one low sun through the window doing the drawing.
    scene.background = new THREE.Color(BACKDROP);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccd8, 1.35));
    const SUN_DIR = new THREE.Vector3(-6, 8, -9).normalize();
    const SUN_AT = new THREE.Vector3(ROOM_CENTER_X, 0, ROOM_CENTER_Z);
    const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
    key.position.copy(SUN_AT).addScaledVector(SUN_DIR, 26);
    key.target.position.copy(SUN_AT);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); // ~60 texels per metre over the larger floor
    key.shadow.camera.left = -17;
    key.shadow.camera.right = 17;
    key.shadow.camera.top = 17;
    key.shadow.camera.bottom = -17;
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    // Layer 1 holds shadow-only geometry (the window blinds): the sun sees it, the camera does not.
    key.shadow.camera.layers.enable(1);
    scene.add(key, key.target);
    // A shadowless fill from the viewer's side keeps the inside of the walls white, not grey.
    const fill = new THREE.DirectionalLight(0xf2f4ff, 0.9);
    fill.position.set(10, 6, 14);
    scene.add(fill);

    const textures: THREE.Texture[] = [];
    const root = new THREE.Group();
    scene.add(root);
    const lab = buildLab(root, textures);
    addLabProps(root);
    applyClay(root, lab);
    textures.push(...addSunlight(scene, SUN_DIR));

    // Ambient occlusion is what makes white clay read as solid: soft darkening wherever things meet.
    const composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }),
    );
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 0.9;
    gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 8 });
    // Glass and the light shaft would otherwise cast AO onto whatever sits behind them.
    const gtaoVis = gtao as unknown as { _overrideVisibility: () => void; _visibilityCache: THREE.Object3D[] };
    const hideBase = gtaoVis._overrideVisibility.bind(gtao);
    gtaoVis._overrideVisibility = () => {
      hideBase();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh && o.visible && (o.material as THREE.Material).transparent) {
          o.visible = false;
          gtaoVis._visibilityCache.push(o);
        }
      });
    };
    composer.addPass(gtao);
    composer.addPass(new OutputPass());

    // ---------- Scroll: the diorama comes apart into floating pieces as the page moves on ----------
    type Piece = {
      obj: THREE.Object3D;
      dir: THREE.Vector3;
      spin: THREE.Vector3;
      /** Share of the page's scroll speed the piece rises at once it is debris (parallax). */
      drift: number;
      /** Load-in: seconds before the piece starts flying into place. */
      delay: number;
      /** Turns world-space vectors into the parent's local space. */
      toLocal: THREE.Quaternion;
      scale: number;
      pos: THREE.Vector3;
      rot: THREE.Euler;
    };
    const pieces: Piece[] = [];
    const shell: Array<{ mesh: THREE.Mesh; mat: THREE.Material }> = [];
    const sunShaft = scene.getObjectByName("sun-shaft");
    {
      const rand = (() => { let seed = 11; return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; })();
      const center = new THREE.Vector3(ROOM_CENTER_X, 0.5, ROOM_CENTER_Z);
      const world = new THREE.Vector3();
      // Toward the overview camera: pieces never fly into the lens.
      const toCamera = new THREE.Vector3(
        Math.sin(OVERVIEW.phi) * Math.sin(OVERVIEW.theta),
        Math.cos(OVERVIEW.phi),
        Math.sin(OVERVIEW.phi) * Math.cos(OVERVIEW.theta),
      );
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const size = (o.geometry.boundingSphere?.radius ?? 0) * o.getWorldScale(world).x;
        o.getWorldPosition(world);
        let dir: THREE.Vector3;
        let spin: THREE.Vector3;
        if (size > 3) {
          // The floor and walls fall away slowly and tilt open, like a model being taken apart.
          dir = new THREE.Vector3((world.x - center.x) * 0.25, -2.5 - rand() * 1.5, -1.5 - rand());
          spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.35);
        } else {
          dir = world.clone().sub(center);
          dir.y = Math.abs(dir.y) + 2 + rand() * 4;
          dir.x += (rand() - 0.5) * 6;
          dir.z += (rand() - 0.5) * 6;
          dir.normalize();
          const facing = dir.dot(toCamera);
          if (facing > 0) dir.addScaledVector(toCamera, -facing * 1.4).normalize();
          dir.multiplyScalar(4 + rand() * 10);
          spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(4);
        }
        const toLocal = new THREE.Quaternion();
        o.parent?.getWorldQuaternion(toLocal);
        toLocal.invert();
        const scale = 1 / (o.parent?.getWorldScale(new THREE.Vector3()).x || 1);
        dir.applyQuaternion(toLocal).multiplyScalar(scale);
        const drift = size > 3 ? 0 : 0.08 + rand() * 0.55;
        if (size > 3) {
          // Floor and walls dissolve as the room shatters; only the small pieces travel down the page.
          const m = (o.material as THREE.Material).clone();
          o.material = m;
          shell.push({ mesh: o, mat: m });
        }
        // Build order on load: floor and walls, then furniture from the ground up, small props last.
        const delay = size > 3 ? rand() * 0.25 : 0.45 + clamp(world.y / 4, 0, 1) * 0.8 + rand() * 0.6;
        pieces.push({ obj: o, dir, spin, drift, delay, toLocal, scale, pos: new THREE.Vector3(), rot: new THREE.Euler() });
      });
    }
    const camUp = new THREE.Vector3();
    const local = new THREE.Vector3();
    let burstGoal = 0;
    let burst = 0;
    let exploded = false;
    // Past the top of the page the canvas moves into a fixed overlay, so the debris can drift down
    // through the next sections. The camera pans with the page so the room still scrolls away with it.
    const debris = document.createElement("div");
    debris.className = "lab-debris";
    debris.setAttribute("aria-hidden", "true");
    const backdrop = scene.background;
    let debrisOn = false;
    let debrisOpacity = 1;
    let panPx = 0;
    let restTop = 0;
    const placeDebris = () => {
      debris.style.width = `${width}px`;
      debris.style.height = `${height}px`;
    };
    const setDebris = (on: boolean) => {
      if (on === debrisOn) return;
      debrisOn = on;
      if (on) {
        // Pin the overlay exactly where the hero canvas is on screen right now (the hero is sticky).
        restTop = host.getBoundingClientRect().top;
        debris.style.top = `${restTop}px`;
        placeDebris();
        document.body.appendChild(debris);
        debris.appendChild(renderer.domElement);
        scene.background = null;
      } else {
        host.insertBefore(renderer.domElement, host.firstChild);
        debris.remove();
        scene.background = backdrop;
      }
    };
    const readScroll = () => {
      const span = Math.max(1, host.clientHeight * 0.55);
      burstGoal = isCalm() ? 0 : clamp(window.scrollY / span, 0, 1);
      wake();
    };

    // ---------- Camera rig: damped spherical orbit around a target ----------
    let width = 1;
    let height = 1;
    const overviewRadius = () => clamp(OVERVIEW.radius * Math.max(1, 1.5 / (width / height)), OVERVIEW.radius, 48);

    /** Portrait screens see less width, so close-ups back off a little. */
    const focusScale = () => clamp(0.85 / (width / height), 1, 1.5);

    const goal = { target: new THREE.Vector3(), theta: 0, phi: 0, radius: 0, shift: 1 };
    const cur = { target: new THREE.Vector3(), theta: 0, phi: 0, radius: 0, shift: 1 };

    const setGoal = (p: Preset, radius = p.radius, shift = 0) => {
      goal.target.set(...p.target);
      goal.theta = p.theta;
      goal.phi = p.phi;
      goal.radius = radius;
      goal.shift = shift;
    };
    const snap = () => {
      cur.target.copy(goal.target);
      cur.theta = goal.theta;
      cur.phi = goal.phi;
      cur.radius = goal.radius;
      cur.shift = goal.shift;
    };
    const sync = (id: StationId, isZoomed: boolean) => {
      if (isZoomed) setGoal(TERMINAL_CLOSE);
      else if (id === "overview") setGoal(OVERVIEW, overviewRadius(), 1);
      else if (id !== "free") setGoal(PRESETS[id], PRESETS[id].radius * focusScale());
      else goal.shift = 0;
    };
    const goFree = () => {
      if (stationRef.current !== "free") onStationRef.current("free");
    };
    const zoomTo = (radius: number) => {
      const max = overviewRadius();
      if (radius >= max - 0.05) {
        if (stationRef.current === "overview") sync("overview", false);
        else onStationRef.current("overview");
        return;
      }
      goal.radius = clamp(radius, LIMITS.radiusMin, max);
      goal.shift = 0;
      goFree();
    };
    apiRef.current = {
      sync: (id, isZoomed) => { sync(id, isZoomed); wake(); },
      zoomBy: (factor) => { if (!zoomedRef.current) { zoomTo(goal.radius * factor); wake(); } },
    };

    let animT = 0; // declared before applyCamera, which reads it for the idle drift
    const applyCamera = () => {
      // A slow, handheld-style drift on the whole-lab view makes the room feel filmed rather than rendered.
      const drift = stationRef.current === "overview" && !zoomedRef.current && !isCalm() ? 1 : 0;
      const theta = cur.theta + drift * Math.sin(animT * 0.13) * 0.035;
      const phi = cur.phi + drift * Math.sin(animT * 0.09 + 1) * 0.012;
      const sinPhi = Math.sin(phi);
      const r = cur.radius;
      camera.position.set(
        clamp(cur.target.x + r * sinPhi * Math.sin(theta), -ROOM.x, ROOM.x),
        clamp(cur.target.y + r * Math.cos(phi), ROOM.yMin, ROOM.yMax),
        Math.min(cur.target.z + r * sinPhi * Math.cos(theta), ROOM.zFront),
      );
      camera.lookAt(cur.target);
      // The overview leaves room for the hero copy: beside it on wide screens, below it on narrow ones.
      const wide = width >= 900;
      // The diorama sits centred and low, under the copy, like a model on a table.
      const dx = 0;
      const dy = (wide ? -0.09 : -0.14) * height * cur.shift;
      camera.setViewOffset(width, height, dx, dy + panPx, width, height);
    };

    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      renderer.setSize(width, height);
      if (debrisOn) placeDebris();
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      if (stationRef.current === "overview" && !zoomedRef.current) goal.radius = overviewRadius();
      else goal.radius = Math.min(goal.radius, overviewRadius());
    };
    resize();
    const introUntil = 0;
    // Load moment: the camera holds still and the lab assembles itself from scattered pieces.
    let assembleFrom = isCalm() ? -Infinity : 0;
    sync(stationRef.current, zoomedRef.current);
    if (!introUntil) snap();
    const ro = new ResizeObserver(() => { resize(); wake(); });
    ro.observe(host);

    // ---------- Pointer: orbit, pinch, hover, click-to-focus ----------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinchDist = 0;
    let hovered: FocusStation | null = null;
    let zoomTimer = 0;

    const pick = (e: { clientX: number; clientY: number }, targets: THREE.Object3D[]) => {
      const rect = host.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(targets, true)[0];
    };
    const stationOf = (obj: THREE.Object3D | null): FocusStation | null => {
      for (let o = obj; o; o = o.parent) {
        if (o.userData.station) return o.userData.station as FocusStation;
      }
      return null;
    };
    const setHover = (id: FocusStation | null, e?: PointerEvent) => {
      hovered = id;
      wake();
      host.style.cursor = id ? "pointer" : "";
      if (!tip) return;
      tip.hidden = !id;
      if (id && e) {
        const rect = host.getBoundingClientRect();
        tip.textContent = STATION_LABELS[id];
        tip.style.transform = `translate(${Math.round(e.clientX - rect.left + 14)}px, ${Math.round(e.clientY - rect.top + 16)}px)`;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (zoomedRef.current) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      wake();
      if (zoomedRef.current) return;
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        if (e.pointerType === "mouse") setHover(stationOf(pick(e, lab.stations)?.object ?? null), e);
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && dist > 0) zoomTo(goal.radius * (pinchDist / dist));
        pinchDist = dist;
        moved = 99;
        return;
      }

      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 6) return;
      setHover(null);
      goFree();
      goal.shift = 0;
      goal.theta = clamp(goal.theta - dx * 0.006, LIMITS.thetaMin, LIMITS.thetaMax);
      goal.phi = clamp(goal.phi - dy * 0.005, LIMITS.phiMin, LIMITS.phiMax);
    };

    const onPointerUp = (e: PointerEvent) => {
      const had = pointers.delete(e.pointerId);
      pinchDist = 0;
      if (!had || moved >= 6 || zoomedRef.current || e.type === "pointercancel") return;
      const object = pick(e, [root])?.object;
      if (object && lab.activate(object, isCalm())) { wake(); return; }
      const id = stationOf(pick(e, lab.stations)?.object ?? null);
      if (!id) return;
      setHover(null);
      onStationRef.current(id);
      if (id === "terminal") {
        window.clearTimeout(zoomTimer);
        zoomTimer = window.setTimeout(() => onZoomRef.current(true), isCalm() ? 0 : 750);
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (zoomedRef.current) return;
      const hit = pick(e, [root]);
      if (!hit || stationOf(hit.object)) return;
      goal.target.set(clamp(hit.point.x, -6.2, 6.2), clamp(hit.point.y, 0.4, 4), clamp(hit.point.z, -3.6, 6));
      zoomTo(Math.max(4.5, goal.radius * 0.5));
    };

    // Wheel zooms the lab only at the top of the page; zooming all the way out hands the wheel back to scrolling.
    const onWheel = (e: WheelEvent) => {
      if (zoomedRef.current || e.deltaY === 0) return;
      const zoomIn = e.deltaY < 0;
      if (!e.ctrlKey) {
        if (zoomIn && window.scrollY > 2) return;
        if (!zoomIn && goal.radius >= overviewRadius() - 0.05) return;
      }
      e.preventDefault();
      e.stopPropagation();
      zoomTo(goal.radius * Math.exp(clamp(e.deltaY, -120, 120) * (e.ctrlKey ? 0.01 : 0.0024)));
    };

    const onPointerLeave = () => setHover(null);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    wheelHost.addEventListener("wheel", onWheel, { passive: false });

    // ---------- Render loop (paused while the hero is off-screen) ----------
    let raf = 0;
    let visible = true;
    let covered = false;
    let last = performance.now();
    let shadowFrame = 0;

    let contextLost = false;
    let useAO = true;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      // A GPU that can't keep up with AO drops the context; come back without it.
      useAO = false;
    };
    const onContextRestored = () => {
      contextLost = false;
      wake();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const frame = (now: number) => {
      raf = 0;
      if (contextLost || disposed) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const calm = isCalm();

      const k = calm ? 1 : 1 - Math.exp(-dt * (now < introUntil ? 2.4 : 5.5));
      cur.target.lerp(goal.target, k);
      cur.theta += (goal.theta - cur.theta) * k;
      cur.phi += (goal.phi - cur.phi) * k;
      cur.radius += (goal.radius - cur.radius) * k;
      cur.shift += (goal.shift - cur.shift) * k;
      burst += (burstGoal - burst) * (calm ? 1 : 1 - Math.exp(-dt * 6));
      const scrolled = window.scrollY;
      setDebris(burst > 0.001 && !calm);
      // The hero is sticky, so the page can scroll a long way before the room itself moves.
      panPx = debrisOn ? Math.max(0, restTop - host.getBoundingClientRect().top) : 0;
      const screens = scrolled / Math.max(1, window.innerHeight);
      debrisOpacity = debrisOn ? 1 - clamp((screens - 1.8) / 1.2, 0, 1) : 1;
      debris.style.opacity = String(debrisOpacity);
      applyCamera();
      camera.updateMatrixWorld();

      if (!calm) animT += dt;
      // The clock starts after the first frame is on screen: compiling shaders can take seconds.
      const built = assembleFrom === 0 ? 0 : (now - assembleFrom) / 1000;
      const assembling = built < ASSEMBLE_SECONDS;
      if ((burst > 0.001 || assembling) && !exploded) {
        exploded = true;
        for (const p of pieces) { p.pos.copy(p.obj.position); p.rot.copy(p.obj.rotation); }
      }
      if (exploded) for (const p of pieces) { p.obj.position.copy(p.pos); p.obj.rotation.copy(p.rot); }
      if (exploded && burst <= 0.001 && !assembling) {
        exploded = false;
        for (const { mesh, mat } of shell) { mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true; mesh.visible = true; }
        if (sunShaft) sunShaft.visible = true;
      }
      lab.tick(animT);
      if (exploded) {
        // Ease in, so the first bit of scroll only loosens the room before it flies apart.
        const e = burst * burst * (3 - 2 * burst);
        /** How far a piece still is from its place during the load-in (1 = scattered, 0 = home). */
        const away = (p: Piece) => {
          if (!assembling) return 0;
          const t = clamp((built - p.delay) / 1.1, 0, 1);
          return Math.pow(1 - t, 3);
        };
        // The shell fades in as the room assembles, and out as it shatters.
        const solid = Math.min(1 - clamp(burst / 0.45, 0, 1), assembling ? clamp(built / 0.9, 0, 1) : 1);
        for (const { mesh, mat } of shell) {
          const fading = solid < 1;
          if (mat.transparent !== fading) { mat.transparent = fading; mat.needsUpdate = true; }
          mat.opacity = solid;
          mat.depthWrite = !fading;
          mesh.visible = solid > 0.01;
        }
        if (sunShaft) sunShaft.visible = solid > 0.5;
        // World units per screen pixel at the lab's distance, along the camera's "up".
        const perPx = (2 * cur.radius * Math.tan((camera.fov * DEG) / 2)) / height;
        camUp.setFromMatrixColumn(camera.matrixWorld, 1);
        for (const p of pieces) {
          const f = Math.max(e, away(p));
          p.obj.position.addScaledVector(p.dir, f);
          if (p.drift > 0 && debrisOn) {
            // Rise slower than the page and keep tumbling, so the pieces seem to fall through the sections.
            // The camera pan already carries everything up with the page; this adds the piece's own rise.
            const rise = (scrolled - panPx) * p.drift;
            local.copy(camUp).applyQuaternion(p.toLocal).multiplyScalar(rise * perPx * p.scale);
            p.obj.position.add(local);
            const turn = screens * 0.5;
            p.obj.rotation.x += p.spin.x * turn;
            p.obj.rotation.y += p.spin.y * turn;
          }
          p.obj.rotation.x += p.spin.x * f;
          p.obj.rotation.y += p.spin.y * f;
          p.obj.rotation.z += p.spin.z * f;
        }
      }
      for (const [id, marker] of lab.markers) {
        const s = hovered === id ? 1.8 : stationRef.current === id ? 0.001 : 1;
        marker.scale.setScalar(calm ? s : marker.scale.x + (s - marker.scale.x) * Math.min(1, dt * 12));
      }

      // Shadows only matter while the floor is still in view.
      const shadowEvery = exploded ? (panPx < height * 0.7 ? 2 : 0) : 4;
      if (shadowEvery && shadowFrame % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
      shadowFrame += 1;
      if (debrisOpacity > 0) {
        if (useAO && !debrisOn) composer.render(dt);
        else renderer.render(scene, camera);
      }
      if (!host.dataset.ready) host.dataset.ready = "true"; // fade the scene in over the loader
      if (assembleFrom === 0) assembleFrom = performance.now();
      const onScreen = debrisOn ? debrisOpacity > 0 : visible && !covered;
      if (onScreen && !document.hidden && !calm) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (disposed || raf || document.hidden) return;
      // In debris mode the overlay is on screen even when the hero itself is covered.
      if (!debrisOn && burstGoal === 0 && (!visible || covered)) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onMotionChange = () => wake();
    // The sticky hero is still intersecting when the content sheet completely covers it.
    const coverObserver = new IntersectionObserver(([entry]) => {
      covered = entry.boundingClientRect.bottom <= 64;
      wake();
    }, { rootMargin: "-64px 0px 0px" });
    const sheet = document.querySelector("[data-sheet]");
    if (sheet) coverObserver.observe(sheet.firstElementChild ?? sheet);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    io.observe(host);
    window.addEventListener("scroll", readScroll, { passive: true });
    readScroll();
    document.addEventListener("visibilitychange", wake);
    reducedMotion.addEventListener("change", onMotionChange);
    window.addEventListener("lab:preferences", onMotionChange);
    frame(performance.now());

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(zoomTimer);
      apiRef.current = null;
      io.disconnect();
      coverObserver.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("scroll", readScroll);
      reducedMotion.removeEventListener("change", onMotionChange);
      window.removeEventListener("lab:preferences", onMotionChange);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      wheelHost.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

      const mats = new Set<THREE.Material>();
      const geoSet = new Set<THREE.BufferGeometry>();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          geoSet.add(obj.geometry);
          for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) mats.add(m);
        }
      });
      for (const g of geoSet) g.dispose();
      for (const m of mats) m.dispose();
      for (const tx of textures) tx.dispose();
      key.shadow.map?.dispose();
      gtao.dispose();
      composer.dispose();
      renderer.dispose();
      // Hand the GPU context back now. Without this every hot reload leaks one, and the
      // browser eventually refuses to create any more.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      debris.remove();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.sync(station, zoomed);
  }, [station, zoomed]);

  return (
    <>
      <div ref={hostRef} className="lab-3d-viewport-canvas" aria-hidden="true">
        <div ref={tipRef} className="lab-3d-tip" hidden />
      </div>
      <div className="lab-3d-zoom" role="group" aria-label="Zoom the 3D lab" hidden={zoomed}>
        <button type="button" className="ndev-specimen-btn" aria-label="Zoom in" onClick={() => apiRef.current?.zoomBy(0.7)}>
          +
        </button>
        <button type="button" className="ndev-specimen-btn" aria-label="Zoom out" onClick={() => apiRef.current?.zoomBy(1 / 0.7)}>
          −
        </button>
      </div>
    </>
  );
}
