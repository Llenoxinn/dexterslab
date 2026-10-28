# dexterslab: plan

**What it is:** Dexter Juevesano's computer-science portfolio. The content is in [CONTENT.md](CONTENT.md).
**Who reads it:** recruiters, hiring engineers, hackathon, CTF and research collaborators. Most of them skim.
**Its job:** within 30 seconds, show who Dexter is and the strongest work, and make it easy to get in touch.

---

## Tech stack (all phases)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + TypeScript | React, as requested. Vercel builds it with zero configuration. Pages are pre-rendered, so they load fast and link previews work. Server routes are there for the projects editor in Phase 1. |
| Styling | **Tailwind CSS v4** | Colour and type tokens live in `app/globals.css`. |
| Motion | **Motion** (`animate`, `scroll`, `inView`) | Small, React-friendly. Scroll-linked animations run on the browser's native scroll timeline where supported. Replaced GSAP at Dexter's request. |
| Smooth scroll | **Lenis** | Weighty scrolling and anchor offsets for the fixed header. Off under reduced motion. |
| The game | Hand-written `<canvas>` engine (`components/lab-game.tsx`) | Drawn at grid resolution and scaled up with crisp pixels, so each frame is tiny. No game library needed. |
| Fonts | `next/font`: **Pixelify Sans** (display), **Chakra Petch** (text) | Self-hosted, no layout shift. |
| Projects editor (Phase 1) | **Keystatic** | A `/keystatic` admin page with a form per project and photo uploads. Saving commits to GitHub and Vercel redeploys. No database. |
| Hosting | **Vercel** (free Hobby plan) | Fine for a personal, non-commercial portfolio. Every push to GitHub deploys; HTTPS is automatic. |
| Domain | `dexterslab-dev.vercel.app` now; `dexterslab.dev` later | `dexterslab.vercel.app` and `dexters-lab.vercel.app` were taken (checked 28 Oct 2026). |

---

## Design rules (all phases)

**Concept: a high-voltage pixel lab** in Notion /dev's DOS palette. Pixel art, a playable experiment, and a little fighting-game splash energy (misprint shadows, sparks, discharge).

### Colour
| Token | Hex | Role |
|---|---|---|
| Ink | `#1313BA` | Notion /dev's "DOS blue". Hero, header, footer, headings, text. On Paper: 10.7:1 (AAA) |
| Paper | `#F6F6FC` | Page canvas; text on Ink |
| Lavender | `#CBCBEF` | Rails, bench lines, quiet text on Ink (7.3:1), pixel-art glass |
| Neon | `#6666FD` | Pixel drop shadows, liquids, sparks. Never used for text |
| Deep | `#0A0A5D` | Pixel-art details (goggles, eyes) |

Taken from Notion's `--tatami-color-campaigns-dev-platform-dos-*` tokens (checked 28 Oct 2026).

### Type
- **Pixelify Sans 700** for display (title, result screen, section headings, wordmark), with a hard neon pixel drop shadow like a game cartridge logo.
- **Chakra Petch** for everything else. **No monospace anywhere.** Numbers use tabular figures.
- Sentence case throughout.

### Pixel art
- Every icon and sprite is a pixel map in `lib/pixel-art.ts`, drawn as SVG or on the canvas with crisp pixels.
- **Brand logos** (GitHub, LinkedIn, Facebook) stay official, per their guidelines.
- The runner is an **original** pixel scientist, not the Cartoon Network character.

### Motion
| Moment | What happens |
|---|---|
| First visit | Boot screen: bubbling flask, segmented progress bar tied to the real page load (0.7–2.5 s), stepped wipe out. Once per session. |
| Title | Letters decode from scrambled lab glyphs into "Experiment in progress.", left to right. |
| Scroll | The hero holds while the paper sheet slides over it on pixel teeth; the title's words scatter and fade. |
| Contact | The dashed wire fills as you scroll; then current runs along the bus, the icons power on in turn and Dexter waves. |
| Game crash | Spark burst and a neon/lavender misprint flash on the title. |

**Guardrails:** reduced motion turns off the boot screen, decode, scroll effects and Lenis (the game still plays, because it's user-started). Nothing loops for more than 5 seconds on its own. The content is pre-rendered and readable without JavaScript. Only `transform`, `opacity` and `clip-path` animate.

### Honesty
No invented numbers or fake lab readouts. Every status, metric and result is real.

### Accessibility floor
- One `h1`, `h2` per section, visible focus rings, targets ≥ 24 px (aiming for 44).
- Icon-only links have accessible names and tooltips on hover or focus.
- The game: keys are only captured while it's on screen; Esc pauses; results are announced; focus moves to "Try again".
- Reflows at 320 px and 200% zoom. Tested at 390 and 1440 px.

---

## Phase 0: "Experiment in progress" (built)

**Goal:** https://dexterslab-dev.vercel.app live, proving the GitHub → Vercel pipeline.

| Part | What's there |
|---|---|
| Boot screen | First visit per session only (`components/boot-screen.tsx`) |
| Header | Pixel-flask wordmark, GitHub logo button, Contact |
| Hero = the game | "Experiment in progress." + "I'm Dexter. I build things, break them, and write down what happened. The full lab opens soon." + Run the experiment / Keep in touch. An endless runner across the lab bench (`components/lab-game.tsx`). |
| Game | Space/↑/W jump (hold for higher), ↓/S duck, Esc pause, tap on phones. Hazards: beakers, flasks, test tubes, sparking Tesla coils, a bouncing flask, toxic fumes, a lab drone, plasma orbs. Score and best (saved in the browser). "Experiment failed." screen with Try again. |
| Contact | "Keep in touch", a dashed circuit into four icon-only links (Email, GitHub, LinkedIn, Facebook), pixel Dexter waving |
| Footer | Wordmark, "Built and broken by Dexter Juevesano.", BS Computer Science UP Cebu, pixel lab bench, © and the real build date |
| 404 | "Specimen not found." |
| Head | Title, description, Open Graph card (pixel title + coils), pixel-Dexter favicon, `theme-color` |

### Deploy (no domain yet)
1. Push the folder to a new GitHub repo.
2. Vercel → Add New → Project → import the repo, project name `dexterslab-dev` → Deploy. Live at `https://dexterslab-dev.vercel.app`.
3. Every push to `main` redeploys automatically.
4. **Later:** buy `dexterslab.dev` and add it under Vercel → Project → Settings → Domains. HTTPS is automatic.

---

## Phase 1: MVP with real content

```
NAV           dexterslab   Experience  Projects  Achievements  Contact   Résumé ↗
HERO          The game stays; headline becomes "Part storyteller, part systems thinker."
EXPERIENCE    Logbook entries on a powered wire (organisation, role, dates only)
              + compact Education rows (UP Cebu, BS CS, Batch 2029)
TECH STACK    Icon-only directory in 5 groups (names on hover/focus)
PROJECTS      Spec sheets from the projects editor
ACHIEVEMENTS  Result words ("Champion", "Top 2") | title, issuer, date, proof link
CONTACT       The circuit + résumé link
FOOTER        As in Phase 0
```

### Experience: a logbook, newest first
**Each entry:** organisation, role and dates. Nothing else. Roles at the same organisation are grouped; Education rows close the section.

### Tech stack: an icon directory
- **Groups:** Languages, Web, Back end, Tools, Design (25 icons, Figma included). The full list is in CONTENT.md.
- **Icons only**, with accessible names and tooltips. No skill levels. Intro: "Tools I've built with in projects, classes and orgs."
- Icons copied into the repo as SVG, coloured with `currentColor`.

### Projects: spec sheets (from the editor)
| Field | Lab framing | What goes in it |
|---|---|---|
| Name and one line | — | What it is, and who it's for |
| Problem | Hypothesis | 1–2 sentences |
| What you built | Method | Your part, if it was a team |
| Stack | Apparatus | Languages, frameworks, tools |
| Result | Finding | Real users, metrics, awards, or what you learned |
| Status | — | Shipped, in progress or archived |
| Date | — | When it was built |
| Links | — | Live, source, write-up (each optional) |
| Media | Figure | Photos or screenshots (16:10), with alt text |
| Featured | — | Shown first and larger |

### Achievements: findings
Result word (real only), title, issuer, date, one sentence on what earned it, a proof link.

### Projects editor (Keystatic)
`/keystatic`, behind GitHub login. A form per project with photo uploads. Saving commits to the repo; Vercel redeploys in about a minute.

### Deliberately left out
Skill bars, a periodic-table gimmick, a long About section, testimonials (unless real), visitor counters, fake lab readouts, duplicate footer links.

### Content still needed (see CONTENT.md)
1. Résumé PDF
2. A context sentence and a proof link for each achievement
3. Projects, entered through the editor once it exists

---

## Phase 2: later (parked, not prioritised)

- A case-study page per project (`/experiments/<name>`)
- Lab notes: short write-ups or a blog
- An online leaderboard for the game
- Privacy-friendly analytics (Vercel Web Analytics)
- A "Now" page
- More easter eggs (keyboard shortcuts, a 404 mini-game)
- A contact form, if email turns out not to be enough
- Editing the rest of the content in Keystatic
- A hidden note for AI scrapers, carried over from the LinkedIn About joke

Revisit after Phase 1 ships.
