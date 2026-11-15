# Underwater BOOM: design

## Intent
The BOOM moves from the hero lab to the lobby under the lake. The lobby (plinths, emblems, steel ribs, curved wall) blows apart under water, and its debris reads as wet and sunken: rusted, patinated steel, dark wet clay with a glossy sheen, bubbles and silt. Then the existing journey (swirl → columns → Contact frame) carries on. The hero lab is never seen exploding.

## Approaches
- **A. Lab props rise out of the water into the journey (picked).** The camera stays in the lobby, the water clears to the page colour, and the lab's props come up from below the screen into the swirl. The journey is unchanged from `swirl` on. Cheapest and lowest risk.
- B. Lobby debris becomes the journey: the most continuous story, but the journey and Contact formations would have to be rebuilt around new pieces.
- C. The camera rises and the lab lifts off whole: no shattering, but a long extra camera move.

## Goals / non-goals / anti-goals
- Goals: an underwater blast that is reversible on scroll, and wet, rusty, silted debris that looks material rather than clean CG. A seamless hand-off to the journey.
- Non-goals: changing the journey formations after `swirl`, the Contact finale, or the hero.
- Anti-goals: the lab room seen exploding; a pop when materials swap; jank on this laptop (5.7 GB, Radeon 610M); new full-screen passes.

## The how
**Camera and scroll (`lib/dive-path.ts`, canvas).** The rise segment (s 2→3) goes away and the camera holds in the lobby after the dive. The lobby's scroll tail becomes the blast progress `b` (0→1), scrubbed by the same lagged scroll, so it plays forwards and backwards. `clear` (b 0.65→1) fades fog, deep-water background, god rays and the underwater light grade back to the page colour and daylight. The lobby copy fades out as the blast starts.

**Journey hand-off (`lib/lab-journey.ts`).** `burst` stops meaning "shatter in place": it now parks the props below the bottom edge of the screen (screen-relative, scattered across x and depth). The lab root stays hidden until `room → burst` has finished, so the room is never seen. `burst → swirl` then plays as the props rising up out of the cleared water. Keys: burst formed at blast start (while hidden), swirl formed shortly after the clear.

**Breakable lobby (`lib/lab-lobby.ts`).** The wall is built from about 30 curved panels and each rib from 3 lengths. Each plinth body is a 2×2×2 stack of blocks that reads as masonry, plus its cap, and the emblems stay whole. That makes about 120 meshes, drawn only while under water (the lab is hidden then). Each piece gets a seeded outward direction from a blast point between the plinths, a spin, and a sink rate. Motion follows water drag: offset = dir · (1 − e^(−6b)), plus a slow sink and tumble. The floor stays and cracks darken into it.

**Wet materials (lobby-only copies, `lib/lab-materials.ts`).** Pieces use `MeshPhysicalMaterial` (the user chose the glass-like look over the cheaper standard material, accepting the GPU risk). The water film is a clearcoat, and both materials get `onBeforeCompile` after 3d-metal-material's aged recipe. Only two physical programs are added (wet clay, rusted steel) and they are compiled once.
- Rusted steel: steel F0 with rust patches (0.16, 0.055, 0.02) from a region mask × fine fbm, worn off edges. Inside rust, metalness drops to 0.28 and roughness rises by 0.42. Verdigris-green specks on the emblems' steel.
- Wet clay: the clay ramp darkened to about 55%, with low, varied roughness (0.15–0.45) for the glossy water sheen and a darker silt film collected on upward faces.
- Applied from the moment you go under, so nothing pops at the blast.

**Water VFX (new `lib/underwater-blast.ts`).** All scrubbed by `b` plus a time wobble, pooled and capped:
- A shockwave shell: an expanding sphere with a bright Fresnel rim, plus a short cool flash on one point light.
- About 600 bubbles: points with a bright rim and a highlight, rising and wobbling, bursting from the blast point and streaming off falling pieces. These stand in for "drips", because nothing drips under water; outgassing bubbles are the wet cue there.
- About 800 silt motes: soft, low-alpha grey-brown discs that billow out from the floor and settle slowly, thickening the fog as `clear` approaches so the lobby dissolves instead of being cut.
- Marine snow stays.

**Reduced motion.** There is no blast. The lobby stays whole and the scene fades as today.

## Left to the builder
Exact panel counts, noise constants and timing within the ranges above. If the frame time on the 610M is over budget, lower the counts first.

## Out of scope
Pixel fonts: nothing in this change touches them (the hero logo and the footer stay as they are).
