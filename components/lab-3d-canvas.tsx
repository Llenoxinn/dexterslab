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
import { ASSEMBLE_SECONDS, STAGES, STAGE_OPACITY, createJourney } from "@/lib/lab-journey";
import { addLabProps } from "@/lib/lab-props";
import { CONTACT_SPIRAL_SECONDS, CONTACT_WORD_COLUMNS, type ContactChoreography } from "@/lib/contact-choreography";
import { createStudioWindows, STUDIO_BACK_WINDOW, STUDIO_SUN_DIRECTION } from "@/lib/studio-daylight";
import { interludeBus } from "@/lib/interlude-bus";
import { createGovernor, qualityTiers, type QualityTier } from "@/lib/render-quality";
import { steelMaterial, studioEnvironment } from "@/lib/lab-materials";
import { batchScene, PROXY_LAYER } from "@/lib/batch-scene";

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
const smoothstep01 = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const LIMITS = { thetaMin: -60 * DEG, thetaMax: 60 * DEG, phiMin: 38 * DEG, phiMax: 88 * DEG, radiusMin: 2.6 };
/** The lab is a diorama seen from outside; these bounds only keep the camera above the table and out of the back wall. */
const ROOM = { x: 40, zFront: 40, yMin: 0.6, yMax: 40 };
/** Cutaway room: floor slab from the back wall (z = -4.3) to an open front edge. */
const ROOM_DEPTH = 13.5;
const ROOM_CENTER_Z = -4.3 + ROOM_DEPTH / 2;
/** The floor runs from the left wall (x = -7.3) out past the right of the original lab, to x = 13. */
const ROOM_WIDTH = 20.3;
const ROOM_CENTER_X = -7.3 + ROOM_WIDTH / 2;

/** Clay render: one matte white for everything, DOS blue for the lab hardware, a pale table to sit on. */
const CLAY = 0xf3f3f5;
const ACCENT = 0x2323d2;
const BACKDROP = 0xeef0f6;

type Preset = { target: [number, number, number]; theta: number; phi: number; radius: number };

// Slight three-quarter corner view (matching the diorama's natural front-left-wall framing).
const OVERVIEW: Preset = { target: [2.6, 1.4, 2.4], theta: 16 * DEG, phi: 56 * DEG, radius: 33.5 };

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
  /** The lab's bare hardware (coil, stands, rack frames): rendered as real brushed steel. */
  steel: THREE.Material;
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
  const floor = put(root, box(ROOM_WIDTH, 0.4, ROOM_DEPTH), M.floor, ROOM_CENTER_X, -0.2, ROOM_CENTER_Z);
  floor.castShadow = false;
  floor.userData.buildRole = "floor";
  const daylight = createStudioWindows(root, M.wall, M.sideWall);
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
  crt.userData.unit = true; // travels as one intact object in the scroll journey
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
  chair.userData.unit = true; // travels as one intact object in the scroll journey
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
  coil.userData.unit = true; // travels as one intact object in the scroll journey
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
  consoleUnit.userData.unit = true; // travels as one intact object in the scroll journey
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
  stir.userData.unit = true; // travels as one intact object in the scroll journey
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
  tubes.userData.unit = true; // travels as one intact object in the scroll journey
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
  drone.userData.unit = true; // travels as one intact object in the scroll journey
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
    keep: new Set<THREE.Material>([M.screen, M.blueprint, M.led, daylight.sky]),
    steel: M.steel,
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
 * A faint shaft of haze follows the sunlight from the studio window to the floor.
 * The visible window frames and louvres cast the actual shadows.
 */
function addSunlight(scene: THREE.Scene, sunDir: THREE.Vector3): THREE.Texture[] {
  const windowAt = new THREE.Vector3(STUDIO_BACK_WINDOW.x, STUDIO_BACK_WINDOW.y, STUDIO_BACK_WINDOW.z + 0.21);
  const w = STUDIO_BACK_WINDOW.width;
  const h = STUDIO_BACK_WINDOW.height;

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
        gl_FragColor = vec4(1.0, 0.96, 0.85, 0.13 * edge * along);
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
    const roomy = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) > 4;
    // Pixel ratio, MSAA and AO resolution move together as one tier; slow frames step it down.
    const tiers = qualityTiers(window.devicePixelRatio || 1, roomy ? 2 : 1.5);
    const governor = createGovernor(tiers.length);
    let tier: QualityTier = tiers[0];
    renderer.setPixelRatio(tier.ratio);
    host.dataset.renderScale = String(tier.ratio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.14; // the room sits in wall shade now; lift it so the clay reads light
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.imageRendering = "auto";
    host.dataset.renderStyle = "clay";


    // Daylight on a white model: a soft sky fill, and one low sun through the window doing the drawing.
    scene.background = new THREE.Color(BACKDROP);
    scene.add(new THREE.HemisphereLight(0xf0f5ff, 0xd9d9e4, 1.05));
    const SUN_DIR = STUDIO_SUN_DIRECTION;
    const SUN_AT = new THREE.Vector3(ROOM_CENTER_X, 0, ROOM_CENTER_Z);
    const key = new THREE.DirectionalLight(0xfff1e2, 4.6);
    key.position.copy(SUN_AT).addScaledVector(SUN_DIR, 32);
    key.target.position.copy(SUN_AT);
    key.castShadow = true;
    // Keep small props and window slats crisp; cap the map for smaller GPUs.
    key.shadow.mapSize.setScalar(Math.min(renderer.capabilities.maxTextureSize, roomy ? 4096 : 2048));
    // The low sun sees the room at a grazing angle, so its shadow box is longer than the floor.
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 13;
    key.shadow.camera.bottom = -13;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 62;
    key.shadow.bias = -0.00012;
    key.shadow.normalBias = 0.012;
    // A slightly soft edge and a touch of fill inside the shadow: sunlit, not cut out.
    key.shadow.radius = roomy ? 3 : 1.5;
    key.shadow.intensity = 0.88;
    scene.add(key, key.target);
    // A shadowless fill from the viewer's side keeps the inside of the walls white, not grey.
    const fill = new THREE.DirectionalLight(0xe9efff, 0.7);
    fill.position.set(10, 6, 14);
    scene.add(fill);

    const textures: THREE.Texture[] = [];
    const root = new THREE.Group();
    scene.add(root);
    const lab = buildLab(root, textures);
    addLabProps(root);
    // Clay everywhere, except the bare hardware: brushed steel against its own studio of bright cards,
    // so it reads as metal (not grey plastic) next to the matte white model.
    const studio = studioEnvironment(renderer);
    textures.push(studio);
    const steel = steelMaterial(studio, "brushed");
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material === lab.steel) o.material = steel;
    });
    lab.steel.dispose();
    lab.keep.add(steel);
    applyClay(root, lab);
    textures.push(...addSunlight(scene, SUN_DIR));

    // Ambient occlusion is what makes white clay read as solid: soft darkening wherever things meet.
    const composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.samples }),
    );
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, 1, 1);
    // AO is soft by nature: half resolution looks the same once denoised and costs a quarter.
    const gtaoSetSize = gtao.setSize.bind(gtao);
    gtao.setSize = (w: number, h: number) => {
      const s = tier.ao || 0.5;
      gtaoSetSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
      aoAge = Infinity;
    };
    // Occlusion only changes when the camera or the room moves. While both hold still, the last
    // denoised AO is blended again and recomputed every few frames: the clay keeps its contact
    // shading at a fraction of the cost (it was the hero's stutter on integrated GPUs).
    const AO_REUSE_FRAMES = 12;
    let aoAge = Infinity;
    const aoView = new THREE.Matrix4();
    const gtaoInternals = gtao as unknown as {
      copyMaterial: THREE.ShaderMaterial;
      blendMaterial: THREE.ShaderMaterial;
      pdRenderTarget: THREE.WebGLRenderTarget;
      _renderPass: (r: THREE.WebGLRenderer, m: THREE.Material, t: THREE.WebGLRenderTarget | null) => void;
    };
    const gtaoRender = gtao.render.bind(gtao);
    const sameView = (a: THREE.Matrix4, b: THREE.Matrix4) => a.elements.every((v, i) => Math.abs(v - b.elements[i]) < 1e-5);
    gtao.render = (r, writeBuffer, readBuffer, delta, mask) => {
      if (aoAge >= AO_REUSE_FRAMES || !sameView(aoView, camera.matrixWorld)) {
        aoView.copy(camera.matrixWorld);
        aoAge = 0;
        gtaoRender(r, writeBuffer, readBuffer, delta, mask);
        return;
      }
      aoAge += 1;
      const g = gtaoInternals;
      const target = gtao.renderToScreen ? null : writeBuffer;
      g.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
      g.copyMaterial.blending = THREE.NoBlending;
      g._renderPass(r, g.copyMaterial, target);
      g.blendMaterial.uniforms.intensity.value = gtao.blendIntensity;
      g.blendMaterial.uniforms.tDiffuse.value = g.pdRenderTarget.texture;
      g._renderPass(r, g.blendMaterial, target);
    };
    gtao.blendIntensity = 0.72;
    gtao.updateGtaoMaterial({ radius: 0.48, distanceExponent: 1.6, thickness: 0.5, scale: 1, samples: roomy ? 16 : 8 });
    gtao.updatePdMaterial({ radius: 6, lumaPhi: 10, depthPhi: 1, normalPhi: 4, samples: 16 });
    // Glass and the light shaft would otherwise cast AO onto whatever sits behind them.
    const gtaoVis = gtao as unknown as { _overrideVisibility: () => void; _visibilityCache: THREE.Object3D[] };
    const hideBase = gtaoVis._overrideVisibility.bind(gtao);
    gtaoVis._overrideVisibility = () => {
      hideBase();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh && o.visible && (Array.isArray(o.material) ? o.material : [o.material]).every((material) => material.transparent)) {
          o.visible = false;
          gtaoVis._visibilityCache.push(o);
        }
      });
    };
    composer.addPass(gtao);
    composer.addPass(new OutputPass());

    // ---------- Scroll journey: one fixed 3D layer behind the whole page ----------
    // The canvas lives in a fixed layer behind every section; the hero host stays as the pointer
    // surface. The same meshes assemble, shatter and re-form section by section (lib/lab-journey).
    const stage = document.createElement("div");
    stage.className = "lab-scene-layer";
    stage.setAttribute("aria-hidden", "true");
    document.body.prepend(stage);
    stage.appendChild(renderer.domElement);
    const journey = createJourney(root, {
      center: new THREE.Vector3(ROOM_CENTER_X, 0.5, ROOM_CENTER_Z),
      toCamera: new THREE.Vector3(
        Math.sin(OVERVIEW.phi) * Math.sin(OVERVIEW.theta),
        Math.cos(OVERVIEW.phi),
        Math.sin(OVERVIEW.phi) * Math.cos(OVERVIEW.theta),
      ),
    });
    const sunShaft = scene.getObjectByName("sun-shaft");
    // ~900 meshes become ~40 draws: the scene graph stays as proxies, the batches draw it.
    const batcher = batchScene(root, scene);
    host.dataset.batched = String(batcher.saved);

    // ---------- The interlude headline, in clay ----------
    // lab-interlude simulates the pixel headline; here every pixel becomes a small rounded clay block
    // in the same matte material as the lab's DOS-blue hardware, lit by the same sun and sky.
    const CLAY_TEXT_MAX = 6000;
    const clayText = new THREE.InstancedMesh(
      new RoundedBoxGeometry(1, 1, 1, 2, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 }),
      CLAY_TEXT_MAX,
    );
    clayText.name = "interlude-clay-text";
    clayText.frustumCulled = false;
    clayText.count = 0;
    clayText.visible = false;
    clayText.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(clayText);
    const textInk = [new THREE.Color(0x14168a), new THREE.Color(ACCENT)];
    // On the dark theme the headline turns to pale clay, so it reads against the night page.
    const textInkDark = [new THREE.Color(0xeef0ff), new THREE.Color(0xa9b1ff)];
    const textNeon = new THREE.Color(0x8c9df5);
    const textColor = new THREE.Color();
    const textCam = new THREE.Vector3();
    const textRay = new THREE.Vector3();
    const textPos = new THREE.Vector3();
    const textQuat = new THREE.Quaternion();
    const textTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0, 0));
    const textScale = new THREE.Vector3();
    const textMatrix = new THREE.Matrix4();
    const debrisProbe = new THREE.Vector3();
    let debrisFrame = 0;
    const TEXT_DEPTH = 24;
    /** 0..1: debris diving into the headline. Dives in over the flight, holds, then drifts back out. */
    const absorbAmount = (now: number) => {
      const { assembleAt, landAt } = interludeBus;
      if (!assembleAt || isCalm()) return 0;
      const fly = Math.max(1, landAt - assembleAt);
      const t = now - assembleAt;
      if (t < 0 || t > fly + 2200) return 0;
      if (t < fly * 0.6) return smoothstep01(t / (fly * 0.6));
      if (t < fly + 400) return 1;
      return 1 - smoothstep01((t - fly - 400) / 1800);
    };
    /** Places the clay blocks where the interlude's pixels are; returns whether it drew any. */
    const updateClayText = (calm: boolean) => {
      const px = interludeBus.pixels;
      const live = !calm && !!px && px.count > 0 && performance.now() - px.at < 300;
      clayText.visible = live;
      interludeBus.clay = live;
      if (!live || !px) {
        clayText.count = 0;
        return;
      }
      const rect = stage.getBoundingClientRect();
      camera.getWorldPosition(textCam);
      textQuat.copy(camera.quaternion).multiply(textTilt);
      // World units per CSS pixel at the text's distance from the lens.
      const perPx = (2 * TEXT_DEPTH * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
      const side = Math.max(0.001, (px.cell - 1) * perPx);
      const count = Math.min(px.count, CLAY_TEXT_MAX);
      const ink = document.documentElement.dataset.labTheme === "phosphor" ? textInkDark : textInk;
      for (let i = 0; i < count; i++) {
        const a = px.alpha[i];
        const nx = ((px.x[i] + px.cell / 2 - rect.left) / width) * 2 - 1;
        const ny = -(((px.y[i] + px.cell / 2 - rect.top) / height) * 2 - 1);
        textRay.set(nx, ny, 0.5).unproject(camera).sub(textCam).normalize();
        textPos.copy(textCam).addScaledVector(textRay, TEXT_DEPTH);
        // Blocks grow in as they arrive, like debris settling into place.
        textScale.set(side, side, side * 1.5).multiplyScalar(a <= 0 ? 0.0001 : 0.35 + 0.65 * a);
        textMatrix.compose(textPos, textQuat, textScale);
        clayText.setMatrixAt(i, textMatrix);
        textColor.copy(ink[px.row[i]] ?? ink[0]).lerp(textNeon, px.tint[i]);
        clayText.setColorAt(i, textColor);
      }
      clayText.count = count;
      clayText.instanceMatrix.needsUpdate = true;
      if (clayText.instanceColor) clayText.instanceColor.needsUpdate = true;
    };
    /** Screen positions of the exploded pieces, so the interlude's first blocks start from the debris. */
    const shareDebris = () => {
      const rect = stage.getBoundingClientRect();
      const out: Array<[number, number]> = [];
      for (const piece of journey.pieces) {
        if (!piece.obj.visible || out.length >= 220) continue;
        debrisProbe.setFromMatrixPosition(piece.obj.matrixWorld).project(camera);
        if (Math.abs(debrisProbe.x) > 1.1 || Math.abs(debrisProbe.y) > 1.1 || debrisProbe.z > 1) continue;
        out.push([rect.left + ((debrisProbe.x + 1) / 2) * width, rect.top + ((1 - debrisProbe.y) / 2) * height]);
      }
      interludeBus.debris = out;
    };
    let journeyWasOn = false;
    let journalEl: HTMLElement | null = null;
    const interludeEl = document.getElementById("interlude");
    let interludeTop = 0;
    let interludeSpan = 1;
    let smoothY = window.scrollY;
    const heroShell = host.closest(".hero-3d-shell");
    let stageOpacity = 1;
    const contactEl = document.getElementById("contact");
    const wordEl = contactEl?.querySelector<HTMLElement>("[data-contact-word]");
    const contactPose: ContactChoreography = {
      message: 0, links: 0, wordX: 0, wordY: 0.5, cellX: 0.06, cellY: 0.09, cellSize: 0.6,
      orbitX: 0, orbitY: 0, orbitRadiusX: 0.8, orbitRadiusY: 0.75, social: -1, energy: 0,
    };
    let contactMode = contactEl?.dataset.contactMode ?? "idle";
    let linksSeconds = 0;
    let contactSocial = -1;
    const contactObserver = new MutationObserver(() => {
      const nextMode = contactEl?.dataset.contactMode ?? "idle";
      if (nextMode !== contactMode) linksSeconds = 0;
      contactMode = nextMode;
      contactSocial = Number(contactEl?.dataset.contactSocial ?? -1);
      wake();
    });
    if (contactEl) contactObserver.observe(contactEl, { attributes: true, attributeFilter: ["data-contact-mode", "data-contact-social"] });

    /** Where each formation is fully formed, in page scroll pixels, from the real section positions. */
    const timeline = () => {
      const vh = window.innerHeight;
      const top = (id: string, fallback: number) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : fallback;
      };
      interludeTop = top("interlude", vh);
      interludeSpan = Math.max(1, (interludeEl?.offsetHeight ?? vh) - vh);
      const keys = [
        0,
        vh * 0.9,
        // Form the rings during the first title, then keep them through the four beats.
        interludeTop + vh * 0.25,
        top("method", vh * 3) - vh * 0.25,
        top("experience", vh * 2) - vh * 0.5,
        top("achievements", vh * 4) - vh * 0.6,
        top("contact", vh * 5) - vh * 0.3,
      ];
      for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i], keys[i - 1] + 60);
      return keys;
    };
    let keys = timeline();
    // Where the page content ends on screen (the columns of debris stay outside it), and the pointer.
    let contentEdge = 0.92;
    const measureContent = () => {
      const wrap = document.querySelector<HTMLElement>("[data-sheet] .wrap");
      if (wrap) contentEdge = clamp(1 - (2 * wrap.getBoundingClientRect().left) / Math.max(1, window.innerWidth), 0.5, 0.98);
    };
    measureContent();
    const pointerNdc = { x: 0, y: 0 };
    let pointerOn = false;
    const onStagePointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerNdc.y = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      pointerOn = true;
    };
    const onStagePointerOut = () => { pointerOn = false; };
    window.addEventListener("pointermove", onStagePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onStagePointerOut);
    const readScroll = () => wake();

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
      // The overview shifts the room slightly left on wide screens so /dev/dexter sits in clean space on the right.
      const wide = width >= 900;
      const dx = (wide ? 0.17 : 0) * width * cur.shift;
      const dy = (wide ? -0.065 : -0.14) * height * cur.shift;
      camera.setViewOffset(width, height, dx, dy, width, height);
    };

    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      renderer.setSize(width, height);
      // The fixed layer sits exactly where the hero canvas area is at the top of the page.
      stage.style.top = `${host.getBoundingClientRect().top + window.scrollY}px`;
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
      scene.background = new THREE.Color(getComputedStyle(document.body).backgroundColor || BACKDROP);
      keys = timeline();
      measureContent();
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
    // Sections change height as fonts, images and data load; keep the scroll timeline in step.
    const pageObserver = new ResizeObserver(() => { keys = timeline(); wake(); });
    pageObserver.observe(document.body);

    // ---------- Pointer: orbit, pinch, hover, click-to-focus ----------
    const raycaster = new THREE.Raycaster();
    raycaster.layers.enable(PROXY_LAYER); // the batched meshes' proxies still take the hits
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinchDist = 0;
    let hovered: FocusStation | null = null;
    let zoomTimer = 0;

    const pick = (e: { clientX: number; clientY: number }, targets: THREE.Object3D[]) => {
      // Once the page scrolls, the fixed 3D layer no longer lines up with the hero: no picking.
      if (window.scrollY > 4) return undefined;
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
      interludeBus.clay = false; // let the flat headline take over while the GPU is gone
      // A GPU that can't keep up drops the context; come back a tier lower, without AO.
      useAO = false;
      aoBlocked = true;
      pendingTier = tiers[governor.fail()];
    };
    const onContextRestored = () => {
      contextLost = false;
      if (pendingTier) applyTier(pendingTier, true);
      pendingTier = null;
      wake();
    };
    let pendingTier: QualityTier | null = null;
    let aoBlocked = false;
    let lastRendered = 0;
    const applyTier = (next: QualityTier, force = false) => {
      if (next === tier && !force) return;
      const resample = next.samples !== tier.samples;
      tier = next;
      renderer.setPixelRatio(tier.ratio);
      if (resample) composer.reset(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.samples }));
      resize();
      useAO = !aoBlocked && tier.ao > 0;
      renderer.shadowMap.needsUpdate = true;
      host.dataset.renderScale = String(tier.ratio);
      host.dataset.ao = useAO ? "on" : "off";
      host.dataset.tierLog = `${host.dataset.tierLog ?? ""} ${tier.ratio}${useAO ? "+ao" : ""}@${Math.round(performance.now() / 1000)}s`.trim();
    };
    /** Only consecutive rendered frames count; a paused layer's gap is ignored by the governor. */
    const adapt = (now: number) => {
      const interval = lastRendered ? now - lastRendered : 0;
      lastRendered = now;
      applyTier(tiers[governor.sample(interval)]);
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
      applyCamera();
      camera.updateMatrixWorld();
      if (!calm) animT += dt;

      // Which two formations the scroll sits between, and how far along.
      // Follow the page with a little lag, so a fast flick of the wheel plays the transition
      // through instead of jumping to its end.
      const pageY = window.scrollY;
      smoothY = calm || Math.abs(pageY - smoothY) < 0.5 ? pageY : smoothY + (pageY - smoothY) * (1 - Math.exp(-dt * 4.5));
      const scrolled = smoothY;
      let from = 0;
      let mix = 0;
      if (!calm) {
        while (from < keys.length - 1 && scrolled >= keys[from + 1]) from++;
        if (from < keys.length - 1) {
          const span = Math.min(keys[from + 1] - keys[from], window.innerHeight);
          mix = clamp((scrolled - (keys[from + 1] - span)) / span, 0, 1);
        }
      }
      const to = Math.min(from + 1, STAGES.length - 1);
      // Retarget from the current pose: repeated clicks never restart or snap the objects.
      const contactK = calm ? 1 : 1 - Math.exp(-dt * 4.8);
      if (contactMode === "links" && STAGES[from] === "frame" && !calm) linksSeconds += dt;
      contactPose.linksElapsed = linksSeconds;
      contactPose.message += ((contactMode === "message" ? 1 : 0) - contactPose.message) * contactK;
      contactPose.links += ((contactMode === "links" ? 1 : 0) - contactPose.links) * contactK;
      contactPose.energy += ((contactSocial >= 0 ? 1 : 0) - contactPose.energy) * contactK;
      if (contactSocial >= 0) contactPose.social = contactSocial;
      if (STAGES[to] === "frame" && wordEl) {
        const rect = wordEl.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const cell = Math.min(rect.width / (CONTACT_WORD_COLUMNS + 2), rect.height / 7);
        contactPose.wordX = ((rect.left + rect.width / 2 - stageRect.left) / width) * 2 - 1;
        contactPose.wordY = 1 - ((rect.top + rect.height * 0.43 - stageRect.top) / height) * 2;
        contactPose.cellX = cell * 2 / width;
        contactPose.cellY = cell * 2 / height;
        contactPose.cellSize = 2 * 26 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cell / height;
        const panelRect = document.getElementById("contact-panel")?.getBoundingClientRect();
        if (panelRect && contactMode === "links") {
          contactPose.orbitY = 1 - ((rect.top + (panelRect.bottom - rect.top) / 2 - stageRect.top) / height) * 2;
          // Bounds protect the entire heading, copy, buttons and card from the spiral's inner edge.
          const protectedWidth = Math.max(panelRect.width, rect.width);
          contactPose.orbitRadiusX = Math.max(.84, (protectedWidth + 150) / width * 1.16);
          contactPose.orbitRadiusY = Math.max(.8, (panelRect.bottom - rect.top + 120) / height * 1.16);
        }
      }
      if (contactEl) {
        const ready = !calm && STAGES[from] === "frame" && contactPose.message > .12;
        if ((contactEl.dataset.wordReady === "true") !== ready) contactEl.dataset.wordReady = String(ready);
        const linksPing = !calm && STAGES[from] === "frame" && contactMode === "links" && linksSeconds >= CONTACT_SPIRAL_SECONDS + 2.5;
        if ((contactEl.dataset.linksPing === "true") !== linksPing) contactEl.dataset.linksPing = String(linksPing);
      }
      // Reduced motion: no journey, the lab just fades as you leave the hero.
      const eased = mix * mix * (3 - 2 * mix);
      stageOpacity = calm
        ? 1 - clamp(scrolled / (window.innerHeight * 0.8), 0, 1)
        : STAGE_OPACITY[STAGES[from]] + (STAGE_OPACITY[STAGES[to]] - STAGE_OPACITY[STAGES[from]]) * eased;
      stage.style.opacity = String(stageOpacity);

      // The clock starts after the first frame is on screen: compiling shaders can take seconds.
      const built = calm ? Infinity : assembleFrom === 0 ? 0 : (now - assembleFrom) / 1000;
      const journeyOn = !(from === 0 && mix === 0 && built >= ASSEMBLE_SECONDS);
      if (journeyOn) aoAge = Infinity; // pieces are moving: occlusion must follow them
      if (journeyOn || journeyWasOn) journey.reset();
      lab.tick(animT);
      const shellOpacity = journey.apply({
        camera,
        time: animT,
        scroll: scrolled,
        interlude: clamp((scrolled - interludeTop) / interludeSpan, 0, 1),
        dt,
        absorb: absorbAmount(now),
        absorbY: (() => {
          const pin = interludeEl?.querySelector(".lab-interlude-pin")?.getBoundingClientRect();
          const top = stage.getBoundingClientRect().top;
          return pin ? 1 - ((pin.top + pin.height * 0.49 - top) / height) * 2 : 0;
        })(),
        contactTop: contactEl ? 1 - ((contactEl.getBoundingClientRect().top - stage.getBoundingClientRect().top) / height) * 2 : 1,
        contentEdge,
        pointer: pointerOn ? pointerNdc : null,
        contact: contactPose,
        from: STAGES[from],
        to: STAGES[to],
        mix,
        built,
      });
      journeyWasOn = journeyOn;
      updateClayText(calm);
      // Around the burst and the spiral, keep the debris positions fresh for the interlude.
      if (!calm && from >= 1 && from <= 2 && debrisFrame++ % 10 === 0) shareDebris();
      // The station buttons only make sense while the room is whole.
      heroShell?.classList.toggle("is-burst", from > 0 || mix > 0.04);
      if (sunShaft) sunShaft.visible = from === 0 && mix < 0.5 && shellOpacity > 0.5;
      const nearRoom = from === 0 && mix < 0.3;

      for (const [id, marker] of lab.markers) {
        const s = hovered === id ? 1.8 : stationRef.current === id ? 0.001 : 1;
        marker.scale.setScalar(calm ? s : marker.scale.x + (s - marker.scale.x) * Math.min(1, dt * 12));
      }

      // Shadows follow every frame while pieces are landing or leaving the floor.
      // Only the room needs its shadows; once it has blown apart, the GPU can skip them entirely.
      // At rest only small props animate, so a shadow refresh every fourth frame is enough.
      if (from === 0 && ((journeyOn && mix < 0.6) || shadowFrame % 4 === 0)) renderer.shadowMap.needsUpdate = true;
      shadowFrame += 1;
      // The journal is a full-screen scene of its own with an opaque backdrop. While it covers the
      // viewport this layer is invisible, so it stops drawing and leaves the GPU to the journal.
      const journal = (journalEl ??= document.getElementById("research"));
      const jr = journal?.getBoundingClientRect();
      const coveredByJournal = !!jr && jr.top <= 0 && jr.bottom >= window.innerHeight;
      if (stageOpacity > 0 && !coveredByJournal) {
        scene.updateMatrixWorld();
        batcher.sync();
        // AO only while the assembled room is on screen; the debris reads fine without it.
        if (useAO && nearRoom) composer.render(dt);
        else renderer.render(scene, camera);
        // The entrance (shader compiles, every piece in flight) is not the steady state; judge after it.
        if (!calm && built >= ASSEMBLE_SECONDS + 1) adapt(now);
        else lastRendered = 0;
      }
      if (!host.dataset.ready) {
        host.dataset.ready = "true"; // fade the scene in over the loader
        stage.dataset.ready = "true";
      }
      if (assembleFrom === 0) assembleFrom = performance.now();
      // The layer is always on screen; with reduced motion it only redraws on scroll.
      if (stageOpacity > 0 && !document.hidden && !calm) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (disposed || raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    // A theme change repaints the page colour; the scene's backdrop follows it.
    const onMotionChange = () => {
      scene.background = new THREE.Color(getComputedStyle(document.body).backgroundColor || BACKDROP);
      wake();
    };
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
      contactObserver.disconnect();
      if (contactEl) {
        delete contactEl.dataset.wordReady;
        delete contactEl.dataset.linksPing;
      }
      ro.disconnect();
      pageObserver.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("pointermove", onStagePointer);
      document.documentElement.removeEventListener("pointerleave", onStagePointerOut);
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
      batcher.dispose();
      renderer.dispose();
      // Hand the GPU context back now. Without this every hot reload leaks one, and the
      // browser eventually refuses to create any more.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      stage.remove();
      interludeBus.clay = false;
      interludeBus.debris = [];
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
    </>
  );
}
