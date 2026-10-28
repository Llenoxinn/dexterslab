"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { BoltIcon, EnvelopeIcon } from "@/components/icons";
import {
  COIL,
  DEXTER_DUCK_A,
  DEXTER_DUCK_B,
  DEXTER_HIT,
  DEXTER_JUMP,
  DEXTER_RUN_A,
  DEXTER_RUN_B,
  DRONE_A,
  DRONE_B,
  FUMES_A,
  FUMES_B,
  GAME_BEAKER,
  GAME_FLASK,
  GAME_TESLA_A,
  GAME_TESLA_B,
  GAME_TUBES,
  ORB_A,
  ORB_B,
  STEAM,
} from "@/lib/pixel-art";

type Phase = "idle" | "running" | "paused" | "over";
type Sprite = { map: readonly string[]; w: number; h: number };
// `lift` is the current height above the bench; `base` and `move` decide how it changes:
// ground things sit still, a bouncing flask hops, fumes and drones bob in the air.
type Obstacle = {
  sprite: Sprite;
  frames?: Sprite[];
  x: number;
  lift: number;
  base: number;
  move: "ground" | "bounce" | "bob";
  pace: number;
  born: number;
  tint?: string;
  soft?: boolean;
};
type Spark = { x: number; y: number; vx: number; vy: number; life: number };
type Box = { l: number; r: number; t: number; b: number };

const TITLE = "Experiment in progress.";
const COLORS: Record<string, string> = { N: "#6666fd", L: "#cbcbef", P: "#f6f6fc", D: "#0a0a5d" };
const BEST_KEY = "dexterslab:best";

// Physics in grid cells and seconds: a ~34-cell jump that clears any obstacle at any speed.
const GRAVITY = 620;
const JUMP_SPEED = 205;
const START_SPEED = 60;
const MAX_SPEED = 140;
const ACCEL = 1.4;

const JUMP_KEYS = new Set([" ", "Spacebar", "ArrowUp", "w", "W"]);
const DUCK_KEYS = new Set(["ArrowDown", "s", "S"]);

const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");

const full = (map: readonly string[]): Sprite => ({ map, w: map[0].length, h: map.length });

// Crops empty rows and columns, so obstacles stand on the ground and hitboxes fit the drawing.
function trimmed(map: readonly string[]): Sprite {
  const filled = (row: string) => /[^.]/.test(row);
  const top = map.findIndex(filled);
  const bottom = map.length - 1 - [...map].reverse().findIndex(filled);
  const rows = map.slice(top, bottom + 1);
  let l = Infinity;
  let r = -1;
  for (const row of rows) {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      l = Math.min(l, x);
      r = Math.max(r, x);
    }
  }
  return full(rows.map((row) => row.slice(l, r + 1)));
}

const RUN = [full(DEXTER_RUN_A), full(DEXTER_RUN_B)];
const DUCK = [full(DEXTER_DUCK_A), full(DEXTER_DUCK_B)];
const JUMP = full(DEXTER_JUMP);
const HIT = full(DEXTER_HIT);
const ORB = [full(ORB_A), full(ORB_B)];
const FUMES = [full(FUMES_A), full(FUMES_B)];
const DRONE = [full(DRONE_A), full(DRONE_B)];
const STEAM_PUFF = full(STEAM);
const COIL_BG = full(COIL);
const LAB = { beaker: trimmed(GAME_BEAKER), flask: trimmed(GAME_FLASK), tubes: trimmed(GAME_TUBES) };
const TESLA = [trimmed(GAME_TESLA_A), trimmed(GAME_TESLA_B)];

const overlap = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

// "Experiment in progress": an endless runner across the lab bench. The canvas is
// drawn at grid resolution and scaled up with crisp pixels; the overlay is real DOM.
export function LabGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const bestRef = useRef<HTMLSpanElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState({ trial: 0, score: 0, record: false });
  const [announcement, setAnnouncement] = useState("");

  // Keyboard and screen-reader users land on the next action after a crash or pause.
  useEffect(() => {
    if (phase === "over" || phase === "paused") primaryRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    const hero = canvas?.closest<HTMLElement>(".hero");
    if (!canvas || !box || !ctx || !hero) return;
    const sheet = document.querySelector("[data-sheet]");
    // Mid-height orbs need a duck key, so touch players never meet them.
    const coarse = matchMedia("(pointer: coarse)").matches;

    let phase: Phase = "idle";
    let px = 4;
    let cols = 0;
    let rows = 0;
    let ground = 0;
    let playerX = 0;
    let speed = START_SPEED;
    let dist = 0;
    let score = 0;
    let shown = -1;
    let trial = 0;
    let best = 0;
    let clock = 0;
    let crashedAt = 0;
    let raf = 0;
    let last = 0;
    let chargedTimer = 0;
    let milestoneTimer = 0;
    let spawnIn = 0;
    let obstacles: Obstacle[] = [];
    let sparks: Spark[] = [];
    let steam: [number, number][] = [];
    let coils: number[] = [];
    const player = { y: 0, vy: 0, duck: false, hold: false, groundedAt: 0, queuedAt: -1 };

    try {
      best = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {}
    if (bestRef.current) bestRef.current.textContent = pad(best);

    // Each sprite is rendered once per tint to a tiny canvas, then blitted.
    const cache = new Map<string, HTMLCanvasElement>();
    function image(s: Sprite, tint = COLORS.L, mono = false) {
      const key = `${s.map.join("/")}|${tint}|${mono}`;
      let img = cache.get(key);
      if (!img) {
        img = document.createElement("canvas");
        img.width = s.w;
        img.height = s.h;
        const c = img.getContext("2d")!;
        s.map.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === ".") continue;
            c.fillStyle = mono || ch === "#" ? tint : COLORS[ch];
            c.fillRect(x, y, 1, 1);
          }
        });
        cache.set(key, img);
      }
      return img;
    }

    function layout() {
      const w = box!.clientWidth;
      px = w >= 1024 ? 5 : 4;
      cols = Math.ceil(w / px);
      rows = Math.floor(box!.clientHeight / px);
      canvas!.width = cols;
      canvas!.height = rows;
      canvas!.style.width = `${cols * px}px`;
      canvas!.style.height = `${rows * px}px`;
      ground = rows - 7;
      const frame = hero!.querySelector(".hero-frame");
      const rail = frame ? (frame.getBoundingClientRect().left - box!.getBoundingClientRect().left) / px : 2;
      playerX = Math.max(Math.round(rail) + 6, Math.round(cols * 0.12));
      steam = Array.from({ length: 5 }, (_, i) => [((i + Math.random() * 0.6) / 5) * cols, rows * (0.08 + Math.random() * 0.3)]);
      coils = [cols * 0.38, cols * 0.86];
    }

    // Builds a hazard just off the right edge.
    function hazard(sprite: Sprite, extra: Partial<Obstacle> = {}): Obstacle {
      const base = extra.base ?? 0;
      return { sprite, x: cols + 2, lift: base, base, move: "ground", pace: 1, born: clock, ...extra };
    }

    function reset() {
      speed = START_SPEED;
      score = 0;
      shown = -1;
      sparks = [];
      Object.assign(player, { y: 0, vy: 0, duck: false, hold: false, queuedAt: -1 });
      // Show a coil on the bench only where it's at least ~1.8s away; on narrow screens the
      // first hazard comes in from the edge instead, about two seconds after the start.
      const previewX = Math.round(cols * 0.72);
      const roomy = previewX - playerX - 16 >= START_SPEED * 1.8;
      obstacles = roomy ? [{ ...hazard(TESLA[0], { frames: TESLA }), x: previewX }] : [];
      spawnIn = roomy ? cols * 0.45 : Math.max(0, START_SPEED * 2.2 - (cols - playerX));
    }

    function spawn() {
      const pool: (() => Obstacle)[] = [
        () => hazard(LAB.beaker),
        () => hazard(LAB.flask),
        () => hazard(LAB.tubes),
        () => hazard(TESLA[0], { frames: TESLA }),
      ];
      // The lab gets stranger as the score climbs. Hazards that need a duck stay off
      // touch screens; there they fly high instead, to punish needless jumps.
      if (score > 100) pool.push(() => hazard(LAB.flask, { move: "bounce", pace: 1.15 }));
      if (score > 150) pool.push(() => hazard(ORB[0], { frames: ORB, base: 26, pace: 1.12 }));
      if (score > 220) {
        pool.push(() => hazard(FUMES[0], { frames: FUMES, move: "bob", base: coarse ? 26 : 12, pace: 0.85, soft: true }));
      }
      if (score > 320) pool.push(() => hazard(DRONE[0], { frames: DRONE, move: "bob", base: coarse ? 27 : 14, pace: 1.2 }));
      if (score > 300 && !coarse) pool.push(() => hazard(ORB[0], { frames: ORB, base: 13, pace: 1.12 }));
      const ob = pool[Math.floor(Math.random() * pool.length)]();
      obstacles.push(ob);
      // A second beaker right behind, once there's enough speed to clear both in one jump.
      if (speed > 95 && ob.move === "ground" && Math.random() < 0.3) {
        obstacles.push({ ...hazard(LAB.beaker), x: ob.x + ob.sprite.w + 1 });
      }
      spawnIn = speed * (0.9 + Math.random() * 0.9) + 24;
    }

    function playerBox(): Box {
      const h = player.duck && player.y <= 0 ? 12 : 18;
      const b = ground - player.y;
      return { l: playerX + 3, r: playerX + 13, t: b - h + 2, b };
    }

    // Fumes are soft-edged, so their hitbox is more forgiving.
    function obstacleBox(ob: Obstacle): Box {
      const inset = ob.soft ? 3 : 2;
      const b = ground - ob.lift;
      return { l: ob.x + inset, r: ob.x + ob.sprite.w - inset, t: b - ob.sprite.h + inset, b: b - 1 };
    }

    function setScore(n: number) {
      if (scoreRef.current) scoreRef.current.textContent = pad(n);
    }

    function update(dt: number) {
      clock += dt;
      if (phase === "running") {
        speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
        const move = speed * dt;
        dist += move;
        score += move * 0.15;

        // Jump with a short input buffer and coyote time, so presses never feel eaten.
        const grounded = player.y <= 0 && player.vy <= 0;
        if (grounded) player.groundedAt = clock;
        if (player.queuedAt >= 0 && clock - player.queuedAt < 0.12 && clock - player.groundedAt < 0.08 && player.vy <= 0) {
          player.vy = JUMP_SPEED;
          player.queuedAt = -1;
        }
        if (!player.hold && player.vy > 70) player.vy = 70;
        if (player.y > 0 || player.vy > 0) {
          player.vy -= GRAVITY * (player.duck ? 2.6 : 1) * dt;
          player.y += player.vy * dt;
          if (player.y <= 0) {
            player.y = 0;
            player.vy = 0;
          }
        }

        for (const ob of obstacles) {
          ob.x -= move * ob.pace;
          const age = clock - ob.born;
          if (ob.move === "bounce") ob.lift = Math.abs(Math.sin(age * 5)) * 20;
          else if (ob.move === "bob") ob.lift = ob.base + Math.sin(age * 3) * 3;
        }
        obstacles = obstacles.filter((ob) => ob.x + ob.sprite.w > -2);
        spawnIn -= move;
        if (spawnIn <= 0) spawn();

        for (const s of steam) {
          s[0] -= move * 0.15;
          if (s[0] < -STEAM_PUFF.w) s[0] += cols + STEAM_PUFF.w * 2;
        }
        coils = coils.map((x) => (x - move * 0.3 < -COIL_BG.w ? x - move * 0.3 + cols + COIL_BG.w * 2 : x - move * 0.3));

        const pb = playerBox();
        if (obstacles.some((ob) => overlap(pb, obstacleBox(ob)))) crash();

        const now = Math.floor(score);
        if (now !== shown) {
          if (Math.floor(now / 100) > Math.floor(Math.max(shown, 0) / 100)) {
            hudRef.current?.classList.add("is-milestone");
            window.clearTimeout(milestoneTimer);
            milestoneTimer = window.setTimeout(() => hudRef.current?.classList.remove("is-milestone"), 300);
          }
          shown = now;
          setScore(now);
        }
      }
      sparks = sparks.filter((s) => (s.life -= dt * 1.4) > 0);
      for (const s of sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 90 * dt;
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, cols, rows);

      // Far lab: faint coils and drifting steam, slower than the bench.
      ctx!.globalAlpha = 0.14;
      for (const x of coils) ctx!.drawImage(image(COIL_BG, COLORS.N, true), Math.round(x), ground - COIL_BG.h);
      ctx!.globalAlpha = 0.28;
      for (const [x, y] of steam) ctx!.drawImage(image(STEAM_PUFF), Math.round(x), Math.round(y));

      // The bench, with dashes that run under the player.
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = COLORS.L;
      ctx!.fillRect(0, ground, cols, 1);
      ctx!.globalAlpha = 0.5;
      for (let x = -(dist % 16); x < cols; x += 16) ctx!.fillRect(Math.round(x), ground + 3, 7, 1);
      for (let x = 8 - ((dist * 0.6) % 16); x < cols; x += 16) ctx!.fillRect(Math.round(x), ground + 5, 3, 1);
      ctx!.globalAlpha = 1;

      for (const ob of obstacles) {
        const s = ob.frames ? ob.frames[Math.floor(clock * 8) % 2] : ob.sprite;
        ctx!.globalAlpha = ob.soft ? 0.85 : 1;
        ctx!.drawImage(image(s, ob.tint), Math.round(ob.x), Math.round(ground - ob.lift) - s.h);
      }
      ctx!.globalAlpha = 1;

      const step = Math.floor(clock * 10) % 2;
      const frame =
        phase === "over"
          ? HIT
          : player.y > 0
            ? JUMP
            : player.duck
              ? DUCK[step]
              : phase === "running"
                ? RUN[step]
                : RUN[0];
      ctx!.drawImage(image(frame), playerX, Math.round(ground - player.y) - frame.h);

      for (const s of sparks) {
        ctx!.fillStyle = s.life > 0.5 ? COLORS.P : COLORS.N;
        ctx!.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
    }

    function loop(now: number) {
      // Capped step: a dropped frame never tunnels the player through an obstacle. The first
      // frame's timestamp can predate `last`, so the floor keeps time from running backwards.
      const dt = Math.max(0, Math.min(0.033, (now - last) / 1000));
      last = now;
      update(dt);
      draw();
      raf = phase === "running" || sparks.length ? requestAnimationFrame(loop) : 0;
    }

    function run() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (phase === "running" || !inView()) return;
      if (phase === "over" && performance.now() - crashedAt < 400) return;
      const resuming = phase === "paused";
      if (!resuming) {
        reset();
        trial += 1;
        setScore(0);
      }
      phase = "running";
      hero!.dataset.phase = phase;
      setPhase("running");
      setAnnouncement(resuming ? "Resumed." : `Trial ${trial} started.`);
      run();
    }

    function pause() {
      if (phase !== "running") return;
      phase = "paused";
      hero!.dataset.phase = phase;
      player.hold = false;
      player.duck = false;
      setPhase("paused");
      setAnnouncement("Paused.");
    }

    function crash() {
      phase = "over";
      hero!.dataset.phase = phase;
      crashedAt = performance.now();
      const pb = playerBox();
      for (let i = 0; i < 26; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = 20 + Math.random() * 55;
        sparks.push({ x: (pb.l + pb.r) / 2, y: (pb.t + pb.b) / 2, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 25, life: 1 });
      }
      const final = Math.floor(score);
      const record = final > best;
      if (record) {
        best = final;
        try {
          localStorage.setItem(BEST_KEY, String(best));
        } catch {}
        if (bestRef.current) bestRef.current.textContent = pad(best);
      }
      hero!.classList.add("is-charged");
      window.clearTimeout(chargedTimer);
      chargedTimer = window.setTimeout(() => hero!.classList.remove("is-charged"), 320);
      setResult({ trial, score: final, record });
      setAnnouncement(`Experiment failed. Trial ${trial}, score ${final}${record ? ", a new best" : ""}.`);
      setPhase("over");
    }

    // Keys are only taken while the game is on screen, so Space still scrolls the page elsewhere.
    function inView() {
      const r = hero!.getBoundingClientRect();
      const covered = sheet ? sheet.getBoundingClientRect().top < innerHeight * 0.55 : false;
      return r.bottom > innerHeight * 0.4 && !covered;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (phase === "running") {
        if (JUMP_KEYS.has(e.key)) {
          e.preventDefault();
          if (!e.repeat) {
            player.queuedAt = clock;
            player.hold = true;
          }
        } else if (DUCK_KEYS.has(e.key)) {
          e.preventDefault();
          player.duck = true;
        } else if (e.key === "Escape") {
          pause();
        }
        return;
      }
      if (!JUMP_KEYS.has(e.key) || !inView() || el.closest("a")) return;
      if (el.closest("button") && !el.closest(".hero")) return;
      e.preventDefault();
      start();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.key)) player.hold = false;
      if (DUCK_KEYS.has(e.key)) player.duck = false;
    };

    // Clicks and taps on the bench (not on text or controls) start the run, then jump.
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as Element).closest("a, button, p, h1, .lab-hud")) return;
      if (phase === "running") {
        player.queuedAt = clock;
        player.hold = true;
      } else {
        start();
      }
    };
    const onPointerUp = () => {
      player.hold = false;
    };

    const onScroll = () => {
      if (phase === "running" && !inView()) pause();
    };
    const onHide = () => {
      if (document.hidden) pause();
    };
    const onBlur = () => {
      player.hold = false;
      player.duck = false;
    };

    layout();
    reset();
    draw();
    startRef.current = start;

    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(box);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    hero.addEventListener("pointerdown", onPointerDown);
    hero.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(chargedTimer);
      window.clearTimeout(milestoneTimer);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      hero.removeEventListener("pointerdown", onPointerDown);
      hero.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const startButton = (label: string) => (
    <button ref={primaryRef} type="button" className="btn btn-solid btn-lg" onClick={() => startRef.current()}>
      <BoltIcon className="btn-icon" />
      {label}
    </button>
  );
  const contactLink = (
    <a className="btn btn-ghost btn-lg" href="#contact">
      <EnvelopeIcon className="btn-icon" />
      Keep in touch
    </a>
  );

  return (
    <>
      <div data-scene data-intro className="lab-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="lab-canvas" />
      </div>

      <div ref={hudRef} className="lab-hud" aria-hidden="true">
        <p>
          Score <span ref={scoreRef}>00000</span>
        </p>
        <p>
          Best <span ref={bestRef}>00000</span>
        </p>
      </div>

      <div className="wrap hero-main" data-phase={phase}>
        <div className="hero-copy" inert={phase !== "idle"}>
          {/* Split into words and letters for the entrance; screen readers get the plain sentence. */}
          <h1 data-intro className="display hero-title">
            <span className="sr-only">{TITLE}</span>
            <span aria-hidden="true">
              {TITLE.split(" ").map((word, i, words) => (
                <Fragment key={word}>
                  {i > 0 && " "}
                  <span className="word">
                    {[...word].map((char, j) => (
                      <span key={j} className="char">
                        {char}
                      </span>
                    ))}
                    {/* The terminal cursor rides on the last word, so it never wraps alone. */}
                    {i === words.length - 1 && <span className="caret caret--title" />}
                  </span>
                </Fragment>
              ))}
            </span>
          </h1>
          <div data-lede data-intro className="hero-lede">
            <p>I’m Dexter. I build things, break them, and write down what happened. The full lab opens soon.</p>
            <div className="hero-actions">
              {phase === "idle" && startButton("Run the experiment")}
              {contactLink}
            </div>
            <p className="lab-hint">
              <span className="hint-keys">Press Space to start. Space or ↑ jumps, ↓ ducks.</span>
              <span className="hint-touch">Tap the bench to start, then tap to jump.</span>
              <span className="caret" aria-hidden="true" />
            </p>
          </div>
        </div>

        <div className="hero-result" inert={phase !== "over" && phase !== "paused"}>
          <p className="display result-title">{phase === "paused" ? "Paused." : "Experiment failed."}</p>
          {phase !== "paused" && (
            <p className="result-line">
              Trial {result.trial}. Score {pad(result.score)}.{result.record && " New best."}
            </p>
          )}
          <div className="hero-actions">
            {phase !== "idle" && startButton(phase === "paused" ? "Resume" : "Try again")}
            {contactLink}
          </div>
          <p className="lab-hint">
            <span className="hint-keys">{phase === "paused" ? "Press Space to resume." : "Press Space to try again."}</span>
            <span className="hint-touch">Tap the bench to {phase === "paused" ? "resume" : "try again"}.</span>
            <span className="caret" aria-hidden="true" />
          </p>
        </div>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
