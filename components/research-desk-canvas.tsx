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

/** Typeset real manuscript content into a physical page, rather than a screenshot mockup. */
function manuscriptTexture(study: ResearchEntry, page: "abstract" | "methods" | "cover", font: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1450;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The manuscript could not be drawn.");
  const width = canvas.width;
  const height = canvas.height;
  const margin = 92;
  let y = 88;
  const ink = page === "cover" ? "#f4e7c8" : "#1d283a";
  ctx.fillStyle = page === "cover" ? "#162b47" : "#f8f6f0";
  ctx.fillRect(0, 0, width, height);

  if (page === "cover") {
    // Subtle gold foil double border on the hardcover.
    ctx.strokeStyle = "#c9a861";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.strokeStyle = "rgba(201, 168, 97, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, width - 128, height - 128);
  } else {
    // Subtle inner gutter shading for book-page depth.
    const gutter = ctx.createLinearGradient(
      page === "abstract" ? width - 90 : 0,
      0,
      page === "abstract" ? width : 90,
      0,
    );
    if (page === "abstract") {
      gutter.addColorStop(0, "rgba(23, 41, 64, 0)");
      gutter.addColorStop(1, "rgba(23, 41, 64, 0.08)");
      ctx.fillStyle = gutter;
      ctx.fillRect(width - 90, 0, 90, height);
    } else {
      gutter.addColorStop(0, "rgba(23, 41, 64, 0.08)");
      gutter.addColorStop(1, "rgba(23, 41, 64, 0)");
      ctx.fillStyle = gutter;
      ctx.fillRect(0, 0, 90, height);
    }
  }

  const text = (value: string, size: number, weight = 400, colour = ink, gap = 0) => {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = colour;
    const words = value.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width - margin * 2 && line) {
        ctx.fillText(line, margin, y);
        y += size * 1.48;
        line = word;
      } else line = next;
    }
    if (line) {
      ctx.fillText(line, margin, y);
      y += size * 1.48;
    }
    y += gap;
  };

  const rule = () => {
    ctx.strokeStyle = page === "cover" ? "#c9a861" : "#b8c0cd";
    ctx.lineWidth = page === "cover" ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += 46;
  };

  if (page === "cover") {
    y = 158;
    text("RESEARCH MONOGRAPH", 24, 600, "#d8be82", 30);
    rule();
    y = 460;
    text(JOURNAL_TITLE, 72, 600, "#f5e9cb", 68);
    text(site.name, 34, 400, "#e5edf8", 16);
    text("University of the Philippines Cebu", 27, 400, "#aebfd4");
    y = 1275;
    text("VOL. I · DEXTER'S LAB", 24, 600, "#d8be82");
  } else {
    text(page === "abstract" ? `SCIENTIFIC RESEARCH · ${study.domain.toUpperCase()}` : "METHODS & HIGHLIGHTS", 18, 600, "#5e6d84", 0);
    rule();
    if (page === "abstract") {
      text(study.title, study.title.length > 200 ? 35 : 43, 600, ink, 28);
      text(site.name, 28, 600, ink, 6);
      text("University of the Philippines Cebu", 23, 400, "#56677f", 50);
      text("Study Overview", 36, 600, ink, 14);
      text(study.summary, 30, 400, "#2f3e54", 44);
      text("Modality & Keywords", 28, 600, ink, 10);
      text(`${study.modality} · ${study.tags.join("; ")}`, 25, 400, "#56677f");
    } else {
      for (const highlight of study.highlights) {
        text(highlight.heading, 31, 600, ink, 10);
        text(highlight.detail, 28, 400, "#2f3e54", 38);
      }
    }
    y = 1370;
    rule();
    ctx.font = `20px ${font}`;
    ctx.fillStyle = "#5e6d84";
    ctx.fillText(study.shortName, margin, 1406);
    ctx.textAlign = "right";
    ctx.fillText(page === "abstract" ? "1" : "2", width - margin, 1406);
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
  ctx.fillStyle = "#efeae0";
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? "rgba(95, 105, 122, 0.16)" : "rgba(255, 255, 255, 0.35)";
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
    // Plane is centered at +pageWidth/2 in X; normalize u from 0 (spine) to 1 (outer edge).
    const u = THREE.MathUtils.clamp((bx + pageWidth / 2) / pageWidth, 0, 1);
    // Smooth arch lifting in the middle of the page and trailing slightly at the outer edge.
    const curl = Math.sin(u * Math.PI) * 0.24 * arch + Math.pow(u, 2) * 0.06 * Math.sin(angle * 2);
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
      const family = getComputedStyle(host).getPropertyValue("--font-research").trim() || "Cambria, Georgia, serif";
      try {
        await Promise.all([
          document.fonts.load(`400 32px ${family}`),
          document.fonts.load(`600 32px ${family}`),
        ]);
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
      renderer.toneMappingExposure = 1.14;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-label", "3D scroll-driven research journal");

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x132238);
      scene.fog = new THREE.Fog(0x132238, 10, 22);

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);

      // Warm studio reading-lamp lighting + cool fill.
      scene.add(new THREE.HemisphereLight(0xe4ecfc, 0x19283e, 2.1));
      const key = new THREE.DirectionalLight(0xffe7c7, 3.2);
      key.position.set(-2.4, 6.8, 3.6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -4.2;
      key.shadow.camera.right = 4.2;
      key.shadow.camera.top = 4.2;
      key.shadow.camera.bottom = -4.2;
      key.shadow.normalBias = 0.02;
      scene.add(key);

      const rim = new THREE.PointLight(0x8bb6f2, 14, 14);
      rim.position.set(3.8, 3.6, -2.8);
      scene.add(rim);

      const warmSpot = new THREE.PointLight(0xffcb8c, 8, 9);
      warmSpot.position.set(-2.2, 2.9, 1.4);
      scene.add(warmSpot);

      const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });

      const clothNavy = mat(0x162b47, { roughness: 0.8, metalness: 0.06 });
      const brass = mat(0xd4b26a, { metalness: 0.82, roughness: 0.26 });
      const paperEdgeTex = pageEdgeTexture();
      const paperBlockMat = mat(0xf2eee4, { roughness: 0.88, map: paperEdgeTex ?? undefined });
      const deskMat = mat(0x182b45, { roughness: 0.86, metalness: 0.05 });

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

      // Grounded reading surface.
      const desk = addMesh(scene, new THREE.PlaneGeometry(26, 20), deskMat, 0, 0, 0);
      desk.rotation.x = -Math.PI / 2;
      desk.castShadow = false;

      // Book assembly centered at (0, 0.05, 0).
      const book = new THREE.Group();
      book.position.set(0, 0.05, 0);
      scene.add(book);

      const pageWidth = 1.72;
      const pageHeight = 2.44;

      // Back cover + spine cradle.
      const backBoard = box(book, clothNavy, 1.82, 0.06, 2.58, 0.91, 0, 0);
      // Brass corner protectors on back cover right corners.
      box(book, brass, 0.16, 0.068, 0.16, 1.75, 0, -1.22);
      box(book, brass, 0.16, 0.068, 0.16, 1.75, 0, 1.22);

      // Left cover board (sits under left stack when open).
      const leftUnderBoard = box(book, clothNavy, 1.82, 0.06, 2.58, -0.91, 0, 0);
      box(leftUnderBoard, brass, 0.16, 0.068, 0.16, -0.84, 0, -1.22);
      box(leftUnderBoard, brass, 0.16, 0.068, 0.16, -0.84, 0, 1.22);

      // Rounded spine with raised ribs.
      const spineGroup = new THREE.Group();
      book.add(spineGroup);
      const spineCyl = addMesh(spineGroup, new THREE.CylinderGeometry(0.065, 0.065, 2.58, 20), clothNavy, 0, 0.03, 0);
      spineCyl.rotation.x = Math.PI / 2;
      for (const rz of [-0.95, -0.35, 0.35, 0.95]) {
        const rib = addMesh(spineGroup, new THREE.CylinderGeometry(0.072, 0.072, 0.04, 16), brass, 0, 0.03, rz);
        rib.rotation.x = Math.PI / 2;
      }

      // Left and right paper blocks.
      const leftStack = box(book, paperBlockMat, pageWidth, 0.125, pageHeight, -0.88, 0.088, 0);
      const rightStack = box(book, paperBlockMat, pageWidth, 0.125, pageHeight, 0.88, 0.088, 0);

      // Crimson silk ribbon bookmark.
      const ribbon = box(book, mat(0xa8434e, { roughness: 0.7 }), 0.095, 0.012, 0.42, 0.48, 0.045, 1.34);
      ribbon.castShadow = false;

      // Static left & right reading surfaces.
      const leftPageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.FrontSide });
      const rightPageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.FrontSide });
      const leftPage = addMesh(book, new THREE.PlaneGeometry(pageWidth, pageHeight), leftPageMat, -0.88, 0.153, 0);
      leftPage.rotation.x = -Math.PI / 2;
      leftPage.castShadow = false;
      const rightPage = addMesh(book, new THREE.PlaneGeometry(pageWidth, pageHeight), rightPageMat, 0.88, 0.153, 0);
      rightPage.rotation.x = -Math.PI / 2;
      rightPage.castShadow = false;

      // Front hardcover pivot (hinges at x = 0).
      const coverPivot = new THREE.Group();
      coverPivot.position.set(0, 0.165, 0);
      book.add(coverPivot);
      box(coverPivot, clothNavy, 1.82, 0.058, 2.58, 0.91, 0, 0);
      box(coverPivot, brass, 0.16, 0.066, 0.16, 1.75, 0, -1.22);
      box(coverPivot, brass, 0.16, 0.066, 0.16, 1.75, 0, 1.22);

      const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.08 });
      const coverFace = addMesh(coverPivot, new THREE.PlaneGeometry(1.78, 2.54), coverMat, 0.91, 0.031, 0);
      coverFace.rotation.x = -Math.PI / 2;
      coverMat.map = manuscriptTexture(latest.current.studies[0], "cover", family);

      // Curved 3D turning page pivot.
      const turnPivot = new THREE.Group();
      turnPivot.position.set(0, 0.158, 0);
      book.add(turnPivot);

      const turnFrontGeo = new THREE.PlaneGeometry(pageWidth, pageHeight, 26, 1);
      const turnBackGeo = new THREE.PlaneGeometry(pageWidth, pageHeight, 26, 1);
      // Flip UVs horizontally on the back side so text reads left-to-right when turned onto the left stack.
      const backUv = turnBackGeo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < backUv.count; i++) {
        backUv.setX(i, 1 - backUv.getX(i));
      }
      backUv.needsUpdate = true;
      const baseTurnPositions = new Float32Array((turnFrontGeo.attributes.position as THREE.BufferAttribute).array);

      const turnFrontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.FrontSide });
      const turnBackMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.BackSide });

      const turnFrontMesh = new THREE.Mesh(turnFrontGeo, turnFrontMat);
      turnFrontMesh.rotation.x = -Math.PI / 2;
      turnFrontMesh.position.set(0.88, 0.002, 0);
      turnFrontMesh.castShadow = true;
      turnFrontMesh.receiveShadow = true;

      const turnBackMesh = new THREE.Mesh(turnBackGeo, turnBackMat);
      turnBackMesh.rotation.x = -Math.PI / 2;
      turnBackMesh.position.set(0.88, 0.001, 0);
      turnBackMesh.castShadow = true;
      turnBackMesh.receiveShadow = true;

      turnPivot.add(turnFrontMesh, turnBackMesh);
      turnPivot.visible = false;

      // Cache page textures per study.
      const pageCache = new Map<string, [THREE.Texture, THREE.Texture]>();
      const getPages = (study: ResearchEntry): [THREE.Texture, THREE.Texture] => {
        const cached = pageCache.get(study.id);
        if (cached) return cached;
        const pair: [THREE.Texture, THREE.Texture] = [
          manuscriptTexture(study, "abstract", family),
          manuscriptTexture(study, "methods", family),
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
      let lastShadowProgress = -1;

      const applyState = (p: number) => {
        const list = latest.current.studies;
        const count = list.length;
        // Phase 1 (0.00 -> 0.16): open cover. Phase 3 (0.90 -> 1.00): gently close cover.
        const openEase = smoothstep(0.02, 0.16, p);
        const closeEase = smoothstep(0.90, 0.99, p);
        const openAmount = openEase * (1 - closeEase);
        const coverAngle = openAmount * Math.PI;
        coverPivot.rotation.z = coverAngle;

        // Show left board/stack only once cover begins opening; shift closed book to center.
        const isOpened = coverAngle > 0.12;
        leftUnderBoard.visible = isOpened;
        leftStack.visible = isOpened;
        leftPage.visible = isOpened;
        backBoard.visible = true;

        // Center the book horizontally: when closed, right half is centered at x = 0; when open, spine is at x = 0.
        book.position.x = THREE.MathUtils.lerp(-0.88, 0, openEase) + THREE.MathUtils.lerp(0, -0.88, closeEase);
        book.rotation.y = THREE.MathUtils.lerp(-0.24, 0, openEase) + THREE.MathUtils.lerp(0, 0.16, closeEase) + smoothPointerX * 0.05;
        book.rotation.x = smoothPointerY * 0.035;

        // Map middle scroll (0.16 -> 0.90) across studies and flips.
        const readingT = THREE.MathUtils.clamp((p - 0.16) / (0.90 - 0.16), 0, 1);
        const segments = Math.max(1, count);
        const scaled = readingT * segments;
        const baseIndex = Math.min(count - 1, Math.floor(scaled));
        const local = scaled - baseIndex;

        // Flip happens in the final 34% of each study segment (except the last study).
        const flipStart = 0.66;
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
          if (Math.abs(flipAngle - lastFlipAngle) > 0.02) {
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

        if (Math.abs(coverAngle - lastCoverAngle) > 0.02 || Math.abs(p - lastShadowProgress) > 0.04) {
          renderer.shadowMap.needsUpdate = true;
          lastCoverAngle = coverAngle;
          lastShadowProgress = p;
        }

        // Camera framing: slightly closer when open for crisp readability.
        const narrow = host.clientWidth < 768;
        const baseY = narrow ? 4.9 : 3.95;
        const baseZ = narrow ? 4.35 : 3.15;
        camera.position.set(
          smoothPointerX * 0.14,
          THREE.MathUtils.lerp(baseY + 0.35, baseY, openAmount),
          THREE.MathUtils.lerp(baseZ + 0.55, baseZ, openAmount),
        );
        camera.lookAt(0, 0.08, 0.08);
      };

      const draw = (now: number) => {
        frame = 0;
        if (contextLost || disposed) return;
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;

        const targetP = targetProgressRef.current;
        const ease = calm() ? 1 : 1 - Math.exp(-dt * 12);
        currentProgress += (targetP - currentProgress) * ease;
        if (Math.abs(targetP - currentProgress) < 0.0004) currentProgress = targetP;

        const ptrEase = calm() ? 1 : 1 - Math.exp(-dt * 8);
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
        const readingT = THREE.MathUtils.clamp((currentProgress - 0.16) / (0.90 - 0.16), 0, 0.999);
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
