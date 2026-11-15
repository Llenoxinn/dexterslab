# Underwater BOOM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lobby under the lake blows apart into wet, rusted, silted debris, the water clears, and the lab's props rise into the existing journey. The lab room is never seen exploding.

**Architecture:** Native scroll stays the conductor. `lib/dive-path.ts` drops the rise and exposes blast progress `b` and `clear`. `lib/lab-lobby.ts` builds breakable pieces driven by `b`, `lib/underwater-blast.ts` draws the water VFX from the same `b`, and `lib/lab-journey.ts` re-purposes `burst` as "parked below the screen". The canvas wires these together.

**Tech Stack:** Three.js (r18x, `@types/three` 0.187), Next.js 16, `node --test` on `.ts` via type stripping.

**Spec:** `docs/superpowers/specs/2026-11-15-underwater-boom-design.md`

## Global Constraints
- Lobby materials are `MeshPhysicalMaterial` with clearcoat (user's choice). Add only two physical programs, each with its own `customProgramCacheKey`.
- No new full-screen passes. Bubbles ≤ 600 and silt ≤ 800, both one `Points` draw each.
- Everything is scroll-scrubbed: the same scroll always gives the same frame, forwards and backwards.
- Reduced motion (`calm`): no blast, the lobby stays whole.
- Dev machine: one heavy process (dev server or typecheck) and one screenshot at a time.
- One commit per task. The user pushes.

## Review Focus
- Scrolling back up from Contact to the lobby: the lobby reassembles exactly, and no lab prop is left floating in the water. The tests in Task 1 (b is 0 before blastStart) and Task 4 (an offset of 0 at b=0) pin this.
- A fast flick past the whole lobby: the lab room is never drawn while pieces travel from room → burst. Task 6 hides root until `from >= 1`.
- The lobby copy over the blast stays readable, then gets out of the way. Task 6 fades presence by `1 - b*4`.
- Portrait phones: the parked props start below the visible bottom edge at any aspect. The Task 2 test asserts ny < -1.1.
- Shader compile failure on a weak GPU: the material must still compile, so `/* */` comments only, never `//` in GLSL strings.

---

### Task 1: Dive path without the rise
**Files:** Modify `lib/dive-path.ts`, `tests/dive-path.test.mjs`
**Produces:** `DiveAnchors` with `blastStart`, `blastEnd` (replacing `riseStart` and `riseEnd`). `diveStage(y,a)` ∈ [0,2]. `blastProgress(y,a): number` (linear 0..1 over blastStart..blastEnd, the caller eases it). `clearAmount(b): number` = smooth((b − 0.65)/0.35). `divePose` handles s ≤ 2 only.
- [ ] Update the tests: diveStage(99999) === 2; blastProgress is 0 at blastStart, 1 at blastEnd and monotonic; clearAmount(0.6) === 0 and clearAmount(1) === 1; poses hit [0 rig, 1 water, 2 lobby].
- [ ] Run `npm test`: expect FAIL.
- [ ] Implement, then run `npm test`: expect PASS.
- [ ] Commit `feat(dive): the camera stays under the lake; the lobby tail becomes the blast`.

### Task 2: Burst parks the props below the screen
**Files:** Modify `lib/lab-journey.ts`; Test `tests/dive-path.test.mjs` (pure helper)
**Produces:** `export function parkBelow(phase: number, pick: number): [nx: number, ny: number, depth: number]` with nx ∈ [−0.9, 0.9], ny ∈ [−1.6, −1.2] and depth ∈ [26, 34]. The `burst` case uses `screenPoint(camera, nx, ny, depth)`, with the scale as in `swirl`, so burst → swirl reads as rising up.
- [ ] Test: for 200 seeded phase and pick pairs, ny < −1.1 and |nx| ≤ 0.9.
- [ ] Implement, run `npm test`, then commit `feat(journey): the burst waits under the screen so the props rise into the swirl`.

### Task 3: Wet clay and rusted steel
**Files:** Modify `lib/lab-materials.ts`
**Produces:** `wetClayMaterial(env: THREE.Texture, color: THREE.Color): THREE.MeshPhysicalMaterial` and `rustedSteelMaterial(env: THREE.Texture, opts?: { verdigris?: boolean }): THREE.MeshPhysicalMaterial`.
- Wet clay: colour × 0.55, roughness 0.3 varied to 0.15–0.45 by noise, clearcoat 1 with clearcoatRoughness 0.06, envMap set on the material and envMapIntensity 0.9. A silt film on up-facing normals (normal.y > 0.6) lightens toward grey-brown and raises roughness by 0.3.
- Rust: F0 0.56/0.57/0.58 with metalness 1. A rust mask is region noise (×1.3) × fine fbm (×70) × (1 − edge wear). Inside rust, colour lerps to (0.16, 0.055, 0.02), metalness drops to 0.28 and roughness rises by 0.42. The verdigris option tints part of the patina (0.10, 0.34, 0.27). Clearcoat 0.6 with clearcoatRoughness 0.12.
- [ ] Implement, run `npm run typecheck`, then commit `feat(materials): wet clay and rusted steel for the sunken lobby`.

### Task 4: Breakable lobby
**Files:** Modify `lib/lab-lobby.ts`; Test `tests/lobby-blast.test.mjs`
**Consumes:** Task 3 materials. `LobbyMaterials` gains `env: THREE.Texture`.
**Produces:** `export function blastOffset(b: number, dir: THREE.Vector3, sink: number, out: THREE.Vector3): THREE.Vector3` = dir·(1 − e^(−6b)) + (0, −sink·b², 0). `createLobby(...).tick(time, b)`. The wall is 10 × 3 curved panels, each rib is 3 lengths, each plinth body is 2×2×2 blocks plus its cap, and the emblems are whole. Each piece stores its home transform, dir (away from a blast point at the centre of the plinth arc, plus up), spin and sink. For b ≤ 0 the pieces sit exactly at home.
- [ ] Test: blastOffset(0) is the zero vector; |offset| at b=0.5 exceeds 0.9·|dir|·(1 − e^(−3)); offset.y decreases once b > 0.8 (sinking).
- [ ] Implement, run `npm test` and `npm run typecheck`, then commit `feat(lobby): the hall is built from pieces that blow apart under water`.

### Task 5: Shockwave, bubbles, silt
**Files:** Create `lib/underwater-blast.ts`
**Produces:** `createUnderwaterBlast(center: THREE.Vector3): { group: THREE.Group; light: THREE.PointLight; update(b: number, time: number, clear: number): void; dispose(): void }`.
- Shockwave: an icosphere (detail 3) with an additive shader of Fresnel rim × (1 − b/0.25), radius 0.5 + 40·b, visible only for b ∈ (0, 0.25).
- Light: a cool white (0.75, 0.88, 1), intensity 60·e^(−b·18)·[b > 0].
- Bubbles: 600 points. Each has a seeded start (from the blast point, plus a third seeded along piece paths), a radius 0.02–0.09 and a rise speed. Position = start + outward kick·(1 − e^(−5b)) + up·(rise·b·14) + wobble(time). The shader draws a bright rim ring and one highlight. Alpha is smooth(b/0.05)·(1 − clear).
- Silt: 800 points, normal blending, colour (0.42, 0.38, 0.32), alpha 0.18. They billow from the floor ring, radius × (1 − e^(−3b)), settle down, and fade with clear.
- [ ] Implement, run `npm run typecheck`, then commit `feat(lobby): shockwave, bubbles and silt for the underwater blast`.

### Task 6: Wire it into the canvas
**Files:** Modify `components/lab-3d-canvas.tsx`
- Anchors: blastStart = lobbyTop + lobbySpan·0.7 and blastEnd = lobbyTop + lobbySpan + vh·0.3. `b = smooth(blastProgress(smoothY))` (0 when calm) and `clear = clearAmount(b)`.
- Key 1 (burst) = blastStart. Key 2 (swirl) = blastEnd + vh·0.5.
- Water grade: water = uw·(1 − clear) drives fog, background, lights and `underwater.render`. The lobby stays visible while diveS > 1.02 && clear < 1. `root.visible = water < 1 && (from >= 1 || diveS < 1.5)`, so the room shows above water but never mid-burst.
- `--lobby-presence` = uw·clamp(1 − b·4, 0, 1).
- Pass `studio` as the lobby's env. Tick the lobby and the blast with b.
- Remove the "BOOM as the camera arrives" comment and replace it with an accurate one.
- [ ] Run `npm run typecheck` and `npm test`, then commit `feat(lab): the BOOM happens under the lake and the props rise into the journey`.

### Task 7: Look at it
- [ ] Dev server only: take one screenshot each at lobby rest, b≈0.15, b≈0.5, after the clear, and at the swirl. Tune the constants, then commit `style(lobby): tune the underwater blast`.
