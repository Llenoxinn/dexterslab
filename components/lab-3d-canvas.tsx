"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createChristmasDecor } from "@/lib/christmas-lab";

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
const LIMITS = { thetaMin: -60 * DEG, thetaMax: 60 * DEG, phiMin: 52 * DEG, phiMax: 88 * DEG, radiusMin: 2.6 };
/** The camera lives inside the room: it never leaves these bounds, so the walls always fill the frame. */
const ROOM = { x: 6.5, zFront: 12.5, yMin: 0.6, yMax: 9 };

type Preset = { target: [number, number, number]; theta: number; phi: number; radius: number };

const OVERVIEW: Preset = { target: [0.6, 1.9, -1.2], theta: 6 * DEG, phi: 76 * DEG, radius: 13 };

/** Where the camera starts on load, before it pulls back to the overview. */
const INTRO: Preset = { target: [0.7, 1.75, -3.3], theta: -16 * DEG, phi: 84 * DEG, radius: 4.2 };

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

function createFloorTexture() {
  return pixelTexture(32, 32, (ctx) => {
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#0a0a5d" : "#0e0e78";
        ctx.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  });
}

/** Riveted wall panels, two units square. */
function createWallTexture() {
  return pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#1313ba";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#0f0fa2";
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 0, 1, 32);
    ctx.fillStyle = "#2222d0";
    ctx.fillRect(1, 1, 31, 1);
    ctx.fillStyle = "#3838e6";
    for (const [x, y] of [[3, 3], [29, 3], [3, 29], [29, 29]]) ctx.fillRect(x, y, 1, 1);
  });
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

function createBlueprintTexture() {
  return pixelTexture(96, 64, (ctx) => {
    ctx.fillStyle = "#1313ba";
    ctx.fillRect(0, 0, 96, 64);
    ctx.fillStyle = "#2424d6";
    for (let x = 0; x < 96; x += 8) ctx.fillRect(x, 0, 1, 64);
    for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 96, 1);
    ctx.fillStyle = "#f6f6fc";
    // flask outline
    ctx.fillRect(18, 10, 8, 1);
    ctx.fillRect(19, 11, 1, 14);
    ctx.fillRect(24, 11, 1, 14);
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(18 - i, 25 + i * 2, 1, 2);
      ctx.fillRect(25 + i, 25 + i * 2, 1, 2);
    }
    ctx.fillRect(7, 49, 30, 1);
    ctx.fillStyle = "#6666fd";
    for (let i = 0; i < 8; i++) ctx.fillRect(11 - Math.min(i, 3), 41 + i, 22 + Math.min(i, 3) * 2, 1);
    // waveform + notes
    ctx.fillStyle = "#f6f6fc";
    for (let x = 0; x < 40; x++) {
      ctx.fillRect(50 + x, Math.round(20 + Math.sin(x * 0.45) * 7), 1, 1);
    }
    ctx.fillStyle = "#cbcbef";
    ctx.fillRect(50, 36, 34, 2);
    ctx.fillRect(50, 42, 26, 2);
    ctx.fillRect(50, 48, 38, 2);
    ctx.fillRect(50, 54, 16, 2);
  });
}

type LabBuild = {
  stations: THREE.Object3D[];
  markers: Map<FocusStation, THREE.Mesh>;
  tick: (t: number) => void;
  activate: (object: THREE.Object3D, instant?: boolean) => boolean;
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

  const floorTex = createFloorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(7, 9);
  const wallTex = createWallTexture();
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(7, 6);
  const sideWallTex = wallTex.clone();
  sideWallTex.repeat.set(9, 6);
  textures.push(wallTex, sideWallTex);
  const crtTex = createCrtTexture();
  const blueprintTex = createBlueprintTexture();
  textures.push(floorTex, crtTex, blueprintTex);

  const M = {
    wall: std(0x263650),
    sideWall: std(0x1b2b46),
    floor: std(0x24364c, { roughness: 0.5 }),
    paper: std(0xe9e7df),
    lav: std(0xa5bac7),
    ink: std(0x324b6e),
    mid: std(0x4f7796),
    deep: std(0x10233d),
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
    tankFluid: std(NEON, { emissive: INK, emissiveIntensity: 0.6, transparent: true, opacity: 0.22, depthWrite: false }),
    holo: new THREE.MeshBasicMaterial({
      color: NEON,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    screen: new THREE.MeshBasicMaterial({ map: crtTex, toneMapped: false }),
    blueprint: new THREE.MeshBasicMaterial({ map: blueprintTex, toneMapped: false }),
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

  // ---------- Shell: a full room. The floor and walls run past every edge of the frame. ----------
  const floor = put(root, new THREE.PlaneGeometry(14, 18), M.floor, 0, 0, 5);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  put(root, box(14.6, 12, 0.3), M.wall, 0, 6, -4.15).castShadow = false;
  for (const side of [-1, 1]) {
    put(root, box(0.3, 12, 18), M.sideWall, side * 7.15, 6, 5).castShadow = false;
    put(root, box(0.06, 0.2, 18), M.deep, side * 6.97, 0.1, 5, false);
    put(root, box(0.05, 0.1, 18), M.mid, side * 6.975, 4.6, 5, false);
  }
  put(root, box(14, 0.2, 0.06), M.deep, 0, 0.1, -3.97, false);
  put(root, box(14, 0.1, 0.05), M.mid, 0, 4.6, -3.975, false);

  // pendant lamps: the cords run up out of frame
  for (const [x, z] of [[1.0, -2.2], [5.9, -1.6]] as const) {
    put(root, cyl(0.02, 0.02, 8, 5), M.deep, x, 8.6, z, false);
    put(root, cyl(0.12, 0.42, 0.3, 8), M.deep, x, 4.5, z);
    put(root, cyl(0.2, 0.2, 0.05, 8), M.glow, x, 4.34, z, false);
  }

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
  put(root, box(1.9, 1.34, 0.06), M.paper, 5.7, 3.1, -3.97);
  const board = put(root, new THREE.PlaneGeometry(1.76, 1.2), M.blueprint, 5.7, 3.1, -3.935, false);
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
    [-0.35, 3.3, -0.45],
    [-0.5, 4.2, -0.6],
    [-0.5, 8, -0.6],
    [-0.5, 12.5, -0.6],
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
  put(drone, box(0.2, 0.08, 0.03), M.neon, 0, 0, 0.22, false);
  put(drone, box(0.03, 0.18, 0.03), M.deep, 0, 0.16, -0.1, false);
  const rotors = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      put(drone, box(0.05, 0.06, 0.05), M.deep, sx * 0.3, 0.09, sz * 0.3, false);
      return put(drone, box(0.34, 0.015, 0.05), M.ink, sx * 0.3, 0.13, sz * 0.3, false);
    }),
  );

  let lastArc = -1;
  let lastLed = -1;
  const tmp = new THREE.Vector3();

  return {
    stations: [terminal, core, tank, bench, rack],
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.imageRendering = "auto";
    host.dataset.renderStyle = "smooth";
    host.appendChild(renderer.domElement);

    scene.background = new THREE.Color(0x14253e);
    scene.fog = new THREE.Fog(0x14253e, 19, 42);
    scene.add(new THREE.HemisphereLight(0xd8e6ff, 0x243249, 1.9));
    const key = new THREE.DirectionalLight(0xffe4bd, 3.2);
    key.position.set(5, 13, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.camera.far = 50;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    const tankGlow = new THREE.PointLight(NEON, 14, 7);
    tankGlow.position.set(4.6, 1.9, 0.3);
    const coreGlow = new THREE.PointLight(0xffc787, 14, 7);
    coreGlow.position.set(-2.4, 1.5, 0.8);
    const crtGlow = new THREE.PointLight(PAPER, 3, 3.5);
    crtGlow.position.set(0.9, 1.8, -2.5);
    const lampGlow = new THREE.PointLight(0xffd5a2, 18, 9);
    lampGlow.position.set(1.0, 4.1, -2.2);
    scene.add(key, tankGlow, coreGlow, crtGlow, lampGlow);

    const textures: THREE.Texture[] = [];
    const root = new THREE.Group();
    scene.add(root);
    const lab = buildLab(root, textures);

    // ---------- Camera rig: damped spherical orbit around a target ----------
    let width = 1;
    let height = 1;
    const overviewRadius = () => clamp(OVERVIEW.radius * Math.max(1, 1.2 / (width / height)), OVERVIEW.radius, 14.5);

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

    const applyCamera = () => {
      const sinPhi = Math.sin(cur.phi);
      const r = cur.radius;
      camera.position.set(
        clamp(cur.target.x + r * sinPhi * Math.sin(cur.theta), -ROOM.x, ROOM.x),
        clamp(cur.target.y + r * Math.cos(cur.phi), ROOM.yMin, ROOM.yMax),
        Math.min(cur.target.z + r * sinPhi * Math.cos(cur.theta), ROOM.zFront),
      );
      camera.lookAt(cur.target);
      // The overview leaves room for the hero copy: beside it on wide screens, below it on narrow ones.
      const wide = width >= 900;
      const dx = wide ? -0.1 * width * cur.shift : 0;
      const dy = wide ? 0 : -0.14 * height * cur.shift;
      camera.setViewOffset(width, height, dx, dy, width, height);
    };

    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      renderer.setSize(width, height);
      if (stationRef.current === "overview" && !zoomedRef.current) goal.radius = overviewRadius();
      else goal.radius = Math.min(goal.radius, overviewRadius());
    };
    resize();
    // One load moment: start close on the terminal, then pull back to the whole room.
    let introUntil = 0;
    if (stationRef.current === "overview" && !zoomedRef.current && !isCalm()) {
      setGoal(INTRO);
      snap();
      introUntil = performance.now() + 2600;
    }
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
    let animT = 0;
    let shadowFrame = 0;

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
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
      applyCamera();

      if (!calm) animT += dt;
      lab.tick(animT);
      for (const [id, marker] of lab.markers) {
        const s = hovered === id ? 1.8 : stationRef.current === id ? 0.001 : 1;
        marker.scale.setScalar(calm ? s : marker.scale.x + (s - marker.scale.x) * Math.min(1, dt * 12));
      }

      if (shadowFrame % 4 === 0) renderer.shadowMap.needsUpdate = true;
      shadowFrame += 1;
      renderer.render(scene, camera);
      if (visible && !covered && !document.hidden && !calm) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (disposed || raf || !visible || covered || document.hidden) return;
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
      renderer.dispose();
      // Hand the GPU context back now. Without this every hot reload leaks one, and the
      // browser eventually refuses to create any more.
      renderer.forceContextLoss();
      renderer.domElement.remove();
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
