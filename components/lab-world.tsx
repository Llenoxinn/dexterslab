"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createBigLab } from "@/lib/world/big-lab";
import { SHOTS, shotPose, windowProgress, type Pose, type ShotId } from "@/lib/world/shots";
import { createGovernor } from "@/lib/render-quality";

const HAZE = 0x0b1a58;

/**
 * The big lab, drawn once behind the whole page. Every element marked `data-world-shot` is a window
 * onto it (the hero, and the gaps between sections); scrolling through a window moves the camera
 * along that window's shot. While only paper is on screen nothing is drawn at all.
 */
export function LabWorld() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      host.dataset.webgl = "off";
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The room is static, so the shadow map is drawn once per shot, not once per frame.
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(HAZE);
    host.append(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HAZE, 0.0072);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 420);

    const lab = createBigLab();
    scene.add(lab.group);

    scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x0a1040, 1.15));
    const key = new THREE.DirectionalLight(0xfff0d2, 2.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -34;
    key.shadow.camera.right = key.shadow.camera.top = 34;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 150;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.06;
    scene.add(key, key.target);
    // Two practical lights travel with the shot: a warm lamp over the station and a cool screen glow.
    const lamp = new THREE.PointLight(0xffd27a, 120, 60, 1.6);
    const glow = new THREE.PointLight(0x74e0e8, 160, 70, 1.6);
    scene.add(lamp, glow);

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const calm = () => reducedMotion.matches || document.documentElement.dataset.labFx === "calm";

    const windows = [...document.querySelectorAll<HTMLElement>("[data-world-shot]")];
    const visible = new Set<HTMLElement>();
    let active: ShotId | null = null;
    const want: Pose = { pos: [0, 0, 0], look: [0, 0, 0] };
    const position = new THREE.Vector3();
    const look = new THREE.Vector3();
    const wantPosition = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    let pointerX = 0;
    let pointerY = 0;
    let swayX = 0;
    let swayY = 0;

    const frameShot = (id: ShotId) => {
      const [x, y, z] = SHOTS[id].focus;
      key.target.position.set(x, y, z);
      key.position.set(x + 20, y + 46, z + 26);
      lamp.position.set(x, 9, z + 3);
      glow.position.set(x * 0.4, 6, z - 16);
      key.target.updateMatrixWorld();
      renderer.shadowMap.needsUpdate = true;
    };

    /** Which window is on screen, and how far through it the reader has scrolled. */
    const readScroll = () => {
      const viewport = innerHeight;
      let best: HTMLElement | null = null;
      let bestArea = 0;
      for (const el of visible) {
        const rect = el.getBoundingClientRect();
        const area = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
        if (area > bestArea) {
          bestArea = area;
          best = el;
        }
      }
      if (!best) return false;
      const id = best.dataset.worldShot as ShotId;
      const rect = best.getBoundingClientRect();
      // The hero is pinned while the first sheet slides over it, so its own position never changes.
      const p = calm() ? 0.55 : id === "console" ? Math.min(1, scrollY / Math.max(1, viewport)) : windowProgress(rect.top, rect.height, viewport);
      shotPose(id, p, want);
      wantPosition.set(...want.pos);
      wantLook.set(...want.look);
      if (id !== active) {
        // A new window means a cut (the sheet between two windows hides it), so there is nothing to ease from.
        active = id;
        position.copy(wantPosition);
        look.copy(wantLook);
        frameShot(id);
      }
      return true;
    };

    const tiers = [Math.min(devicePixelRatio || 1, 1.5), 1, 0.75].filter((ratio, i, all) => all.indexOf(ratio) === i);
    const governor = createGovernor(tiers.length);
    let tier = -1;
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(tiers[Math.max(0, tier)]);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Tall screens get a wider lens so the stations are not cropped to a sliver.
      camera.fov = camera.aspect < 1 ? 64 : 46;
      camera.updateProjectionMatrix();
    };
    const useTier = (next: number) => {
      if (next === tier) return;
      tier = next;
      resize();
    };
    useTier(0);

    let raf = 0;
    let last = 0;
    let time = 0;
    let ready = false;
    const frame = (now: number) => {
      raf = 0;
      if (document.hidden || !readScroll()) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      if (last) useTier(governor.sample(now - last));
      last = now;
      const still = calm();
      if (!still) time += dt;
      const ease = still ? 1 : 1 - Math.exp(-dt * 5.5);
      position.lerp(wantPosition, ease);
      look.lerp(wantLook, ease);
      swayX += (pointerX - swayX) * (still ? 0 : 1 - Math.exp(-dt * 3));
      swayY += (pointerY - swayY) * (still ? 0 : 1 - Math.exp(-dt * 3));
      camera.position.set(position.x + swayX * 0.7, position.y + swayY * 0.35, position.z);
      camera.lookAt(look);
      lab.update(time, still ? 0 : dt);
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        host.dataset.ready = "";
      }
      if (!still) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible.size && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      host.dataset.idle = visible.size ? "false" : "true";
      wake();
    }, { rootMargin: "80px 0px" });
    for (const el of windows) observer.observe(el);

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = (event.clientX / innerWidth) * 2 - 1;
      pointerY = -((event.clientY / innerHeight) * 2 - 1);
    };
    const onResize = () => {
      resize();
      wake();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      host.dataset.webgl = "off";
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("lab:preferences", wake);
    document.addEventListener("visibilitychange", wake);
    reducedMotion.addEventListener("change", wake);
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("lab:preferences", wake);
      document.removeEventListener("visibilitychange", wake);
      reducedMotion.removeEventListener("change", wake);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      lab.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="lab-world" aria-hidden="true" />;
}
