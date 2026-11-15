"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { ResearchEntry } from "@/lib/content";
import { narraTexture } from "@/lib/filipino-lab";
import { site } from "@/lib/site";
import { createGovernor, qualityTiers, type QualityTier } from "@/lib/render-quality";

/** Set once the journal's context has been lost: later mounts this session start without AO. */
const LITE_KEY = "lab:journal-lite";

type Props = {
  studies: ResearchEntry[];
  progress: number;
  onRead: (index: number) => void;
  onReady: () => void;
  onUnsupported: () => void;
  /** The GPU context was lost and did not come back: the parent remounts or falls back. */
  onContextLost?: () => void;
};

/* ── Scroll choreography (shared with research-book.tsx) ───────────────── */
const OPEN_END = 0.14;
const READ_END = 0.94;
/** Within each study's scroll slot the leaf turns over local 0.55 → 1; past its midpoint the next study is "current". */
const FLIP_START = 0.55;
const FLIP_MID = 1 - (1 + FLIP_START) / 2;

/* ── Book dimensions (world units) ─────────────────────────────────────── */
const PAGE_W = 1.72; // page width, spine → fore-edge (x)
const PAGE_D = 2.36; // page height on the desk (z)
const BOARD_W = 1.8;
const BOARD_D = 2.48;
const BOARD_T = 0.04;
const BLOCK_T = 0.06; // paper block thickness per side
const SEG = 32;

/* ── Palette: Dexter's-lab night blues, warm spotlight, parol accents ──── */
const BG = 0xeef0f6; // the same pale table the hero's clay lab sits on
const CLOTH = 0x1a1f8c;
const PAPER = "#f5f0e3";
const GRID = "rgba(70, 92, 190, 0.13)";
const INK = "#1313ba";
const TEXT = "#0b0f2e"; // near-black ink: the daylight scene is bright, so the copy has to be dark
const MUTED = "#2a3052";

/** The research copy marks emphasis with `**word**`; the notebook pages print it plain. */
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Height profile of an open page: dips into the gutter, swells, then settles at the fore-edge. */
const bulge = (raw: number) => { const u = THREE.MathUtils.clamp(raw, 0, 1); return 0.05 * Math.sin(Math.PI * Math.pow(u, 0.55)) * (1 - 0.3 * u) - 0.022 * Math.pow(1 - u, 6); };
const bulgeSlope = (u: number) => {
  const h = 1 / SEG;
  return Math.atan((bulge(Math.min(1, u + h)) - bulge(Math.max(0, u - h))) / (2 * h * PAGE_W));
};

/* ── Canvas typesetting ────────────────────────────────────────────────── */
type Fonts = { body: string; heading: string; pixel: string };

function paperCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1646; // matches PAGE_W : PAGE_D
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  return { canvas, ctx };
}

function graphPaper(ctx: CanvasRenderingContext2D, side: "left" | "right") {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.5;
  for (let x = 40; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Gutter shade so the spread reads as bound paper, not two tiles.
  const gx = side === "left" ? width : 0;
  const gutter = ctx.createLinearGradient(gx, 0, side === "left" ? width - 150 : 150, 0);
  gutter.addColorStop(0, "rgba(20, 24, 60, 0.22)");
  gutter.addColorStop(1, "rgba(20, 24, 60, 0)");
  ctx.fillStyle = gutter;
  ctx.fillRect(side === "left" ? width - 150 : 0, 0, 150, height);
}

function writer(ctx: CanvasRenderingContext2D, x: number, maxWidth: number) {
  let y = 0;
  return {
    get y() {
      return y;
    },
    set y(v: number) {
      y = v;
    },
    text(value: string, size: number, weight: number, family: string, colour: string, lineHeight = 1.42, after = 0) {
      ctx.font = `${weight} ${size}px ${family}`;
      ctx.fillStyle = colour;
      ctx.textBaseline = "alphabetic";
      let line = "";
      for (const word of value.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          y += size;
          ctx.fillText(line, x, y);
          y += size * (lineHeight - 1);
          line = word;
        } else line = next;
      }
      if (line) {
        y += size;
        ctx.fillText(line, x, y);
        y += size * (lineHeight - 1);
      }
      y += after;
    },
    rule(colour: string, width = 2, after = 28) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + maxWidth, y);
      ctx.stroke();
      y += after;
    },
  };
}

function toTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function pageTexture(
  study: ResearchEntry,
  index: number,
  total: number,
  side: "left" | "right",
  fonts: Fonts,
  renderer: THREE.WebGLRenderer,
) {
  const { canvas, ctx } = paperCanvas();
  graphPaper(ctx, side);
  const margin = side === "left" ? 104 : 124;
  const w = writer(ctx, margin, canvas.width - 228);

  // Running head
  w.y = 70;
  ctx.font = `600 22px ${fonts.body}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(side === "left" ? `LAB NOTEBOOK · ENTRY 0${index + 1}` : "METHODS & FINDINGS", margin, 96);
  ctx.textAlign = "right";
  ctx.fillText(`0${index + 1} / 0${total}`, canvas.width - 104, 96);
  ctx.textAlign = "left";
  w.y = 124;
  w.rule("rgba(19, 19, 186, 0.35)", 2, 48);

  if (side === "left") {
    // Modality stamp
    ctx.font = `600 22px ${fonts.body}`;
    const stamp = study.modality.toUpperCase();
    const sw = ctx.measureText(stamp).width + 32;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(margin, w.y, sw, 42);
    ctx.fillStyle = INK;
    ctx.fillText(stamp, margin + 16, w.y + 29);
    w.y += 76;

    w.text(study.shortName, 62, 700, fonts.heading, INK, 1.12, 22);
    w.text(study.title, study.title.length > 160 ? 25 : 29, 600, fonts.body, TEXT, 1.4, 34);
    w.rule("rgba(26, 31, 61, 0.2)", 2, 38);
    w.text("PROBLEM", 22, 700, fonts.body, INK, 1.2, 14);
    w.text(plain(study.problem), 34, 600, fonts.heading, TEXT, 1.4, 40);
    w.text("METHODS", 22, 700, fonts.body, INK, 1.2, 14);
    study.methods.forEach((m, i) => w.text(`${i + 1}.  ${m}`, 27, 400, fonts.body, TEXT, 1.45, 12));
  } else {
    // Results first and big: the number is the headline, the label explains it.
    w.text("KEY RESULTS", 22, 700, fonts.body, INK, 1.2, 22);
    study.results.forEach((r) => {
      w.text(r.value, 76, 800, fonts.heading, INK, 1.05, 8);
      w.text(r.label, 27, 400, fonts.body, MUTED, 1.4, 44);
    });
    w.rule("rgba(26, 31, 61, 0.2)", 2, 30);
    w.text("CONCLUSION", 22, 700, fonts.body, INK, 1.2, 14);
    w.text(plain(study.conclusion), 32, 500, fonts.body, TEXT, 1.5, 0);
    // A hand-drawn margin note in the lab-notebook spirit.
    if (w.y < 1300) {
      w.y = Math.max(w.y, 1240);
      w.rule("rgba(26, 31, 61, 0.2)", 2, 34);
      w.text(study.authors.join(" · "), 22, 600, fonts.body, MUTED, 1.3, 10);
      w.text(study.institution, 22, 400, fonts.body, MUTED, 1.3, 10);
      w.text("Click the notebook to read the full entry.", 24, 400, fonts.body, MUTED, 1.3, 0);
    }
  }

  // Folio
  ctx.font = `500 22px ${fonts.body}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = side === "left" ? "left" : "right";
  ctx.fillText(String(index * 2 + (side === "left" ? 1 : 2)), side === "left" ? margin : canvas.width - 104, 1586);
  ctx.textAlign = "left";
  return toTexture(canvas, renderer);
}

function coverTexture(fonts: Fonts, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1411;
  const ctx = canvas.getContext("2d")!;
  // Book cloth with a faint woven grain.
  ctx.fillStyle = "#1a1f8c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,30,0.05)";
    ctx.fillRect(0, y, canvas.width, 1);
  }
  // Composition-style paper label.
  const lx = 150;
  const ly = 330;
  const lw = canvas.width - 300;
  const lh = 470;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, 22);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(lx + 18, ly + 18, lw - 36, lh - 36, 12);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `700 88px ${fonts.pixel}`;
  ctx.fillText("LAB", canvas.width / 2, ly + 150);
  ctx.fillText("NOTEBOOK", canvas.width / 2, ly + 240);
  ctx.font = `600 30px ${fonts.body}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("Computational & Experimental Biology", canvas.width / 2, ly + 320);
  ctx.strokeStyle = "rgba(19,19,186,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx + 90, ly + 360);
  ctx.lineTo(lx + lw - 90, ly + 360);
  ctx.stroke();
  ctx.font = `500 28px ${fonts.body}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${site.name} · Vol. 01`, canvas.width / 2, ly + 410);

  // Pixel flask emblem.
  const px = 16;
  const flask = ["..XXX..", "..X.X..", "..X.X..", ".X...X.", "X.OOO.X", "XOOOOOX", "XXXXXXX"];
  const fx = canvas.width / 2 - (flask[0].length * px) / 2;
  const fy = 1000;
  flask.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === ".") return;
      ctx.fillStyle = cell === "X" ? "#f5f0e3" : "#7cf0dc";
      ctx.fillRect(fx + c * px, fy + r * px, px, px);
    }),
  );
  ctx.font = `700 30px ${fonts.pixel}`;
  ctx.fillStyle = "#cbcbef";
  ctx.fillText("DEXTERSLAB", canvas.width / 2, 1240);
  ctx.textAlign = "left";
  return toTexture(canvas, renderer);
}

function edgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ece5d3";
  ctx.fillRect(0, 0, 8, 64);
  for (let y = 0; y < 64; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? "rgba(90,80,60,0.18)" : "rgba(255,255,255,0.35)";
    ctx.fillRect(0, y, 8, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ── Geometry builders ─────────────────────────────────────────────────── */

/** A paper block whose top surface follows the open-page profile; `swell` blends flat (closed) → curved (open). */
function paperBlock(pageMat: THREE.Material, edgeMat: THREE.Material, mirrored = false) {
  const group = new THREE.Group();
  const top = new THREE.PlaneGeometry(PAGE_W, PAGE_D, SEG, 1);
  if (mirrored) {
    // The parent is scaled x = -1, so pre-flip U to keep the typesetting readable.
    const uv = top.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  }
  top.rotateX(-Math.PI / 2);
  top.translate(PAGE_W / 2, 0, 0);
  const topMesh = new THREE.Mesh(top, pageMat);
  topMesh.receiveShadow = true;
  topMesh.castShadow = true;

  // Head, tail and fore-edge walls share one geometry.
  const cols = SEG + 1;
  const wallPos = new Float32Array((cols * 4 + 4) * 3);
  const wallUv = new Float32Array((cols * 4 + 4) * 2);
  const idx: number[] = [];
  for (const [w, z] of [
    [0, PAGE_D / 2],
    [1, -PAGE_D / 2],
  ] as const) {
    for (let i = 0; i < cols; i++) {
      const base = (w * cols * 2 + i * 2) * 3;
      wallPos.set([(i / SEG) * PAGE_W, 0, z, (i / SEG) * PAGE_W, BLOCK_T, z], base);
      const uvBase = (w * cols * 2 + i * 2) * 2;
      wallUv.set([i / SEG, 0, i / SEG, 1], uvBase);
      if (i < SEG) {
        const a = w * cols * 2 + i * 2;
        if (w === 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const f = cols * 4;
  wallPos.set([PAGE_W, 0, PAGE_D / 2, PAGE_W, BLOCK_T, PAGE_D / 2, PAGE_W, 0, -PAGE_D / 2, PAGE_W, BLOCK_T, -PAGE_D / 2], f * 3);
  wallUv.set([0, 0, 0, 1, 1, 0, 1, 1], f * 2);
  idx.push(f, f + 2, f + 1, f + 1, f + 2, f + 3);
  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.BufferAttribute(wallPos, 3));
  walls.setAttribute("uv", new THREE.BufferAttribute(wallUv, 2));
  walls.setIndex(idx);
  const wallMesh = new THREE.Mesh(walls, edgeMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;

  group.add(topMesh, wallMesh);

  let current = -1;
  const setSwell = (swell: number) => {
    if (Math.abs(swell - current) < 0.002) return;
    current = swell;
    const tp = top.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) tp.setY(i, BLOCK_T + swell * bulge(tp.getX(i) / PAGE_W));
    tp.needsUpdate = true;
    top.computeVertexNormals();
    const wp = walls.attributes.position as THREE.BufferAttribute;
    for (let w = 0; w < 2; w++)
      for (let i = 0; i < cols; i++) wp.setY(w * cols * 2 + i * 2 + 1, BLOCK_T + swell * bulge(i / SEG));
    wp.setY(f + 1, BLOCK_T + swell * bulge(1));
    wp.setY(f + 3, BLOCK_T + swell * bulge(1));
    wp.needsUpdate = true;
    walls.computeVertexNormals();
  };
  setSwell(0);
  return { group, setSwell };
}

function lathe(points: [number, number][], material: THREE.Material, segments = 40) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ResearchDeskCanvas({ studies, progress, onRead, onReady, onUnsupported, onContextLost }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const targetProgressRef = useRef(progress);
  targetProgressRef.current = progress;
  const latest = useRef({ studies, onRead, onReady, onUnsupported, onContextLost });
  latest.current = { studies, onRead, onReady, onUnsupported, onContextLost };
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let disposeScene = () => {};

    const start = async () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
      const heading = document.querySelector("#research-title");
      const fonts: Fonts = {
        body: bodyFamily,
        heading: (heading && getComputedStyle(heading).fontFamily) || bodyFamily,
        pixel: rootStyle.getPropertyValue("--font-pixel").trim() || bodyFamily,
      };
      try {
        await document.fonts.ready;
      } catch {}
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "default" });
      } catch {
        latest.current.onUnsupported();
        return;
      }
      const roomy = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) > 4;
      // One ladder of pixel ratio, MSAA and AO. Small devices, and any browser that already lost this
      // context once, start on the first tier without AO and never climb above it.
      const tiers = qualityTiers(devicePixelRatio || 1, 1.5);
      let lite = !roomy;
      try {
        lite ||= sessionStorage.getItem(LITE_KEY) === "1";
      } catch {}
      const governor = createGovernor(tiers.length, { start: lite ? Math.max(0, tiers.findIndex((t) => t.ao === 0)) : 0 });
      let tier: QualityTier = tiers[governor.index];
      renderer.setPixelRatio(tier.ratio);
      host.dataset.renderScale = String(tier.ratio);
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute(
        "aria-label",
        "A lab notebook on a pale tabletop in soft daylight. Its pages summarise each research study.",
      );

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(BG);
      scene.fog = new THREE.Fog(BG, 8.6, 17);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);

      /* Lighting: daylight on a white clay model, matching the hero lab. A soft sky fill and one
         low sun that throws long shadows across the bench. */
      scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccd8, 1.0));
      const spot = new THREE.SpotLight(0xfff4e6, 120, 20, 0.42, 0.9, 1.5); // kept modest so the pages don't wash out
      spot.position.set(-5.5, 8.5, -4.5);
      spot.target.position.set(0, 0, -0.1);
      spot.castShadow = true;
      spot.shadow.mapSize.setScalar(Math.min(renderer.capabilities.maxTextureSize, 2048));
      spot.shadow.camera.near = 0.5;
      spot.shadow.radius = roomy ? 3 : 1.5;
      spot.shadow.intensity = 0.78;
      spot.shadow.bias = -0.00008;
      spot.shadow.normalBias = 0.004;
      scene.add(spot, spot.target);
      const fill = new THREE.DirectionalLight(0xf2f4ff, 0.45); // shadowless fill from the viewer's side
      fill.position.set(-4, 3, 5);
      scene.add(fill);

      const disposables: { dispose(): void }[] = [];
      const std = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params);

      /* Desk: a narra-wood tabletop that falls off into the dark. */
      const deskWood = narraTexture([5, 5]);
      deskWood.anisotropy = renderer.capabilities.getMaxAnisotropy();
      disposables.push(deskWood);
      const bench = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), std({ map: deskWood, color: 0xb08a74, roughness: 0.5, metalness: 0.02 }));
      bench.rotation.x = -Math.PI / 2;
      bench.receiveShadow = true;
      scene.add(bench);

      /* Notebook */
      const edgeTex = edgeTexture();
      disposables.push(edgeTex);
      const edgeMat = std({ map: edgeTex, roughness: 0.95 });
      const clothMat = std({ color: CLOTH, roughness: 0.85 });
      const leftPageMat = std({ roughness: 0.92 });
      const rightPageMat = std({ roughness: 0.92 });

      const book = new THREE.Group();
      scene.add(book);

      const board = (parent: THREE.Object3D, x: number, y: number) => {
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(BOARD_W, BOARD_T, BOARD_D, 2, 0.012), clothMat);
        mesh.position.set(x, y, 0);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };

      // Right half (static): back board + right paper block.
      board(book, BOARD_W / 2 - 0.02, BOARD_T / 2);
      const rightBlock = paperBlock(rightPageMat, edgeMat);
      rightBlock.group.position.set(0, BOARD_T, 0);
      book.add(rightBlock.group);

      // Elastic band and ribbon — small details that sell "notebook".
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, BOARD_D + 0.01), std({ color: 0xff7a3d, roughness: 0.6 }));
      band.position.set(BOARD_W - 0.22, 0.002, 0);
      book.add(band);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.26), std({ color: 0xe0457b, roughness: 0.7 }));
      ribbon.position.set(0.5, 0.004, PAGE_D / 2 + 0.12);
      ribbon.receiveShadow = true;
      book.add(ribbon);

      // Front cover + left block hinge together. The pivot sits at the spine, at block-top height, so
      // the closed book is an exact mirror of the open spread (no interpenetration mid-swing).
      const hingeY = BOARD_T + BLOCK_T;
      const pivot = new THREE.Group();
      pivot.position.set(0, hingeY, 0);
      book.add(pivot);
      const leftHalf = new THREE.Group(); // authored in "open, lying left" pose
      leftHalf.position.set(0, -hingeY, 0);
      const inner = new THREE.Group();
      inner.rotation.z = Math.PI; // pre-flip so pivot.rotation.z = π lands it in the open pose
      pivot.add(inner);
      inner.add(leftHalf);
      // Authored in mirrored space: mirrored x so content lies on the left when open.
      const mirror = new THREE.Group();
      mirror.scale.x = -1;
      leftHalf.add(mirror);
      // inner (π) + pivot (π) = identity, so leftHalf is authored directly in its open pose; at θ = 0 the
      // same content is mirrored through the hinge onto the right block, i.e. a closed book.
      board(mirror, BOARD_W / 2 - 0.02, BOARD_T / 2);
      const leftBlock = paperBlock(leftPageMat, edgeMat, true);
      leftBlock.group.position.set(0, BOARD_T, 0);
      mirror.add(leftBlock.group);

      const coverMat = std({ roughness: 0.82 });
      const coverFace = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W - 0.04, BOARD_D - 0.04), coverMat);
      // Outside of the front cover faces down in the open pose (it rests on the bench).
      coverFace.rotation.x = Math.PI / 2;
      coverFace.rotation.z = Math.PI;
      coverFace.position.set(BOARD_W / 2 - 0.02, -0.001, 0);
      coverFace.scale.x = -1; // undo the parent mirror so the label reads correctly
      mirror.add(coverFace);

      // Spine: a soft rounded cylinder under the gutter.
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, BOARD_D, 20, 1, false, Math.PI, Math.PI), clothMat);
      spine.rotation.x = Math.PI / 2;
      spine.position.set(0, 0.05, 0);
      book.add(spine);

      /* Turning leaf: one strip, two faces, bent along its length every frame. */
      const turnGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_D, SEG, 1);
      turnGeo.rotateX(-Math.PI / 2);
      turnGeo.translate(PAGE_W / 2, 0, 0);
      const turnFrontMat = std({ roughness: 0.92, side: THREE.FrontSide });
      const turnBackMat = std({ roughness: 0.92, side: THREE.BackSide });
      const turnBackGeo = turnGeo.clone();
      const backUv = turnBackGeo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < backUv.count; i++) backUv.setX(i, 1 - backUv.getX(i));
      const turnFront = new THREE.Mesh(turnGeo, turnFrontMat);
      const turnBack = new THREE.Mesh(turnBackGeo, turnBackMat);
      turnFront.castShadow = turnBack.castShadow = true;
      const leaf = new THREE.Group();
      leaf.add(turnFront, turnBack);
      leaf.visible = false;
      book.add(leaf);

      const columnX = new Float32Array(SEG + 1);
      const columnY = new Float32Array(SEG + 1);
      const bendLeaf = (theta: number) => {
        // Arc-length integration: each segment's angle blends the right-page profile into the mirrored
        // left-page profile, minus a lag that makes the free edge trail the hinge (a real paper curl).
        const t = theta / Math.PI;
        const lag = 0.95 * Math.sin(theta);
        const ds = PAGE_W / SEG;
        let x = 0;
        let y = BOARD_T + BLOCK_T + bulge(0) + 0.004;
        columnX[0] = x;
        columnY[0] = y;
        for (let i = 1; i <= SEG; i++) {
          const u = (i - 0.5) / SEG;
          const rest = bulgeSlope(u);
          const phi = (1 - t) * rest + t * (Math.PI - rest) - lag * u * u * 1.3 + lag * u * 0.4;
          x += Math.cos(phi) * ds;
          y += Math.sin(phi) * ds;
          columnX[i] = x;
          columnY[i] = y + 0.004 * Math.sin(Math.PI * t);
        }
        for (const geo of [turnGeo, turnBackGeo]) {
          const pos = geo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            const col = i % (SEG + 1);
            pos.setX(i, columnX[col]);
            pos.setY(i, columnY[col]);
          }
          pos.needsUpdate = true;
          geo.computeVertexNormals();
        }
      };

      /* Props from the lab bench. */
      const props = new THREE.Group();
      scene.add(props);
      const glass = std({ color: 0xdff1ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false });
      const glow = (color: number, intensity = 1.6) =>
        std({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3, transparent: true, opacity: 0.92 });

      // Erlenmeyer flask with luminous teal reagent.
      const flask = new THREE.Group();
      flask.position.set(-2.65, 0, -0.25);
      const flaskProfile: [number, number][] = [
        [0, 0], [0.42, 0], [0.46, 0.04], [0.16, 0.66], [0.13, 0.7], [0.13, 0.95], [0.155, 0.98],
      ];
      flask.add(lathe(flaskProfile, glass));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), std({ color: 0xe8f4ff, roughness: 0.2 }));
      lip.rotation.x = Math.PI / 2;
      lip.position.y = 0.98;
      flask.add(lip);
      const reagent = lathe([[0, 0.015], [0.4, 0.015], [0.43, 0.05], [0.27, 0.36], [0, 0.36]], glow(0x34e3c9, 0.55));
      flask.add(reagent);
      const flaskLight = new THREE.PointLight(0x34e3c9, 3.2, 3.2, 1.6);
      flaskLight.position.set(0, 0.35, 0);
      flask.add(flaskLight);
      const bubbleMat = std({ color: 0xc9fff5, emissive: 0x7affea, emissiveIntensity: 0.9, transparent: true, opacity: 0.8 });
      const bubbleGeo = new THREE.SphereGeometry(1, 10, 8);
      const bubbles = Array.from({ length: 7 }, (_, i) => {
        const b = new THREE.Mesh(bubbleGeo, bubbleMat);
        b.userData.seed = i / 7;
        // Start small and placed, so calm/reduced-motion (which never animates) shows tiny resting bubbles.
        b.scale.setScalar(0.02);
        b.position.set(Math.cos(i) * 0.12, 0.06 + (i / 7) * 0.25, Math.sin(i) * 0.12);
        flask.add(b);
        return b;
      });
      // The reagent is alive: a little slime specimen that watches the cursor and blinks.
      const eyes = new THREE.Group();
      eyes.position.set(0, 0.2, 0.3);
      const eyeWhite = std({ color: 0xffffff, roughness: 0.3 });
      const pupilMat = std({ color: 0x0a0f33, roughness: 0.2 });
      const eyeGeo = new THREE.SphereGeometry(0.075, 18, 14);
      const pupilGeo = new THREE.SphereGeometry(0.038, 14, 10);
      const pupils: THREE.Mesh[] = [];
      for (const side of [-1, 1]) {
        const eye = new THREE.Group();
        eye.position.x = side * 0.1;
        eye.add(new THREE.Mesh(eyeGeo, eyeWhite));
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.z = 0.05;
        eye.add(pupil);
        pupils.push(pupil);
        eyes.add(eye);
      }
      const blush = std({ color: 0xff7aa8, emissive: 0xff7aa8, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 });
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), blush);
        cheek.position.set(side * 0.19, -0.07, 0.03);
        cheek.rotation.y = side * 0.5;
        eyes.add(cheek);
      }
      flask.add(eyes);
      let nextBlink = 2.5;
      props.add(flask);

      // Test-tube rack with parol-coloured samples.
      const rack = new THREE.Group();
      rack.position.set(2.45, 0, -1.2);
      rack.rotation.y = -0.12;
      const rackMat = std({ color: 0xdfe5f5, roughness: 0.5 });
      const shelf = new RoundedBoxGeometry(1.0, 0.06, 0.3, 2, 0.02);
      for (const y of [0.04, 0.42]) {
        const s = new THREE.Mesh(shelf, rackMat);
        s.position.y = y;
        s.castShadow = true;
        rack.add(s);
      }
      for (const x of [-0.46, 0.46]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.28), rackMat);
        leg.position.set(x, 0.23, 0);
        leg.castShadow = true;
        rack.add(leg);
      }
      [0xff8a3d, 0x4ade80, 0xff5fb8, 0xffd23f].forEach((color, i) => {
        const x = -0.3 + i * 0.2;
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.7, 18, 1, true), glass);
        tube.position.set(x, 0.42, 0);
        const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.28 + (i % 2) * 0.1, 18), glow(color, 0.9));
        fluid.position.set(x, 0.22 + (i % 2) * 0.05, 0);
        rack.add(tube, fluid);
      });
      props.add(rack);

      // Pencil resting beside the spread.
      const pencil = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), std({ color: 0xffc83d, roughness: 0.55 }));
      shaft.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), std({ color: 0xf1d6b0, roughness: 0.8 }));
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.72;
      const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 12), std({ color: 0xff7a93, roughness: 0.8 }));
      eraser.rotation.z = Math.PI / 2;
      eraser.position.x = -0.7;
      pencil.add(shaft, tip, eraser);
      pencil.position.set(2.25, 0.035, 0.55);
      pencil.rotation.y = 0.9;
      pencil.traverse((o) => (o.castShadow = true));
      props.add(pencil);

      // Coffee mug — the lab runs on it.
      const mug = new THREE.Group();
      mug.position.set(-2.15, 0, 1.6);
      const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.36, 28), std({ color: 0xff8a3d, roughness: 0.5 }));
      mugBody.position.y = 0.18;
      const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), std({ color: 0x3b2314, roughness: 0.3 }));
      coffee.rotation.x = -Math.PI / 2;
      coffee.position.y = 0.33;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20), std({ color: 0xff8a3d, roughness: 0.5 }));
      handle.position.set(0.21, 0.19, 0);
      mug.add(mugBody, coffee, handle);
      mug.traverse((o) => (o.castShadow = true));
      props.add(mug);

      // Round reading glasses, folded and set down beside the notebook.
      const specs = new THREE.Group();
      const frameMat = std({ color: 0x14185a, roughness: 0.35, metalness: 0.3 });
      const lensMat = std({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
      const rimGeo = new THREE.TorusGeometry(0.17, 0.02, 10, 40);
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(rimGeo, frameMat);
        rim.position.x = side * 0.21;
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.165, 32), lensMat);
        lens.position.x = side * 0.21;
        // Folded temple arm tucked behind the lenses.
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.018), frameMat);
        arm.position.set(side * 0.2, 0.0, -0.06 - (side > 0 ? 0.03 : 0));
        arm.rotation.y = side * 0.12;
        specs.add(rim, lens, arm);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 16, Math.PI), frameMat);
      bridge.position.y = 0.04;
      specs.add(bridge);
      // Lying on the bench, lenses tilted slightly up as real folded glasses rest on their arms.
      specs.rotation.set(-Math.PI / 2 + 0.28, 0, 0);
      const specsRig = new THREE.Group();
      specsRig.position.set(2.0, 0.17, 1.5);
      specsRig.rotation.y = -0.35;
      specsRig.add(specs);
      specsRig.traverse((o) => (o.castShadow = true));
      props.add(specsRig);

      // A petri dish with colourful colonies — tiny parol-coloured dots of life.
      const dish = new THREE.Group();
      dish.position.set(-2.55, 0, 0.78);
      const dishWall = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 40, 1, true), glass);
      dishWall.position.y = 0.04;
      const agar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 40), std({ color: 0xf2d98a, roughness: 0.4, transparent: true, opacity: 0.85 }));
      agar.position.y = 0.02;
      dish.add(dishWall, agar);
      const colonyGeo = new THREE.SphereGeometry(1, 10, 6);
      const colonyColors = [0xff8a3d, 0x4ade80, 0xff5fb8, 0x7cf0dc, 0xffffff];
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996;
        const r = 0.08 + ((i * 37) % 100) / 100 * 0.27;
        const colony = new THREE.Mesh(colonyGeo, std({ color: colonyColors[i % colonyColors.length], roughness: 0.5 }));
        const size = 0.018 + (i % 4) * 0.008;
        colony.scale.set(size, size * 0.5, size);
        colony.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
        dish.add(colony);
      }
      props.add(dish);

      /* Page textures, cached per study. */
      const pageCache = new Map<string, [THREE.Texture, THREE.Texture]>();
      const pages = (index: number): [THREE.Texture, THREE.Texture] => {
        const list = latest.current.studies;
        const study = list[index];
        const cached = pageCache.get(study.id);
        if (cached) return cached;
        const pair: [THREE.Texture, THREE.Texture] = [
          pageTexture(study, index, list.length, "left", fonts, renderer),
          pageTexture(study, index, list.length, "right", fonts, renderer),
        ];
        pageCache.set(study.id, pair);
        return pair;
      };
      coverMat.map = coverTexture(fonts, renderer);
      latest.current.studies.forEach((_, i) => pages(i));

      const setMap = (material: THREE.MeshStandardMaterial, map: THREE.Texture) => {
        if (material.map === map) return;
        material.map = map;
        material.needsUpdate = true;
      };

      const motion = matchMedia("(prefers-reduced-motion: reduce)");
      const calm = () => motion.matches || document.documentElement.dataset.labFx === "calm";

      let current = targetProgressRef.current;
      let pointerX = 0;
      let pointerY = 0;
      let smoothX = 0;
      let smoothY = 0;
      let frame = 0;
      let visible = true;
      let contextLost = false;
      let lastTime = performance.now();
      let shadowKey = "";
      const elapsed = { t: 0 };
      // Arrival: the notebook is carried in and set down on the table the first time you reach it.
      let placeT = calm() ? 1 : 0;
      let placing = false;
      let lostTimer = 0;

      /* Clay pass: everything turns matte white except what carries the content. Printed surfaces
         (pages, cover, labels) keep their textures; the notebook cloth and anything that glowed
         become the DOS-blue accent; glass stays glass. */
      {
        const clay = std({ color: 0xf3f3f5, roughness: 0.92, metalness: 0 });
        const accent = std({ color: 0x2323d2, roughness: 0.6, emissive: 0x2323d2, emissiveIntensity: 0.15 });
        const glass = std({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.3, depthWrite: false });
        const accentGlass = std({ color: 0x2323d2, roughness: 0.3, transparent: true, opacity: 0.4, depthWrite: false });
        disposables.push(clay, accent, glass, accentGlass);
        const swap = (m: THREE.Material) => {
          const sm = m as THREE.MeshStandardMaterial;
          if (m === leftPageMat || m === rightPageMat || m === turnFrontMat || m === turnBackMat || m === edgeMat) return m;
          if (sm.map && sm.map !== deskWood) return m;
          const lit = sm.emissive && sm.emissiveIntensity > 0 && sm.emissive.getHex() !== 0;
          const blue = m === clothMat || lit;
          if (m.transparent && m.opacity < 0.95) return blue ? accentGlass : glass;
          return blue ? accent : clay;
        };
        scene.traverse((o) => {
          if (o instanceof THREE.PointLight) o.visible = false;
          if (o instanceof THREE.Mesh) {
            o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
            const solid = (Array.isArray(o.material) ? o.material : [o.material]).every((m) => !m.transparent);
            o.castShadow = solid && o !== bench && o !== coverFace;
            o.receiveShadow = solid && o !== turnFront && o !== turnBack;
          }
        });
        // The tabletop is painted in exactly the page's background colour, with shadows laid over
        // it by a separate catcher. The scene then has no visible edge against the section behind
        // it, even for the moment a slow device lets the canvas trail the scroll.
        const flat = new THREE.MeshBasicMaterial({ color: BG, toneMapped: false, fog: false });
        const catcherMat = new THREE.ShadowMaterial({ color: 0x252b49, opacity: 0.3 });
        disposables.push(flat, catcherMat);
        (bench as THREE.Mesh).material = flat;
        bench.receiveShadow = false;
        const catcher = new THREE.Mesh(bench.geometry, catcherMat);
        catcher.rotation.x = -Math.PI / 2;
        catcher.position.y = 0.002;
        catcher.receiveShadow = true;
        scene.add(catcher);
      }

      // Contact shading anchors the cover, paper edges and small props to the tabletop.
      const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.samples }));
      composer.addPass(new RenderPass(scene, camera));
      const gtao = new GTAOPass(scene, camera, 1, 1);
      const gtaoSetSize = gtao.setSize.bind(gtao);
      gtao.setSize = (w: number, h: number) => {
        const s = tier.ao || 0.5;
        gtaoSetSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
      };
      gtao.blendIntensity = 0.55;
      gtao.updateGtaoMaterial({ radius: 0.16, distanceExponent: 1.6, thickness: 0.15, scale: 1, samples: roomy ? 16 : 8 });
      gtao.updatePdMaterial({ radius: 5, depthPhi: 1, normalPhi: 4, samples: 16 });
      const gtaoVisibility = gtao as unknown as { _overrideVisibility: () => void; _visibilityCache: THREE.Object3D[] };
      const hideBase = gtaoVisibility._overrideVisibility.bind(gtao);
      gtaoVisibility._overrideVisibility = () => {
        hideBase();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh && object.visible && (Array.isArray(object.material) ? object.material : [object.material]).every((material) => material.transparent)) {
            object.visible = false;
            gtaoVisibility._visibilityCache.push(object);
          }
        });
      };
      composer.addPass(gtao);
      const output = new OutputPass();
      composer.addPass(output);
      let useAO = tier.ao > 0;
      const render = () => { if (useAO) composer.render(); else renderer.render(scene, camera); };
      let lastRendered = 0;
      const applyTier = (next: QualityTier) => {
        if (next === tier) return;
        const resample = next.samples !== tier.samples;
        tier = next;
        renderer.setPixelRatio(tier.ratio);
        composer.setPixelRatio(tier.ratio);
        if (resample) composer.reset(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.samples }));
        useAO = !contextLost && tier.ao > 0;
        host.dataset.renderScale = String(tier.ratio);
        renderer.shadowMap.needsUpdate = true;
        resize();
      };
      /** Rendered frames only feed the governor while the loop runs back to back. */
      const adapt = (now: number) => {
        const interval = lastRendered ? now - lastRendered : 0;
        lastRendered = now;
        applyTier(tiers[governor.sample(interval)]);
      };

      const frameCamera = () => {
        const aspect = host.clientWidth / Math.max(1, host.clientHeight);
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        // Fit the full spread (~3.9 units wide) and keep the heading/HUD clear.
        // Portrait frames just the spread; landscape leaves room for the bench props.
        const distance = Math.max(7.6, (aspect < 0.9 ? 1.98 : 3.1) / (tanHalf * aspect));
        const elevation = THREE.MathUtils.degToRad(aspect < 0.9 ? 64 : 56);
        // Fog follows the camera so a far-back portrait framing doesn't fog out the notebook.
        const fog = scene.fog as THREE.Fog;
        fog.near = distance + 1.4;
        fog.far = distance + 9.5;
        camera.position.set(
          smoothX * 0.18,
          Math.sin(elevation) * distance + smoothY * -0.08,
          Math.cos(elevation) * distance,
        );
        camera.lookAt(0, 0, aspect < 0.9 ? 0.1 : -0.18);
      };

      const applyState = (p: number) => {
        const list = latest.current.studies;
        const count = list.length;

        const openEase = smoothstep(0.01, OPEN_END, p);
        // The notebook stays open through the end of the track, so the frame never empties as it scrolls away.
        const open = openEase;
        const coverAngle = open * Math.PI;
        pivot.rotation.z = coverAngle;
        // Pages swell only once the cover is well past vertical, so mirrored blocks never collide.
        const swell = smoothstep(0.55, 0.95, open);
        leftBlock.setSwell(swell);
        rightBlock.setSwell(swell);

        // Closed: centred on the right half and slightly askew. Open: spread centred on the spine.
        book.position.x = THREE.MathUtils.lerp(-BOARD_W / 2, 0, open);
        book.position.z = THREE.MathUtils.lerp(0.15, 0, open);
        book.rotation.y = THREE.MathUtils.lerp(-0.18, 0, openEase) + smoothX * 0.035;
        if (placeT < 1) {
          // Lowered in from above and the left, tilted like it's held at one edge, then it settles
          // flat with a small rock as it meets the wood.
          const e = 1 - Math.pow(1 - placeT, 3);
          const settle = Math.sin(placeT * Math.PI * 3.2) * Math.pow(1 - placeT, 2);
          book.position.y = (1 - e) * 1.9;
          book.position.x -= (1 - e) * 0.9;
          book.rotation.x = -(1 - e) * 0.32 + settle * 0.05;
          book.rotation.z = (1 - e) * 0.22 + settle * 0.04;
          book.rotation.y -= (1 - e) * 0.35;
        } else if (book.position.y !== 0) {
          book.position.y = 0;
          book.rotation.x = 0;
          book.rotation.z = 0;
        }

        const readingT = THREE.MathUtils.clamp((p - OPEN_END) / (READ_END - OPEN_END), 0, 1);
        const scaled = readingT * count;
        const base = Math.min(count - 1, Math.floor(scaled));
        const local = scaled - base;
        const canFlip = base < count - 1 && open > 0.98;
        let flip = canFlip ? smoothstep(FLIP_START, 1, local) : 0;
        if (calm()) flip = flip > 0.5 ? 1 : 0;

        if (flip > 0.001 && flip < 0.999) {
          const [curL, curR] = pages(base);
          const [nextL, nextR] = pages(base + 1);
          setMap(leftPageMat, curL);
          setMap(rightPageMat, nextR);
          setMap(turnFrontMat, curR);
          setMap(turnBackMat, nextL);
          leaf.visible = true;
          bendLeaf(flip * Math.PI);
        } else {
          leaf.visible = false;
          const [l, r] = pages(flip >= 0.999 ? Math.min(count - 1, base + 1) : base);
          setMap(leftPageMat, l);
          setMap(rightPageMat, r);
        }

        const key = `${placeT.toFixed(3)}|${coverAngle.toFixed(4)}|${leaf.visible ? flip.toFixed(4) : "-"}|${book.position.x.toFixed(4)}|${book.rotation.y.toFixed(4)}`;
        if (key !== shadowKey) {
          shadowKey = key;
          renderer.shadowMap.needsUpdate = true;
        }
        frameCamera();
      };

      const animateProps = (dt: number) => {
        elapsed.t += dt;
        for (const b of bubbles) {
          const phase = (elapsed.t * 0.35 + b.userData.seed) % 1;
          const angle = b.userData.seed * Math.PI * 2;
          const radius = 0.22 * (1 - phase * 0.5);
          b.position.set(Math.cos(angle) * radius * 0.6, 0.06 + phase * 0.3, Math.sin(angle) * radius * 0.6);
          b.scale.setScalar(0.018 + 0.012 * Math.sin(phase * Math.PI));
        }
        flaskLight.intensity = 3 + Math.sin(elapsed.t * 2.2) * 0.4;
        // Slime: a gentle wobble, eyes that follow the pointer, and an occasional double blink.
        reagent.scale.set(1 + Math.sin(elapsed.t * 3) * 0.02, 1 + Math.sin(elapsed.t * 3 + 1.5) * 0.03, 1);
        for (const pupil of pupils) pupil.position.set(smoothX * 0.025, -smoothY * 0.02, 0.05);
        if (elapsed.t > nextBlink) nextBlink = elapsed.t + 2.8 + Math.random() * 3.2;
        const sinceBlink = nextBlink - elapsed.t;
        const closing = sinceBlink < 0.14 ? Math.sin((sinceBlink / 0.14) * Math.PI) : 0;
        eyes.scale.y = 1 - closing * 0.9;
      };

      const draw = (now: number) => {
        frame = 0;
        if (contextLost || disposed) return;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const still = calm();
        const target = targetProgressRef.current;
        current += (target - current) * (still ? 1 : 1 - Math.exp(-dt * 9));
        if (Math.abs(target - current) < 0.0003) current = target;
        const k = still ? 1 : 1 - Math.exp(-dt * 6);
        smoothX += (pointerX - smoothX) * k;
        smoothY += (pointerY - smoothY) * k;

        // If the stage changed size without a resize event reaching us, catch up before drawing.
        const buffer = renderer.getSize(sizeProbe);
        if (buffer.x !== host.clientWidth || buffer.y !== host.clientHeight) resize();
        if (placing && placeT < 1) placeT = still ? 1 : Math.min(1, placeT + dt / 1.35);
        if (!still) {
          animateProps(dt);
          renderer.shadowMap.needsUpdate = true;
        }
        applyState(current);
        render();
        if (!still) adapt(now);

        // Bubbles keep the loop alive while on screen; otherwise render only while settling.
        const settling =
          (placing && placeT < 1) ||
          Math.abs(target - current) > 0.0003 || Math.abs(pointerX - smoothX) > 0.001 || Math.abs(pointerY - smoothY) > 0.001;
        if (visible && !document.hidden && (settling || !still)) frame = requestAnimationFrame(draw);
      };

      const sizeProbe = new THREE.Vector2();
      const wake = () => {
        if (!frame && visible && !document.hidden && !contextLost && !disposed) {
          lastTime = performance.now();
          frame = requestAnimationFrame(draw);
        }
      };
      wakeRef.current = wake;

      const resize = () => {
        camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
        camera.updateProjectionMatrix();
        // CSS sizes the canvas (100% of the stage); only the drawing buffer is set here.
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        composer.setSize(host.clientWidth, host.clientHeight);
        applyState(current);
        render();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      });
      io.observe(host);
      // Start the arrival once the stage is properly on screen, not while it is still preloading below.
      const arrival = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        placing = true;
        arrival.disconnect();
        wake();
      }, { threshold: 0.45 });
      arrival.observe(host);

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const hitsBook = (e: PointerEvent | MouseEvent) => {
        const rect = host.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return raycaster.intersectObject(book, true).length > 0;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        host.style.cursor = hitsBook(e) ? "pointer" : "";
        if (calm()) return;
        const rect = host.getBoundingClientRect();
        pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        wake();
      };
      const onPointerLeave = () => {
        pointerX = pointerY = 0;
        host.style.cursor = "";
        wake();
      };
      const onClick = (e: MouseEvent) => {
        if (!hitsBook(e)) return;
        const list = latest.current.studies;
        const readingT = THREE.MathUtils.clamp((current - OPEN_END) / (READ_END - OPEN_END), 0, 0.999);
        latest.current.onRead(Math.min(list.length - 1, Math.floor(readingT * list.length + FLIP_MID)));
      };
      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave);
      host.addEventListener("click", onClick);
      document.addEventListener("visibilitychange", wake);
      motion.addEventListener("change", wake);
      window.addEventListener("lab:preferences", wake);
      const onLost = (event: Event) => {
        event.preventDefault();
        contextLost = true;
        useAO = false;
        try {
          sessionStorage.setItem(LITE_KEY, "1");
        } catch {}
        // A context the browser never hands back would leave an empty stage: let the parent rebuild.
        window.clearTimeout(lostTimer);
        lostTimer = window.setTimeout(() => {
          if (contextLost && !disposed) latest.current.onContextLost?.();
        }, 1500);
      };
      const onRestored = () => {
        window.clearTimeout(lostTimer);
        contextLost = false;
        renderer.shadowMap.needsUpdate = true;
        wake();
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      renderer.domElement.addEventListener("webglcontextrestored", onRestored);

      resize();
      latest.current.onReady();
      wake();

      disposeScene = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(lostTimer);
        wakeRef.current = null;
        io.disconnect();
        arrival.disconnect();
        resizeObserver.disconnect();
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
        host.removeEventListener("click", onClick);
        document.removeEventListener("visibilitychange", wake);
        motion.removeEventListener("change", wake);
        window.removeEventListener("lab:preferences", wake);
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            geometries.add(object.geometry);
            (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => materials.add(m));
          }
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        pageCache.forEach(([a, b]) => {
          a.dispose();
          b.dispose();
        });
        coverMat.map?.dispose();
        disposables.forEach((d) => d.dispose());
        spot.shadow.map?.dispose();
        gtao.dispose();
        output.dispose();
        composer.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    void start().catch(() => {
      if (!disposed) latest.current.onUnsupported();
    });
    return () => {
      disposed = true;
      disposeScene();
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  }, [progress]);

  return <div ref={hostRef} className="research-desk-canvas" />;
}
