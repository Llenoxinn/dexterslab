"use client";

import { useEffect, useRef } from "react";
import { ensurePixelBuffers, interludeBus } from "@/lib/interlude-bus";

const BEATS = [
  { lines: ["LET THE", "CODE BEGIN!"], label: "Begin" },
  { lines: ["THE CODING", "HAS BEGUN!"], label: "Build" },
  { lines: ["LET THE CODE", "BE GONE!"], label: "Ship" },
  { lines: ["LET’S CODE", "TOGETHER."], label: "Together" },
] as const;

type Pixel = {
  x: number; y: number; // current, CSS px inside the stage
  sx: number; sy: number; // start of the current flight
  tx: number; ty: number; // home in the current phrase
  vx: number; vy: number;
  delay: number; // seconds into the current flight before this pixel leaves
  row: number;
  curl: number; // which way its arc bends (-1 | 1) and how much
};

const FLY = 0.8; // seconds per pixel flight
const HOLD = 3.2; // seconds a line rests (and can be played with) before the next one forms
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/**
 * The interlude: a long pinned scroll where four lines are built out of the exploded lab's pixels.
 *
 *   01 LET THE CODE BEGIN!  →  02 THE CODING HAS BEGUN!  →  03 LET THE CODE BE GONE!  →  04 LET’S CODE TOGETHER.
 *
 * - First arrival: pixel blocks fly in from every edge and lock into the words left to right; on
 *   the last landing the words flash neon and the page takes a hard, decaying camera shake.
 * - Then it runs on its own clock: every few seconds the same pixels peel off in a sweep and swirl
 *   along curved paths into another line, picked at random, so the text keeps re-organizing
 *   itself for as long as you stay. The section is a long pinned scroll, so there's time to watch.
 * - Idle: the cursor pushes pixels away and they spring home; a refresh scanline passes now and then.
 *
 * One 2D canvas, no WebGL. A real <h2> holds all four lines for screen readers, and with reduced
 * motion the section is a short, static stack of the four lines.
 */
export function LabInterlude() {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = ref.current;
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!section || !canvas || !stage || !ctx) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const calm = () => media.matches || document.documentElement.dataset.labFx === "calm";

    let phrases: Array<Array<{ x: number; y: number; row: number }>> = [];
    let pixels: Pixel[] = [];
    let cell = 6;
    let colors = ["#0a0a5d", "#1313ba"];
    let neon = "#6666fd";
    let width = 0;
    let height = 0;
    let beat = -1; // phrase on screen (or flying in), -1 = nothing yet
    let flightAt = 0; // performance.now() when the current flight began
    let flightEnd = 0; // seconds into the flight when the last pixel lands
    let first = true; // the very first arrival comes in from the edges and lands with the big hit
    let hitDone = true;
    let raf = 0;
    let last = 0;
    let visible = false;
    let armed = false; // the section has reached the trigger line
    const pointer = { x: 0, y: 0, on: false };
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    /** Rasterize each phrase (two centred lines, fitted to the stage) into a sorted grid of homes. */
    const build = () => {
      const rect = stage.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const tokens = getComputedStyle(section);
      const token = (name: string, fallback: string) => tokens.getPropertyValue(name).trim() || fallback;
      colors = [token("--color-ink-deep", colors[0]), token("--color-ink", colors[1])];
      neon = token("--color-neon", neon);
      const probe = section.querySelector<HTMLElement>(".lab-interlude-probe");
      const style = getComputedStyle(probe ?? section);
      const family = style.fontFamily;
      const weight = style.fontWeight;
      const wanted = parseFloat(style.fontSize) || 96;

      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.ceil(width));
      off.height = Math.max(1, Math.ceil(height));
      const o = off.getContext("2d", { willReadFrequently: true })!;
      o.textAlign = "center";
      o.textBaseline = "middle";
      // One size for all four phrases, so the type doesn't jump between beats.
      o.font = `${weight} ${wanted}px ${family}`;
      o.letterSpacing = `${0.005 * wanted}px`;
      const widest = Math.max(...BEATS.flatMap((b) => b.lines.map((l) => o.measureText(l).width)));
      const size = Math.min(wanted, (wanted * width * 0.88) / Math.max(1, widest));
      o.font = `${weight} ${size}px ${family}`;
      // Pixelated letters need a little air, or neighbours merge into one blob.
      o.letterSpacing = `${0.005 * size}px`;
      o.textBaseline = "alphabetic";
      // The grid is locked to the cap height: exactly `rows` cells from cap line to baseline, so
      // every letter is the same number of pixels tall and round letters can't poke out of the band.
      const capH = o.measureText("H").actualBoundingBoxAscent || size * 0.72;
      // ~13 blocks per cap height: fine enough that round letters keep their shape.
      const rows = Math.max(9, Math.round(capH / Math.max(4, size / 18)));
      cell = Math.max(4, Math.round(capH / rows));
      const band = rows * cell;
      const gap = band * 0.42;
      // Optical centre: a hair above the middle.
      const blockTop = Math.round(height * 0.49 - band - gap / 2);

      phrases = BEATS.map((b) => {
        const homes: Array<{ x: number; y: number; row: number }> = [];
        b.lines.forEach((line, r) => {
          o.clearRect(0, 0, off.width, off.height);
          const top = blockTop + r * (band + gap);
          const baseline = top + band;
          o.fillText(line, width / 2, baseline);
          const d = o.getImageData(0, 0, off.width, off.height).data;
          // Coverage, not a single point: a cell lights when most of its 3×3 samples are ink.
          const at = (x: number, y: number) => d[(Math.min(off.height - 1, Math.max(0, Math.floor(y))) * off.width + Math.min(off.width - 1, Math.floor(x))) * 4 + 3] > 128;
          for (let py = top; py < baseline; py += cell) {
            for (let px = 0; px < off.width; px += cell) {
              let ink = 0;
              for (let sy = 1; sy <= 3; sy++) for (let sx = 1; sx <= 3; sx++) if (at(px + (sx * cell) / 4, py + (sy * cell) / 4)) ink++;
              if (ink >= 5) homes.push({ x: px, y: py, row: r });
            }
          }
        });
        // Left to right, then top to bottom: pixel i of one phrase maps to the same reading
        // position in the next, so the words flow into each other instead of shuffling.
        return homes.sort((a, b2) => a.x - b2.x || a.y - b2.y);
      });

      const pool = Math.max(...phrases.map((p) => p.length));
      while (pixels.length < pool) {
        pixels.push({ x: -999, y: -999, sx: 0, sy: 0, tx: 0, ty: 0, vx: 0, vy: 0, delay: 0, row: 0, curl: rand() < 0.5 ? -1 : 1 });
      }
      pixels.length = pool;
      if (beat >= 0) settle(beat); // a resize snaps everything to the new layout
    };

    const home = (p: Pixel, i: number, b: number) => {
      const list = phrases[b];
      const h = list[Math.floor((i * list.length) / pixels.length)];
      p.tx = h.x;
      p.ty = h.y;
      p.row = h.row;
    };
    const settle = (b: number) => {
      pixels.forEach((p, i) => {
        home(p, i, b);
        p.x = p.sx = p.tx;
        p.y = p.sy = p.ty;
        p.vx = p.vy = 0;
        p.delay = -FLY;
      });
      flightAt = performance.now() - FLY * 2000;
      flightEnd = 0;
    };

    /** Send every pixel from where it is now to its home in phrase `b`. */
    const fly = (b: number) => {
      const fromEdges = first;
      pixels.forEach((p, i) => {
        home(p, i, b);
        if (fromEdges) {
          // Start from the exploded lab: each block sets off from a real piece of debris on screen
          // (shared by the 3D scene), so the wreckage visibly becomes the words.
          const debris = interludeBus.debris;
          if (debris.length) {
            const [dx, dy] = debris[Math.floor(rand() * debris.length)];
            const r = stage.getBoundingClientRect();
            p.x = dx - r.left + (rand() - 0.5) * 40;
            p.y = dy - r.top + (rand() - 0.5) * 40;
          } else {
            const a = rand() * Math.PI * 2;
            const reach = Math.max(width, height) * (0.65 + rand() * 0.5);
            p.x = width / 2 + Math.cos(a) * reach;
            p.y = height / 2 + Math.sin(a) * reach * 0.8;
          }
        }
        p.sx = p.x;
        p.sy = p.y;
        p.vx = p.vy = 0;
        p.curl = (rand() < 0.5 ? -1 : 1) * (0.25 + rand() * 0.35);
        // A sweep across the line: the left of the words leaves first.
        p.delay = ((fromEdges ? p.tx : p.sx) / Math.max(1, width)) * (fromEdges ? 0.42 : 0.5) + p.row * 0.08 + rand() * 0.07;
      });
      flightAt = performance.now();
      flightEnd = pixels.reduce((m, p) => Math.max(m, p.delay), 0) + FLY;
      if (fromEdges) {
        interludeBus.assembleAt = flightAt;
        interludeBus.landAt = flightAt + flightEnd * 1000;
      }
      hitDone = false;
      beat = b;
      wake();
    };

    // The hit: page and 3D layer jolt together, hard first then dying out, like a camera taking it.
    const shake = (strength: number) => {
      const targets = [document.getElementById("lab"), document.querySelector<HTMLElement>(".lab-scene-layer")]
        .filter(Boolean) as HTMLElement[];
      const frames: Keyframe[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const d = Math.pow(1 - i / steps, 2) * strength;
        const end = i === steps;
        const x = end ? 0 : (i % 2 ? 1 : -1) * (10 + rand() * 16) * d;
        const y = end ? 0 : (rand() - 0.5) * 22 * d;
        const r = end ? 0 : (rand() - 0.5) * 1.6 * d;
        frames.push({ translate: `${x.toFixed(1)}px ${y.toFixed(1)}px`, rotate: `${r.toFixed(2)}deg` });
      }
      for (const el of targets) el.animate(frames, { duration: 480, easing: "linear" });
    };

    /** Any line but the one showing. */
    const another = () => {
      const next = Math.floor(rand() * (BEATS.length - 1));
      return next >= beat ? next + 1 : next;
    };

    const draw = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      if (beat < 0) return;
      const t = (now - flightAt) / 1000;

      if (!hitDone && t >= flightEnd) {
        hitDone = true;
        shake(first ? 1 : 0.35);
        first = false;
      }
      const sinceLand = t - flightEnd;
      // The clock moves the story on: after a rest, the pixels re-form into another line.
      if (hitDone && sinceLand > HOLD) {
        fly(another()); // schedules the next frame itself
        return;
      }
      // Neon flash on contact, back to ink over 260ms.
      const flash = hitDone && sinceLand < 0.26 ? 1 - sinceLand / 0.26 : 0;
      // Refresh scanline: every 4.5s a soft band crosses the words, lifting and tinting pixels.
      const since = sinceLand - 1.4;
      const scanT = hitDone && since > 0 ? (since % 4.5) / 1.4 : -1;
      const scanX = scanT >= 0 && scanT <= 1 ? -80 + scanT * (width + 160) : -9999;

      const k = 1 - Math.exp(-dt * 14);
      const damp = Math.exp(-dt * 9);
      const reach = Math.max(70, cell * 18);
      const size = cell - 1; // the 1px gap is what makes it read as pixels
      // The simulation also feeds the 3D scene, which renders these blocks as clay when it can.
      const bus = ensurePixelBuffers(pixels.length);
      const origin = stage.getBoundingClientRect();
      bus.cell = cell;
      bus.at = now;
      const flat = !interludeBus.clay; // draw the 2D pixels only when the clay version isn't showing
      const tints = bus.tint;

      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        const local = (t - p.delay) / FLY;
        tints[i] = 0;
        bus.alpha[i] = 1;
        if (local < 1) {
          const e = local <= 0 ? 0 : first ? easeOut(local) : easeInOut(local);
          // A curved path: the pixel bows out sideways mid-flight, so the words swirl into each other.
          const dx = p.tx - p.sx;
          const dy = p.ty - p.sy;
          const bow = Math.sin(e * Math.PI) * p.curl;
          p.x = p.sx + dx * e - dy * bow;
          p.y = p.sy + dy * e + dx * bow;
          const alpha = first ? (local <= 0 ? 0 : Math.min(1, 0.35 + local)) : 1;
          bus.alpha[i] = alpha;
          bus.x[i] = origin.left + p.x;
          bus.y[i] = origin.top + p.y;
          bus.row[i] = p.row;
          ctx.globalAlpha = alpha;
          if (alpha <= 0) continue;
        } else {
          let fx = 0;
          let fy = 0;
          if (pointer.on) {
            const ox = p.x - pointer.x;
            const oy = p.y - pointer.y;
            const d = Math.hypot(ox, oy);
            if (d < reach && d > 0.01) {
              const push = (1 - d / reach) ** 2 * 2600;
              fx = (ox / d) * push;
              fy = (oy / d) * push;
            }
          }
          const band = Math.abs(p.tx - scanX);
          const lift = band < 60 ? 1 - band / 60 : 0;
          p.vx = (p.vx + fx * dt) * damp + (p.tx - p.x) * k * 60 * dt;
          p.vy = (p.vy + fy * dt) * damp + (p.ty - lift * cell * 0.9 - p.y) * k * 60 * dt;
          p.x += p.vx * dt * 10;
          p.y += p.vy * dt * 10;
          tints[i] = Math.max(flash, lift * 0.85);
          bus.x[i] = origin.left + p.x;
          bus.y[i] = origin.top + p.y;
          bus.row[i] = p.row;
          ctx.globalAlpha = 1;
        }
        if (!flat) continue;
        ctx.fillStyle = colors[p.row] ?? colors[0];
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      }
      ctx.fillStyle = neon;
      for (let i = 0; flat && i < pixels.length; i++) {
        if (tints[i] < 0.02) continue;
        ctx.globalAlpha = tints[i];
        ctx.fillRect(Math.round(pixels[i].x), Math.round(pixels[i].y), size, size);
      }
      ctx.globalAlpha = 1;
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!raf && visible && !document.hidden && !calm()) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    const sync = () => {
      const still = calm();
      section.dataset.motion = still ? "calm" : "full";
      if (still) {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, width, height);
      } else {
        build();
        if (armed && beat < 0 && phrases.length) fly(0);
        wake();
      }
    };

    // The first line arrives as the section reaches 55% of the view; scrolling back above re-arms it.
    const trigger = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        armed = true;
        // Always opens on the first line; after that the clock picks.
        if (beat < 0 && phrases.length && !calm()) fly(0);
      } else if (entry.boundingClientRect.top > 0) {
        armed = false;
        first = true;
        beat = -1;
        if (interludeBus.pixels) interludeBus.pixels.count = 0;
        ctx.clearRect(0, 0, width, height);
      }
    }, { rootMargin: "0px 0px -45% 0px" });
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = stage.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = true;
    };
    const onLeave = () => { pointer.on = false; };
    const ro = new ResizeObserver(() => { if (!calm()) build(); });

    sync();
    document.fonts?.ready.then(() => { if (!calm()) build(); });
    trigger.observe(section);
    onScreen.observe(section);
    ro.observe(stage);
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("lab:preferences", sync);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(raf);
      interludeBus.pixels = null;
      trigger.disconnect();
      onScreen.disconnect();
      ro.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("lab:preferences", sync);
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return (
    <section ref={ref} id="interlude" className="lab-interlude" aria-labelledby="interlude-title">
      <div className="lab-interlude-pin">
        <h2 id="interlude-title" className="lab-interlude-title">
          {BEATS.map((b) => (
            <span key={b.label} className="lab-interlude-line">
              <span className="lab-interlude-row">{b.lines[0]}</span>{" "}
              <span className="lab-interlude-row is-accent">{b.lines[1]}</span>
            </span>
          ))}
        </h2>
        {/* Off-screen type sample: the canvas reads the headline's real font, weight and size from it. */}
        <span className="lab-interlude-probe" aria-hidden="true">M</span>
        <canvas ref={canvasRef} className="lab-interlude-canvas" aria-hidden="true" />
      </div>
    </section>
  );
}
