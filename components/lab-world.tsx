"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createBigLab } from "@/lib/world/big-lab";
import { haloScale } from "@/lib/world/paint";
import type { Rig } from "@/lib/world/rigs";
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
      if (document.documentElement.dataset.intro === "play") {
        document.documentElement.dataset.intro = "done";
        window.dispatchEvent(new Event("lab:intro-done"));
      }
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

    const hemi = new THREE.HemisphereLight(0x8fa8ff, 0x0a1040, 1.15);
    scene.add(hemi);
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

    /** Brings the hall's light up: `lamps` for the room and its screens, `leds` for the indicator lamps. */
    const setLevels = (lamps: number, leds: number) => {
      hemi.intensity = 1.15 * (0.1 + 0.9 * lamps);
      key.intensity = 2.3 * lamps;
      lamp.intensity = 120 * lamps;
      glow.intensity = 160 * (0.15 + 0.85 * lamps);
      lab.setPower(lamps, leds);
    };

    /* The opening, once a session (the head script in layout.tsx decides): the hall is dark but for
       its blinking indicator LEDs, the ceiling lamps stutter on, and the camera rises off the floor
       into the first shot. Scrolling, a key or the Skip button runs it out quickly. */
    const root = document.documentElement;
    const INTRO_END = 5.6;
    let intro = root.dataset.intro === "play" ? 0 : -1;
    let introFast = false;
    const introFrom = { pos: new THREE.Vector3(2.6, 0.9, 16.5), look: new THREE.Vector3(-1, 6.5, -50) };
    const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
    const lampsAt = (t: number) => {
      if (t < 2.2) return 0;
      if (t < 3.4) {
        // A fluorescent strike: on, off, on, catching a little more each time.
        const u = (t - 2.2) / 1.2;
        const on = Math.sin(t * 47) * Math.sin(t * 29 + 1) > 0.1 - u * 0.5 ? 1 : 0.08;
        return on * (0.3 + 0.45 * u);
      }
      return 0.75 + 0.25 * smoother(clamp01((t - 3.4) / 1));
    };
    const ledsAt = (t: number) => smoother(clamp01((t - 0.4) / 1.2));
    const skipIntro = () => {
      if (intro >= 0) introFast = true;
    };
    const finishIntro = () => {
      intro = -1;
      setLevels(1, 1);
      root.dataset.intro = "done";
      try {
        sessionStorage.setItem("lab:intro", "seen");
      } catch {}
      window.dispatchEvent(new Event("lab:intro-done"));
      for (const type of ["wheel", "keydown", "pointerdown", "touchstart"] as const) window.removeEventListener(type, skipIntro);
      window.removeEventListener("lab:intro-skip", skipIntro);
    };
    if (intro >= 0) {
      setLevels(0, 0);
      for (const type of ["wheel", "keydown", "pointerdown", "touchstart"] as const) window.addEventListener(type, skipIntro, { passive: true });
      window.addEventListener("lab:intro-skip", skipIntro);
    }

    /* /dev/dexter opens on the CRT at the left end of the control desk: the camera turns and pushes in
       until the screen fills the view, and the terminal powers on over it. */
    const crtScreen = new THREE.Vector3(-3.63, 1.77, 7.05);
    const crtEye = crtScreen.clone().add(new THREE.Vector3(Math.sin(0.42), 0.02, Math.cos(0.42)).multiplyScalar(2.05));
    let focusTarget = 0;
    let focus = 0;
    const eye = new THREE.Vector3();
    const aim = new THREE.Vector3();
    const onFocus = (event: Event) => {
      focusTarget = (event as CustomEvent<{ target: string | null }>).detail?.target === "crt" ? 1 : 0;
      wake();
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let activeEl: HTMLElement | null = null;
    let hovered: Rig | null = null;
    /** The machine under a screen point, if the point is in the window that shows its shot. */
    const pick = (x: number, y: number) => {
      if (!active) return null;
      const rigs = lab.rigs.filter((rig) => rig.shot === active);
      if (!rigs.length) return null;
      ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(rigs.flatMap((rig) => rig.hits), false)[0];
      return hit ? rigs.find((rig) => rig.hits.includes(hit.object)) ?? null : null;
    };
    const announce = (rig: Rig) => {
      window.dispatchEvent(new CustomEvent("lab:state", { detail: { shot: rig.shot, index: rig.index } }));
    };
    const work = (rig: Rig) => {
      rig.trigger();
      announce(rig);
      wake();
    };

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
      if (best !== activeEl) {
        if (activeEl) activeEl.style.cursor = "";
        activeEl = best;
        hovered = null;
      }
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

    const bufferSize = new THREE.Vector2();
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
      haloScale.value = renderer.getDrawingBufferSize(bufferSize).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
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
      if (intro >= 0) {
        if (!ready) window.dispatchEvent(new Event("lab:intro-start"));
        // Real time, not the clamped frame step: on a slow device the opening keeps its length.
        intro += (last ? Math.min(0.25, (now - last) / 1000) : 0) * (introFast ? 6 : 1);
        setLevels(lampsAt(intro), Math.max(ledsAt(intro), introFast ? 1 : 0));
        // The copy arrives as the lamps settle, before the camera has quite come to rest.
        if (intro > 4.2 && root.dataset.intro === "play") root.dataset.intro = "reveal";
        if (intro >= INTRO_END) finishIntro();
      }
      if (last) useTier(governor.sample(now - last));
      last = now;
      const still = calm();
      if (!still) time += dt;
      const ease = still ? 1 : 1 - Math.exp(-dt * 5.5);
      position.lerp(wantPosition, ease);
      look.lerp(wantLook, ease);
      swayX += (pointerX - swayX) * (still ? 0 : 1 - Math.exp(-dt * 3));
      swayY += (pointerY - swayY) * (still ? 0 : 1 - Math.exp(-dt * 3));
      eye.set(position.x + swayX * 0.7, position.y + swayY * 0.35, position.z);
      aim.copy(look);
      if (intro >= 0 && active === "console") {
        const c = smoother(clamp01((intro - 0.3) / (INTRO_END - 0.6)));
        eye.lerpVectors(introFrom.pos, eye, c);
        aim.lerpVectors(introFrom.look, aim, c);
      }
      focus = still ? focusTarget : focusTarget > focus ? Math.min(focusTarget, focus + dt / 0.95) : Math.max(focusTarget, focus - dt / 0.7);
      if (focus > 0 && active === "console") {
        const k = smoother(focus);
        eye.lerp(crtEye, k);
        aim.lerp(crtScreen, k);
      }
      camera.position.copy(eye);
      camera.lookAt(aim);
      lab.update(time, dt, still);
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        host.dataset.ready = "";
      }
      if (!still || intro >= 0) raf = requestAnimationFrame(frame);
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

    const interactive = "a, button, input, textarea, select, label, summary, [role='button'], dialog";
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = (event.clientX / innerWidth) * 2 - 1;
      pointerY = -((event.clientY / innerHeight) * 2 - 1);
      const target = event.target as Element | null;
      const over = target && !target.closest(interactive) && activeEl?.contains(target) ? pick(event.clientX, event.clientY) : null;
      if (over !== hovered) {
        hovered = over;
        if (activeEl) activeEl.style.cursor = over ? "pointer" : "";
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || target.closest(interactive) || !activeEl?.contains(target)) return;
      const rig = pick(event.clientX, event.clientY);
      if (rig) work(rig);
    };
    const onAct = (event: Event) => {
      const shot = (event as CustomEvent<{ shot: ShotId }>).detail?.shot;
      const rig = lab.rigs.find((item) => item.shot === shot);
      if (rig) work(rig);
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
    window.addEventListener("click", onClick);
    window.addEventListener("lab:act", onAct);
    window.addEventListener("lab:focus", onFocus);
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
      window.removeEventListener("click", onClick);
      window.removeEventListener("lab:act", onAct);
      window.removeEventListener("lab:focus", onFocus);
      // Leave the opening armed: a remount (React's dev double-mount included) plays it from the start.
      for (const type of ["wheel", "keydown", "pointerdown", "touchstart"] as const) window.removeEventListener(type, skipIntro);
      window.removeEventListener("lab:intro-skip", skipIntro);
      if (activeEl) activeEl.style.cursor = "";
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
