"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ResearchEntry } from "@/lib/content";
import { site } from "@/lib/site";

type Props = {
  studies: ResearchEntry[];
  progress: number;
  onRead: (index: number) => void;
  onReady: () => void;
  onUnsupported: () => void;
};

const JOURNAL_TITLE = "Computational & Experimental Biology";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Typeset real manuscript content onto a physical page using the portfolio's loaded fonts. */
function manuscriptTexture(
  study: ResearchEntry,
  page: "abstract" | "methods" | "cover",
  headingFont: string,
  bodyFont: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1448;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The manuscript could not be drawn.");

  const width = canvas.width;
  const height = canvas.height;
  const margin = 84;
  const contentWidth = width - margin * 2;
  let y = 84;

  const isCover = page === "cover";
  ctx.fillStyle = isCover ? "#121f38" : "#f3efe6";
  ctx.fillRect(0, 0, width, height);

  if (isCover) {
    ctx.strokeStyle = "#cfa95e";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.strokeStyle = "rgba(207, 169, 94, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, width - 128, height - 128);
  } else {
    // Subtle inner-gutter shadow so the two pages feel bound into a real spine.
    const gutter = ctx.createLinearGradient(
      page === "abstract" ? width - 88 : 0,
      0,
      page === "abstract" ? width : 88,
      0,
    );
    if (page === "abstract") {
      gutter.addColorStop(0, "rgba(15, 24, 42, 0)");
      gutter.addColorStop(1, "rgba(15, 24, 42, 0.10)");
      ctx.fillStyle = gutter;
      ctx.fillRect(width - 88, 0, 88, height);
    } else {
      gutter.addColorStop(0, "rgba(15, 24, 42, 0.10)");
      gutter.addColorStop(1, "rgba(15, 24, 42, 0)");
      ctx.fillStyle = gutter;
      ctx.fillRect(0, 0, 88, height);
    }
  }

  const drawWrapped = (
    value: string,
    size: number,
    weight: number,
    fontFamily: string,
    colour: string,
    lineHeight = 1.44,
    gapAfter = 0,
  ) => {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    ctx.fillStyle = colour;
    const words = value.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > contentWidth && line) {
        ctx.fillText(line, margin, y);
        y += size * lineHeight;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ctx.fillText(line, margin, y);
      y += size * lineHeight;
    }
    y += gapAfter;
  };

  const drawRule = (color = isCover ? "#cfa95e" : "#c5bfb2", thickness = isCover ? 2 : 1.5, gap = 38) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += gap;
  };

  if (isCover) {
    y = 148;
    drawWrapped("RESEARCH MONOGRAPH", 22, 600, bodyFont, "#dfc07c", 1.3, 24);
    drawRule("#cfa95e", 2, 48);
    y = 430;
    drawWrapped(JOURNAL_TITLE, 68, 700, headingFont, "#f6ebd0", 1.16, 48);
    drawWrapped(site.name, 30, 600, bodyFont, "#e6edf9", 1.35, 10);
    drawWrapped("University of the Philippines Cebu", 24, 400, bodyFont, "#9fb3d1", 1.35, 0);
    y = 1288;
    drawRule("rgba(207, 169, 94, 0.45)", 1.5, 34);
    drawWrapped("VOL. I · DEXTER'S LAB", 20, 600, bodyFont, "#dfc07c", 1.2, 0);
  } else {
    const ink = "#0f172a";
    const muted = "#475569";
    const accent = "#1313ba";

    // Running header
    ctx.font = `600 18px ${bodyFont}`;
    ctx.fillStyle = muted;
    ctx.fillText(
      page === "abstract" ? `RESEARCH · ${study.domain.toUpperCase()}` : "METHODS & EXPERIMENTAL HIGHLIGHTS",
      margin,
      y,
    );
    y += 22;
    drawRule("#cbc4b6", 1.5, 42);

    if (page === "abstract") {
      // Modality badge
      ctx.font = `600 18px ${bodyFont}`;
      const badgeText = study.modality.toUpperCase();
      const badgeW = ctx.measureText(badgeText).width + 26;
      ctx.fillStyle = "rgba(19, 19, 186, 0.08)";
      ctx.fillRect(margin, y - 22, badgeW, 34);
      ctx.strokeStyle = "rgba(19, 19, 186, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margin, y - 22, badgeW, 34);
      ctx.fillStyle = accent;
      ctx.fillText(badgeText, margin + 13, y + 1);
      y += 46;

      drawWrapped(
        study.title,
        study.title.length > 180 ? 34 : 40,
        700,
        headingFont,
        ink,
        1.25,
        24,
      );
      drawWrapped(site.name, 26, 600, bodyFont, ink, 1.35, 4);
      drawWrapped("University of the Philippines Cebu", 22, 400, bodyFont, muted, 1.35, 36);

      drawRule("#cbc4b6", 1.5, 38);

      drawWrapped("STUDY OVERVIEW", 20, 700, bodyFont, accent, 1.3, 14);
      drawWrapped(study.summary, 28, 400, bodyFont, "#1e293b", 1.52, 34);

      drawWrapped("KEYWORDS", 18, 700, bodyFont, muted, 1.3, 12);
      drawWrapped(study.tags.join("  ·  "), 22, 500, bodyFont, "#334155", 1.45, 0);
    } else {
      for (let i = 0; i < study.highlights.length; i++) {
        const highlight = study.highlights[i];
        drawWrapped(`0${i + 1} · ${highlight.heading.toUpperCase()}`, 22, 700, bodyFont, accent, 1.3, 14);
        drawWrapped(highlight.detail, 28, 400, bodyFont, "#1e293b", 1.52, 42);
      }

      if (y < 1180) {
        y = Math.max(y + 12, 1080);
        drawRule("#cbc4b6", 1.5, 34);
        drawWrapped("LABORATORY CONTEXT", 18, 700, bodyFont, muted, 1.3, 12);
        drawWrapped(
          `Prepared as part of computational and wet-lab research at ${site.name}'s UP Cebu portfolio.`,
          23,
          400,
          bodyFont,
          "#334155",
          1.48,
          0,
        );
      }
    }

    // Running footer
    y = 1356;
    drawRule("#cbc4b6", 1.5, 34);
    ctx.font = `500 19px ${bodyFont}`;
    ctx.fillStyle = muted;
    ctx.fillText(study.shortName, margin, 1396);
    ctx.textAlign = "right";
    ctx.fillText(page === "abstract" ? "01" : "02", width - margin, 1396);
    ctx.textAlign = "left";
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Fine horizontal page-stack striations for the book block edges. */
function pageEdgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ece6da";
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? "rgba(71, 85, 105, 0.16)" : "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(0, y, 64, 1.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Deform a subdivided page plane into a realistic arched page-turn curve. */
function deformTurnPage(
  geo: THREE.PlaneGeometry,
  basePos: Float32Array,
  angle: number,
  pageWidth: number,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arch = Math.sin(angle);
  for (let i = 0; i < pos.count; i++) {
    const bx = basePos[i * 3];
    const by = basePos[i * 3 + 1];
    const u = THREE.MathUtils.clamp((bx + pageWidth / 2) / pageWidth, 0, 1);
    const curl = Math.sin(u * Math.PI) * 0.22 * arch + u * u * 0.05 * Math.sin(angle * 2);
    pos.setXYZ(i, bx, by, curl);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function ResearchDeskCanvas({ studies, progress, onRead, onReady, onUnsupported }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const targetProgressRef = useRef(progress);
  targetProgressRef.current = progress;
  const latest = useRef({ studies, onRead, onReady, onUnsupported });
  latest.current = { studies, onRead, onReady, onUnsupported };
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let disposeScene = () => {};

    const start = async () => {
      // Resolve the actual loaded Next.js font families from the DOM so canvas text matches the site.
      const bodyStyle = getComputedStyle(document.body);
      const h2El = document.querySelector("#research-title");
      const headingFont = (h2El ? getComputedStyle(h2El).fontFamily : bodyStyle.fontFamily) || "Inter, sans-serif";
      const bodyFont = bodyStyle.fontFamily || "Inter, sans-serif";

      try {
        await document.fonts.ready;
      } catch {}
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "default" });
      } catch {
        latest.current.onUnsupported();
        return;
      }

      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.96;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-label", "3D scroll-driven research journal");

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f1c30);
      scene.fog = new THREE.Fog(0x0f1c30, 12, 24);

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);

      // Calibrated studio lighting so pages stay crisp and high-contrast without overexposure.
      scene.add(new THREE.HemisphereLight(0xdce7fa, 0x132036, 1.35));
      const key = new THREE.DirectionalLight(0xfff0db, 1.9);
      key.position.set(-2.6, 7.2, 3.8);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -4.2;
      key.shadow.camera.right = 4.2;
      key.shadow.camera.top = 4.2;
      key.shadow.camera.bottom = -4.2;
      key.shadow.normalBias = 0.02;
      scene.add(key);

      const rim = new THREE.PointLight(0x7ca9eb, 8, 14);
      rim.position.set(4.0, 3.8, -3.0);
      scene.add(rim);

      const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });

      const clothNavy = mat(0x132440, { roughness: 0.84, metalness: 0.05 });
      const brass = mat(0xcfa95e, { metalness: 0.8, roughness: 0.28 });
      const paperEdgeTex = pageEdgeTexture();
      const paperBlockMat = mat(0xece6da, { roughness: 0.92, map: paperEdgeTex ?? undefined });
      const deskMat = mat(0x122238, { roughness: 0.9, metalness: 0.04 });
      const deskPadMat = mat(0x0c1729, { roughness: 0.88 });

      const addMesh = (
        parent: THREE.Object3D,
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        x: number,
        y: number,
        z: number,
      ) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };

      const box = (
        parent: THREE.Object3D,
        material: THREE.Material,
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
      ) => addMesh(parent, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.16), material, x, y, z);

      // Grounded reading surface + subtle desk blotter pad.
      const desk = addMesh(scene, new THREE.PlaneGeometry(28, 22), deskMat, 0, 0, 0);
      desk.rotation.x = -Math.PI / 2;
      desk.castShadow = false;
      const deskPad = box(scene, deskPadMat, 4.6, 0.015, 3.2, 0, 0.006, 0);
      deskPad.castShadow = false;

      // Book assembly centered at (0, 0.02, 0).
      const book = new THREE.Group();
      book.position.set(0, 0.02, 0);
      scene.add(book);

      const pageWidth = 1.66;
      const pageHeight = 2.34;

      // Back cover board (right half, rests on desk).
      box(book, clothNavy, 1.76, 0.052, 2.48, 0.88, 0.026, 0);
      box(book, brass, 0.11, 0.058, 0.11, 1.71, 0.026, -1.19);
      box(book, brass, 0.11, 0.058, 0.11, 1.71, 0.026, 1.19);

      // Rounded spine with brass bands.
      const spineGroup = new THREE.Group();
      book.add(spineGroup);
      const spineCyl = addMesh(spineGroup, new THREE.CylinderGeometry(0.058, 0.058, 2.48, 20), clothNavy, 0, 0.04, 0);
      spineCyl.rotation.x = Math.PI / 2;
      for (const rz of [-0.92, -0.32, 0.32, 0.92]) {
        const rib = addMesh(spineGroup, new THREE.CylinderGeometry(0.064, 0.064, 0.032, 16), brass, 0, 0.04, rz);
        rib.rotation.x = Math.PI / 2;
      }

      // Left and right paper blocks (sit on top of the cover boards at y = 0.052).
      const leftStack = box(book, paperBlockMat, pageWidth, 0.11, pageHeight, -0.85, 0.107, 0);
      box(book, paperBlockMat, pageWidth, 0.11, pageHeight, 0.85, 0.107, 0);

      // Crimson silk ribbon bookmark.
      const ribbon = box(book, mat(0xa8434e, { roughness: 0.72 }), 0.085, 0.01, 0.34, 0.42, 0.052, 1.24);
      ribbon.castShadow = false;

      // Static left & right reading surfaces (y = 0.164, cleanly above the 0.162 stack top).
      const leftPageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, side: THREE.FrontSide });
      const rightPageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, side: THREE.FrontSide });
      const leftPage = addMesh(book, new THREE.PlaneGeometry(pageWidth, pageHeight), leftPageMat, -0.85, 0.164, 0);
      leftPage.rotation.x = -Math.PI / 2;
      leftPage.castShadow = false;
      const rightPage = addMesh(book, new THREE.PlaneGeometry(pageWidth, pageHeight), rightPageMat, 0.85, 0.164, 0);
      rightPage.rotation.x = -Math.PI / 2;
      rightPage.castShadow = false;

      // Front hardcover pivot: starts at y = 0.188 when closed, and drops to y = 0.026 when fully open
      // so it lies flat UNDER the left paper stack instead of burying the left page.
      const coverPivot = new THREE.Group();
      coverPivot.position.set(0, 0.188, 0);
      book.add(coverPivot);
      box(coverPivot, clothNavy, 1.76, 0.052, 2.48, 0.88, 0, 0);
      box(coverPivot, brass, 0.11, 0.058, 0.11, 1.71, 0, -1.19);
      box(coverPivot, brass, 0.11, 0.058, 0.11, 1.71, 0, 1.19);

      const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.06 });
      const coverFace = addMesh(coverPivot, new THREE.PlaneGeometry(1.72, 2.44), coverMat, 0.88, 0.028, 0);
      coverFace.rotation.x = -Math.PI / 2;
      coverMat.map = manuscriptTexture(latest.current.studies[0], "cover", headingFont, bodyFont);

      // Curved 3D turning page pivot.
      const turnPivot = new THREE.Group();
      turnPivot.position.set(0, 0.168, 0);
      book.add(turnPivot);

      const turnFrontGeo = new THREE.PlaneGeometry(pageWidth, pageHeight, 24, 1);
      const turnBackGeo = new THREE.PlaneGeometry(pageWidth, pageHeight, 24, 1);
      const backUv = turnBackGeo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < backUv.count; i++) {
        backUv.setX(i, 1 - backUv.getX(i));
      }
      backUv.needsUpdate = true;
      const baseTurnPositions = new Float32Array((turnFrontGeo.attributes.position as THREE.BufferAttribute).array);

      const turnFrontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, side: THREE.FrontSide });
      const turnBackMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, side: THREE.BackSide });

      const turnFrontMesh = new THREE.Mesh(turnFrontGeo, turnFrontMat);
      turnFrontMesh.rotation.x = -Math.PI / 2;
      turnFrontMesh.position.set(0.85, 0.002, 0);
      turnFrontMesh.castShadow = true;
      turnFrontMesh.receiveShadow = true;

      const turnBackMesh = new THREE.Mesh(turnBackGeo, turnBackMat);
      turnBackMesh.rotation.x = -Math.PI / 2;
      turnBackMesh.position.set(0.85, 0.001, 0);
      turnBackMesh.castShadow = true;
      turnBackMesh.receiveShadow = true;

      turnPivot.add(turnFrontMesh, turnBackMesh);
      turnPivot.visible = false;

      // Pre-render & cache page textures per study.
      const pageCache = new Map<string, [THREE.Texture, THREE.Texture]>();
      const getPages = (study: ResearchEntry): [THREE.Texture, THREE.Texture] => {
        const cached = pageCache.get(study.id);
        if (cached) return cached;
        const pair: [THREE.Texture, THREE.Texture] = [
          manuscriptTexture(study, "abstract", headingFont, bodyFont),
          manuscriptTexture(study, "methods", headingFont, bodyFont),
        ];
        pageCache.set(study.id, pair);
        return pair;
      };
      latest.current.studies.forEach(getPages);

      const motion = matchMedia("(prefers-reduced-motion: reduce)");
      const calm = () => motion.matches || document.documentElement.dataset.labFx === "calm";

      let currentProgress = targetProgressRef.current;
      let pointerX = 0;
      let pointerY = 0;
      let smoothPointerX = 0;
      let smoothPointerY = 0;
      let frame = 0;
      let visible = true;
      let contextLost = false;
      let lastTime = performance.now();
      let lastCoverAngle = -1;
      let lastFlipAngle = -1;

      const applyState = (p: number) => {
        const list = latest.current.studies;
        const count = list.length;

        // 0.00 -> 0.14: cover opens. 0.90 -> 1.00: cover gently closes.
        const openEase = smoothstep(0.01, 0.14, p);
        const closeEase = smoothstep(0.90, 0.99, p);
        const openAmount = openEase * (1 - closeEase);
        const coverAngle = openAmount * Math.PI;

        coverPivot.rotation.z = coverAngle;
        // Drop the cover pivot as it opens so the open front cover sits flat at y = 0.026 beneath leftStack.
        coverPivot.position.y = THREE.MathUtils.lerp(0.188, 0.026, Math.sin(coverAngle * 0.5));

        const isOpened = coverAngle > Math.PI * 0.52;
        leftStack.visible = isOpened;
        leftPage.visible = isOpened;

        // Center closed book at x = 0; center open spread spine at x = 0.
        book.position.x = THREE.MathUtils.lerp(-0.88, 0, openEase) + THREE.MathUtils.lerp(0, -0.88, closeEase);
        book.rotation.y =
          THREE.MathUtils.lerp(-0.22, 0, openEase) +
          THREE.MathUtils.lerp(0, 0.18, closeEase) +
          smoothPointerX * 0.04;
        book.rotation.x = smoothPointerY * 0.03;

        // Map middle scroll (0.14 -> 0.90) across studies with generous flip window.
        const readingT = THREE.MathUtils.clamp((p - 0.14) / (0.90 - 0.14), 0, 1);
        const scaled = readingT * Math.max(1, count);
        const baseIndex = Math.min(count - 1, Math.floor(scaled));
        const local = scaled - baseIndex;

        const flipStart = 0.60;
        const canFlip = baseIndex < count - 1 && isOpened && !calm();
        const flipT = canFlip && local > flipStart ? smoothstep(flipStart, 1, local) : 0;

        if (flipT > 0.001 && flipT < 0.999) {
          const [curLeft, curRight] = getPages(list[baseIndex]);
          const [nextLeft, nextRight] = getPages(list[baseIndex + 1]);
          if (leftPageMat.map !== curLeft) { leftPageMat.map = curLeft; leftPageMat.needsUpdate = true; }
          if (rightPageMat.map !== nextRight) { rightPageMat.map = nextRight; rightPageMat.needsUpdate = true; }
          if (turnFrontMat.map !== curRight) { turnFrontMat.map = curRight; turnFrontMat.needsUpdate = true; }
          if (turnBackMat.map !== nextLeft) { turnBackMat.map = nextLeft; turnBackMat.needsUpdate = true; }

          const flipAngle = flipT * Math.PI;
          turnPivot.visible = true;
          turnPivot.rotation.z = flipAngle;
          deformTurnPage(turnFrontGeo, baseTurnPositions, flipAngle, pageWidth);
          deformTurnPage(turnBackGeo, baseTurnPositions, flipAngle, pageWidth);
          if (Math.abs(flipAngle - lastFlipAngle) > 0.03) {
            renderer.shadowMap.needsUpdate = true;
            lastFlipAngle = flipAngle;
          }
        } else {
          turnPivot.visible = false;
          const activeIdx = flipT >= 0.999 ? Math.min(count - 1, baseIndex + 1) : baseIndex;
          const [pLeft, pRight] = getPages(list[activeIdx]);
          if (leftPageMat.map !== pLeft) { leftPageMat.map = pLeft; leftPageMat.needsUpdate = true; }
          if (rightPageMat.map !== pRight) { rightPageMat.map = pRight; rightPageMat.needsUpdate = true; }
          if (lastFlipAngle !== -1) {
            renderer.shadowMap.needsUpdate = true;
            lastFlipAngle = -1;
          }
        }

        if (Math.abs(coverAngle - lastCoverAngle) > 0.03) {
          renderer.shadowMap.needsUpdate = true;
          lastCoverAngle = coverAngle;
        }

        // Frame the entire book with generous breathing room above (heading, even at 90° page flip) and below (HUD).
        const narrow = host.clientWidth < 768;
        const baseY = narrow ? 6.4 : 5.4;
        const baseZ = narrow ? 5.6 : 4.85;
        camera.position.set(
          smoothPointerX * 0.12,
          THREE.MathUtils.lerp(baseY + 0.3, baseY, openAmount),
          THREE.MathUtils.lerp(baseZ + 0.4, baseZ, openAmount),
        );
        camera.lookAt(0, 0.15, 0.0);
      };

      const draw = (now: number) => {
        frame = 0;
        if (contextLost || disposed) return;
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;

        const targetP = targetProgressRef.current;
        const ease = calm() ? 1 : 1 - Math.exp(-dt * 18);
        currentProgress += (targetP - currentProgress) * ease;
        if (Math.abs(targetP - currentProgress) < 0.0004) currentProgress = targetP;

        const ptrEase = calm() ? 1 : 1 - Math.exp(-dt * 10);
        smoothPointerX += (pointerX - smoothPointerX) * ptrEase;
        smoothPointerY += (pointerY - smoothPointerY) * ptrEase;
        if (Math.abs(pointerX - smoothPointerX) < 0.0005) smoothPointerX = pointerX;
        if (Math.abs(pointerY - smoothPointerY) < 0.0005) smoothPointerY = pointerY;

        applyState(currentProgress);
        renderer.render(scene, camera);

        const settling =
          Math.abs(targetP - currentProgress) > 0.0005 ||
          Math.abs(pointerX - smoothPointerX) > 0.0008 ||
          Math.abs(pointerY - smoothPointerY) > 0.0008;

        if (visible && !document.hidden && settling) {
          frame = requestAnimationFrame(draw);
        }
      };

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
        renderer.setSize(host.clientWidth, host.clientHeight);
        applyState(currentProgress);
        renderer.render(scene, camera);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      });
      observer.observe(host);

      const onPointerMove = (e: PointerEvent) => {
        if (calm() || e.pointerType === "touch") return;
        const rect = host.getBoundingClientRect();
        pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
        wake();
      };
      const onPointerLeave = () => {
        pointerX = 0;
        pointerY = 0;
        wake();
      };
      const onClick = () => {
        const list = latest.current.studies;
        const readingT = THREE.MathUtils.clamp((currentProgress - 0.14) / (0.90 - 0.14), 0, 0.999);
        const idx = Math.min(list.length - 1, Math.floor(readingT * list.length));
        latest.current.onRead(idx);
      };

      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave);
      host.addEventListener("click", onClick);
      document.addEventListener("visibilitychange", wake);
      motion.addEventListener("change", wake);
      window.addEventListener("lab:preferences", wake);

      const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; };
      const onContextRestored = () => { contextLost = false; wake(); };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

      resize();
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      latest.current.onReady();

      disposeScene = () => {
        cancelAnimationFrame(frame);
        wakeRef.current = null;
        observer.disconnect();
        resizeObserver.disconnect();
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
        host.removeEventListener("click", onClick);
        document.removeEventListener("visibilitychange", wake);
        motion.removeEventListener("change", wake);
        window.removeEventListener("lab:preferences", wake);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

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
        pageCache.forEach(([a, b]) => { a.dispose(); b.dispose(); });
        pageCache.clear();
        coverMat.map?.dispose();
        paperEdgeTex?.dispose();
        key.shadow.map?.dispose();
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
