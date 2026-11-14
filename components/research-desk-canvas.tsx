"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ResearchEntry } from "@/lib/content";
import { site } from "@/lib/site";

export type ResearchDeskApi = {
  reset: () => void;
  zoom: (direction: number) => void;
  rotate: (direction: number) => void;
};

type Props = {
  study: ResearchEntry;
  open: boolean;
  api: RefObject<ResearchDeskApi | null>;
  onOpen: () => void;
  onRead: () => void;
  onReady: () => void;
  onUnsupported: () => void;
};

const ABSTRACT_PLACEHOLDER = "Abstract to be provided. This space is reserved for the research question, methodology, principal findings, and conclusions.";
const JOURNAL_TITLE = "Computational & Experimental Biology";

/** Typeset real manuscript content into a physical page, rather than a screenshot mockup. */
function manuscriptTexture(study: ResearchEntry, page: "abstract" | "methods" | "cover", font: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 2176;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The manuscript could not be drawn.");
  const width = canvas.width;
  const margin = 138;
  let y = 130;
  const ink = page === "cover" ? "#eff2f8" : "#1e293c";
  ctx.fillStyle = page === "cover" ? "#17304f" : "#f8f9fc";
  ctx.fillRect(0, 0, width, canvas.height);
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
    if (line) { ctx.fillText(line, margin, y); y += size * 1.48; }
    y += gap;
  };
  const rule = () => {
    ctx.strokeStyle = page === "cover" ? "#71839b" : "#b4becd";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke(); y += 70;
  };

  if (page === "cover") {
    y = 210;
    text("RESEARCH STUDIES", 35, 600, "#b6c4d7", 45);
    rule();
    y = 700;
    text(JOURNAL_TITLE, 112, 600, ink, 100);
    text(site.name, 52, 400, ink, 25);
    text("University of the Philippines Cebu", 41, 400, "#c9d2df");
    y = 1940;
    text("dexterslab", 40, 400, "#b6c4d7");
  } else {
    text(page === "abstract" ? "SCIENTIFIC & COMPUTATIONAL RESEARCH" : "OVERVIEW & METHODS", 27, 600, "#65738a", 0);
    rule();
    if (page === "abstract") {
      text(study.title, study.title.length > 200 ? 54 : 68, 600, ink, 42);
      text(site.name, 42, 600, ink, 8);
      text("University of the Philippines Cebu", 35, 400, "#596b82", 78);
      text("Abstract", 58, 600, ink, 12);
      text("[Placeholder abstract]", 37, 400, "#6a788d", 16);
      text(ABSTRACT_PLACEHOLDER, 45, 400, "#65738a", 66);
      text("Keywords", 44, 600, ink, 14);
      text(study.tags.join("; "), 38, 400, "#596b82");
    } else {
      text("Study overview", 61, 600, ink, 22);
      text(study.summary, 44, 400, ink, 58);
      for (const highlight of study.highlights) {
        text(highlight.heading, 47, 600, ink, 16);
        text(highlight.detail, 43, 400, ink, 54);
      }
    }
    y = 2055;
    rule();
    ctx.font = `30px ${font}`;
    ctx.fillStyle = "#65738a";
    ctx.fillText(study.shortName, margin, 2110);
    ctx.textAlign = "right";
    ctx.fillText(page === "abstract" ? "1" : "2", width - margin, 2110);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function ResearchDeskCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let disposeScene = () => {};

    const start = async () => {
      const family = getComputedStyle(host).getPropertyValue("--font-research").trim() || "Cambria, Georgia, serif";
      try { await Promise.all([document.fonts.load(`400 32px ${family}`), document.fonts.load(`600 32px ${family}`)]); } catch {}
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "default" }); }
      catch { latest.current.onUnsupported(); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-label", "3D research journal on a laboratory desk");
      renderer.domElement.style.imageRendering = "auto";
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x172940);
      scene.fog = new THREE.Fog(0x172940, 15, 34);
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.enableZoom = false;
      controls.enablePan = true;
      controls.minDistance = 3.2;
      controls.maxDistance = 15;
      controls.maxPolarAngle = Math.PI * 0.82;
      const coarse = matchMedia("(pointer: coarse)").matches;
      if (coarse) { controls.enableRotate = false; controls.enablePan = false; renderer.domElement.style.touchAction = "pan-y"; }
      const reset = () => {
        const narrow = host.clientWidth < 768;
        camera.position.set(narrow ? 0 : 0.3, narrow ? 7.8 : 6.4, narrow ? 8.6 : 6.6);
        controls.target.set(0, 0.85, 0.15);
        controls.update();
      };
      reset();
      scene.add(new THREE.HemisphereLight(0xe4ecfc, 0x233249, 2.4));
      const key = new THREE.DirectionalLight(0xffe3bf, 3.4);
      key.position.set(-3, 7, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -5; key.shadow.camera.right = 5;
      key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
      key.shadow.normalBias = 0.025;
      scene.add(key);
      const fill = new THREE.PointLight(0x91b7eb, 16, 12); fill.position.set(4, 4, -2); scene.add(fill);
      const warm = new THREE.PointLight(0xffc686, 10, 7); warm.position.set(-2.6, 2.6, -1.2); scene.add(warm);

      const material = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
      const navy = material(0x17304f);
      const metal = material(0x9daebf, { metalness: 0.55, roughness: 0.3 });
      const ivory = material(0xe3e8ed);
      const paper = material(0xf3f4f7);
      const dark = material(0x172940);
      const amber = material(0xffd4a0, { emissive: 0xffc77b, emissiveIntensity: 0.7 });
      const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      };
      const box = (parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) =>
        add(parent, new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.15), mat, x, y, z);
      const cylinder = (parent: THREE.Object3D, mat: THREE.Material, radius: number, height: number, x: number, y: number, z: number) =>
        add(parent, new THREE.CylinderGeometry(radius, radius, height, 28), mat, x, y, z);
      box(scene, ivory, 7.7, 0.19, 4.9, 0, 0.8, 0);
      box(scene, navy, 7.4, 0.18, 4.65, 0, 0.62, 0);
      for (const x of [-3.3, 3.3]) for (const z of [-1.9, 1.9]) box(scene, metal, 0.13, 3, 0.13, x, -0.9, z);
      box(scene, material(0x20354b), 40, 0.12, 40, 0, -2.45, 0);
      box(scene, material(0x203750), 24, 14, 0.15, 0, 3.6, -5);

      // An evening window and a warm task lamp give the desk the hero's material depth.
      const windowGroup = new THREE.Group(); windowGroup.position.set(0.5, 3.2, -4.86); scene.add(windowGroup);
      box(windowGroup, material(0x10223c), 4.3, 2.5, 0.04, 0, 0, 0);
      for (const x of [-2.22, 0, 2.22]) box(windowGroup, ivory, 0.08, 2.7, 0.12, x, 0, 0.07);
      for (const y of [-1.31, 0, 1.31]) box(windowGroup, ivory, 4.5, 0.08, 0.12, 0, y, 0.07);
      add(windowGroup, new THREE.SphereGeometry(0.22, 20, 12), amber, 1.25, 0.7, 0.04);
      for (let i = 0; i < 18; i++) add(windowGroup, new THREE.SphereGeometry(0.012, 6, 4), paper, Math.sin(i * 7.1) * 1.95, Math.cos(i * 3.8) * 1.12, 0.04);
      cylinder(scene, navy, 0.32, 0.07, -2.7, 0.95, -1.2);
      cylinder(scene, metal, 0.025, 1.55, -2.7, 1.75, -1.2);
      const lamp = add(scene, new THREE.ConeGeometry(0.36, 0.38, 36, 1, true), navy, -2.7, 2.58, -1.1);
      lamp.rotation.z = -0.2;
      cylinder(scene, amber, 0.23, 0.025, -2.67, 2.4, -1.1);
      const pen = cylinder(scene, navy, 0.035, 1.4, 2.5, 0.97, 0.3); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.15;
      const penCap = cylinder(scene, metal, 0.04, 0.25, 3.08, 0.97, 0.21); penCap.rotation.z = Math.PI / 2;
      cylinder(scene, paper, 0.19, 0.36, 2.6, 1.09, -1.45);
      cylinder(scene, material(0x4c3328), 0.153, 0.01, 2.6, 1.275, -1.45);
      const mugHandle = add(scene, new THREE.TorusGeometry(0.13, 0.035, 10, 28), paper, 2.83, 1.1, -1.45); mugHandle.rotation.y = Math.PI / 2;

      const book = new THREE.Group(); book.name = "research-journal"; book.position.set(0, 0.94, 0.25); scene.add(book);
      const pageWidth = 1.7; const pageHeight = 2.42;
      const binding = box(book, navy, 3.58, 0.075, 2.58, 0, 0, 0);
      const leftStack = box(book, paper, 1.7, 0.12, 2.42, -0.86, 0.085, 0);
      box(book, paper, 1.7, 0.12, 2.42, 0.86, 0.085, 0);
      const seam = cylinder(book, navy, 0.055, 2.49, 0, 0.09, 0); seam.rotation.x = Math.PI / 2;
      const abstractMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
      const methodsMat = abstractMat.clone();
      const leftPage = add(book, new THREE.PlaneGeometry(pageWidth, pageHeight), abstractMat, -0.86, 0.151, 0); leftPage.rotation.x = -Math.PI / 2;
      const rightPage = add(book, new THREE.PlaneGeometry(pageWidth, pageHeight), methodsMat, 0.86, 0.151, 0); rightPage.rotation.x = -Math.PI / 2;
      leftPage.castShadow = false; rightPage.castShadow = false;
      const coverPivot = new THREE.Group(); coverPivot.position.set(0, 0.17, 0); book.add(coverPivot);
      box(coverPivot, navy, 1.79, 0.055, 2.58, 0.895, 0, 0);
      const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
      const coverFace = add(coverPivot, new THREE.PlaneGeometry(1.77, 2.55), coverMat, 0.895, 0.029, 0); coverFace.rotation.x = -Math.PI / 2;
      coverMat.map = manuscriptTexture(latest.current.study, "cover", family);
      const bookmark = box(book, material(0xa94852), 0.11, 0.012, 0.43, 1.18, 0.12, 1.32); bookmark.castShadow = false;
      const turnPivot = new THREE.Group(); turnPivot.position.set(0, 0.17, 0); book.add(turnPivot);
      const turnMat = methodsMat.clone();
      const turnPage = add(turnPivot, new THREE.PlaneGeometry(pageWidth, pageHeight), turnMat, 0.86, 0.009, 0); turnPage.rotation.x = -Math.PI / 2; turnPage.castShadow = false;
      turnPivot.visible = false;

      const motion = matchMedia("(prefers-reduced-motion: reduce)");
      const calm = () => motion.matches || document.documentElement.dataset.labFx === "calm";
      let lastStudy = "";
      let coverAngle = latest.current.open ? Math.PI : 0;
      let turnStarted = -1000;
      let textures: THREE.Texture[] = [];
      const refresh = () => {
        const current = latest.current;
        controls.enableDamping = !calm();
        binding.scale.x = current.open ? 1 : 0.5;
        binding.position.x = current.open ? 0 : 0.895;
        leftStack.visible = leftPage.visible = current.open;
        if (current.study.id !== lastStudy) {
          const oldRight = methodsMat.map;
          const nextTextures = [manuscriptTexture(current.study, "abstract", family), manuscriptTexture(current.study, "methods", family)];
          abstractMat.map = nextTextures[0]; methodsMat.map = nextTextures[1];
          abstractMat.needsUpdate = methodsMat.needsUpdate = true;
          if (lastStudy && !calm()) {
            turnMat.map?.dispose(); turnMat.map = oldRight?.clone() ?? nextTextures[1].clone(); turnMat.needsUpdate = true;
            turnStarted = performance.now();
          }
          textures.forEach((texture) => texture.dispose()); textures = nextTextures;
          lastStudy = current.study.id;
        }
        if (calm()) coverAngle = current.open ? Math.PI : 0;
        wake();
      };
      syncRef.current = refresh;

      let frame = 0; let visible = true; let lastTime = performance.now(); let contextLost = false;
      const draw = (now: number) => {
        frame = 0;
        if (contextLost || disposed) return;
        const dt = Math.min(0.08, (now - lastTime) / 1000); lastTime = now;
        const targetAngle = latest.current.open ? Math.PI : 0;
        coverAngle += (targetAngle - coverAngle) * (calm() ? 1 : 1 - Math.exp(-dt * 9));
        coverPivot.rotation.z = coverAngle;
        const turn = (now - turnStarted) / 650;
        turnPivot.visible = !calm() && turn >= 0 && turn < 1;
        turnPivot.rotation.z = Math.PI * Math.max(0, Math.min(1, turn));
        controls.update();
        renderer.render(scene, camera);
        if (visible && !document.hidden && (!calm() || Math.abs(coverAngle - targetAngle) > 0.001)) frame = requestAnimationFrame(draw);
      };
      const wake = () => { if (!frame && visible && !document.hidden && !contextLost && !disposed) { lastTime = performance.now(); frame = requestAnimationFrame(draw); } };
      const resize = () => { camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); wake(); };
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }); observer.observe(host);
      controls.addEventListener("change", wake);
      document.addEventListener("visibilitychange", wake);
      motion.addEventListener("change", refresh);
      window.addEventListener("lab:preferences", refresh);

      const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -book.position.y);
      const intersection = new THREE.Vector3();
      let drag: { id: number; x: number; y: number; offset: THREE.Vector3; moved: number } | null = null;
      const ray = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect();
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
      };
      const down = (event: PointerEvent) => {
        if (coarse || event.button !== 0 || drag) return;
        ray(event);
        if (!raycaster.intersectObject(book, true).length || !raycaster.ray.intersectPlane(plane, intersection)) return;
        event.stopImmediatePropagation();
        controls.enabled = false;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: intersection.clone().sub(book.position), moved: 0 };
        host.setPointerCapture(event.pointerId);
        host.style.cursor = "grabbing";
      };
      const move = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        ray(event);
        drag.moved = Math.max(drag.moved, Math.hypot(event.clientX - drag.x, event.clientY - drag.y));
        if (drag.moved < 5 || !raycaster.ray.intersectPlane(plane, intersection)) return;
        book.position.x = THREE.MathUtils.clamp(intersection.x - drag.offset.x, -1.7, 1.7);
        book.position.z = THREE.MathUtils.clamp(intersection.z - drag.offset.z, -0.85, 1.05);
        wake();
      };
      const up = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        if (event.type !== "pointercancel" && drag.moved < 5) { if (latest.current.open) latest.current.onRead(); else latest.current.onOpen(); }
        drag = null; controls.enabled = true; host.style.cursor = "grab";
        if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
        wake();
      };
      host.style.cursor = "grab";
      host.addEventListener("pointerdown", down, true);
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerup", up);
      host.addEventListener("pointercancel", up);
      const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; };
      const onContextRestored = () => { contextLost = false; wake(); };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);
      props.api.current = {
        reset: () => { book.position.set(0, 0.94, 0.25); reset(); wake(); },
        zoom: (direction) => { const offset = camera.position.clone().sub(controls.target).multiplyScalar(direction > 0 ? 0.82 : 1.22); if (offset.length() >= 3.2 && offset.length() <= 15) camera.position.copy(controls.target).add(offset); controls.update(); wake(); },
        rotate: (direction) => { const offset = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 8); camera.position.copy(controls.target).add(offset); controls.update(); wake(); },
      };
      refresh();
      renderer.render(scene, camera);
      latest.current.onReady();
      disposeScene = () => {
        cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); controls.dispose(); syncRef.current = null; props.api.current = null;
        document.removeEventListener("visibilitychange", wake); motion.removeEventListener("change", refresh); window.removeEventListener("lab:preferences", refresh);
        host.removeEventListener("pointerdown", down, true); host.removeEventListener("pointermove", move); host.removeEventListener("pointerup", up); host.removeEventListener("pointercancel", up);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost); renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
        const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
        scene.traverse((object) => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => materials.add(mat)); } });
        geometries.forEach((geometry) => geometry.dispose()); materials.forEach((mat) => mat.dispose());
        textures.forEach((texture) => texture.dispose()); coverMat.map?.dispose(); turnMat.map?.dispose(); key.shadow.map?.dispose();
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      };
    };
    void start().catch(() => { if (!disposed) latest.current.onUnsupported(); });
    return () => { disposed = true; disposeScene(); };
  }, []);

  useEffect(() => { syncRef.current?.(); }, [props.study, props.open]);
  return <div ref={hostRef} className="research-desk-canvas" />;
}
