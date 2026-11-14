# dexterslab: Architecture & Implementation Plan

**What it is:** Dexter Juevesano's computer-science, security, and computational research portfolio (`dexterslab.dev`). All structured content lives in [CONTENT.md](CONTENT.md) and `lib/content.ts`.
**Who reads it:** Recruiters, hiring engineers, hackathon/CTF teammates, and research collaborators.
**Its job:** Within 30 seconds, show who Dexter is, demonstrate flagship shipped software and research with zero filler, and make it effortless to inspect live deployments or get in touch.

---

## Tech Stack

| Layer | Choice | Role in the Codebase |
|---|---|---|
| Framework | **Next.js 16.4** (App Router) + **React 19.3** + **TypeScript 5.9** | Pre-rendered static/hybrid pages, fast initial paint, zero-config Vercel deployments, and strict type safety (`npx tsc --noEmit`). |
| Styling | **Tailwind CSS v4** + `app/globals.css` | Design tokens, concentric border radii, hardware-accelerated transitions, and responsive editorial grids in `app/globals.css`. |
| 3D Hero Engine | **Three.js 0.187** (`components/lab-3d-canvas.tsx`) | Interactive 3D voxel/pixel-art cutaway laboratory with orbit controls, pinch/scroll zoom, clickable stations (`Whole lab`, `Terminal`, `Holo core`, `Tank`, `Bench`, `Servers`), and automatic WebGL context cleanup/fallback. |
| Motion & Scroll | **Native Web Animations + IntersectionObserver** (`components/motion.tsx`) | Scroll-linked section reveals, staggered card entrances, and smooth anchor navigation (disabled automatically under `prefers-reduced-motion: reduce`). |
| Footer Runner Game | Custom `<canvas>` engine (`components/lab-game.tsx`) | Playable pixel-art obstacle runner mounted in the footer (`#footer-game`), complete with hazards (beakers, flasks, test tubes, sparking Tesla coils, toxic fumes, drones, plasma orbs), high-score persistence, and crash discharge effects. |
| Fonts | `next/font`: **Inter**, **Pixelify Sans**, **Chakra Petch**, **JetBrains Mono** | Self-hosted with zero layout shift; `Pixelify Sans` for display/pixel accents, `Inter` / `Chakra Petch` for high-legibility UI and editorial copy, and `tabular-nums` for metrics and dates. |
| Hosting | **Vercel** | Automatic CI/CD from `https://github.com/Llenoxinn/dexterslab` (`dexterslab-dev.vercel.app` / `dexterslab.dev`). |

---

## Design System & Visual Rules

**Concept:** A high-voltage pixel laboratory in Notion `/dev`'s DOS electric-blue palette paired with clean Swiss editorial specification sheets on a warm paper canvas.

### Color Tokens (`app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#1313BA` | Notion `/dev` DOS blue. Hero backdrop, header, footer, primary headings, and interactive accents (`10.7:1` AAA on Paper). |
| `--color-paper` | `#F6F6FC` | Primary sheet background and light text on Ink surfaces. |
| `--color-lavender` | `#CBCBEF` | Structural rails, subtle borders, quiet text on Ink (`7.3:1`), and pixel-art glass highlights. |
| `--color-neon` | `#6666FD` | Pixel drop shadows, liquid fills, sparks, and focus/hover accents. |
| `--color-ink-deep` | `#0A0A5D` | Deep navy stage for the 3D lab, pixel-art outlines/goggles, and the Contact pixel bench card. |

### Pixel Art & Custom Sprites (`lib/pixel-art.ts`)
- Every sprite (`DEXTER_RUN_A`, `DEXTER_RUN_B`, `DEXTER_DUCK`, `DEXTER_FAIL`, `DEXTER_WAVE_A`, `DEXTER_WAVE_B`, `GAME_FLASK`, `GAME_BEAKER`, `GAME_TUBES`, `GAME_TESLA_A/B`, `GAME_FUMES`, `GAME_DRONE`, `GAME_ORB`) is defined as an explicit character grid in `lib/pixel-art.ts` and rendered as crisp SVG rects (`shapeRendering="crispEdges"`) or scaled canvas pixels.
- Brand logos (GitHub, LinkedIn, Facebook) and tech stack icons (`components/stack-icons.tsx`) use crisp vector geometry.

### Accessibility & Performance Guardrails
- `prefers-reduced-motion: reduce` disables continuous animations and smooth scrolling; Calm mode also renders the lab on demand.
- Concentric border radii (`outerRadius = innerRadius + padding`) and `1px solid oklch(0 0 0 / 0.1)` inset outlines on media viewports.
- Full keyboard navigation: `Escape` closes the `/dev/dexter` CRT overlay and project case-study modals; number keys `1–4` switch views inside `/dev/dexter`.

---

## Implemented Site Architecture (Complete)

```text
HEADER        dexterslab   About · Experience · Projects · GitHub · Research · Achievements   [Get in touch] [GitHub]
HERO (#lab)   3D Cutaway Pixel Lab (Three.js) + Station Fly-Tos + /dev/dexter Interactive CRT Shell
ABOUT         #method        Systems, security and scientific code (Story, 4 Focus Pillars, Quick Facts, Grouped Skills and Tools)
EXPERIENCE    #experience    UP Cebu BS CS · DOST-SEI Banner + Filterable Organization Logbook (All / Active)
PROJECTS      #projects      Selected Work: 3-Row Full-Width 16:10 Editorial Showcase (dfCTF, BELaude, Sylvi) + Case Study Modal
GITHUB        #github        Live 52-Week Contribution Heatmap (@Llenoxinn) + 3×3 Repositories & Lab Experiments Grid
RESEARCH      #research      Scientific & Computational Research (ADMET-IT · Ficus septica & Paspalum conjugatum)
ACHIEVEMENTS  #achievements  CTF Competitions (HackforGov5 Region 7 Top 2 & UPCSG Mission: CTF Champion)
CONTACT       #contact       Interactive Pixel Lab Bench (Waving Dexter + Bubbling Flask + Reactive Speech Bubble) + Message Form
FOOTER        #footer-game   Playable Endless Lab Runner Game + 3-Column Directory + Asia/Manila Build Timestamp
CUSTOMIZER                   Floating Lab Customizer for theme & motion preferences
```

### Section Details

1. **Immediate first view**
   - An optimized screenshot of the actual lab appears immediately. **Explore in 3D** loads the interactive scene on demand. There is no blocking boot overlay.

2. **Hero & `/dev/dexter` Shell (`components/notion-hero.tsx`, `components/lab-3d-canvas.tsx`)**
   - Full-bleed interactive 3D pixel laboratory with six camera presets (`Whole lab`, `Terminal`, `Holo core`, `Tank`, `Bench`, `Servers`).
   - Clicking **Open /dev/dexter** or the 3D terminal zooms into a CRT shell with four keyboard-accessible commands (`cat whoami`, `ls projects/`, `ls experience/`, `ls achievements/`).

3. **About & Core Skills (`components/method-section.tsx`)**
   - Narrative introduction, four discipline focus cards (`AI and web tooling`, `CTF and security`, `Bioinformatics`, `Design and org work`), quick-reference facts (`Email`, `Based in`, `Scholarship`, `Open to`), and four grouped skill and tool lists (`AI`, `Front end`, `Security`, `Science and design`).

4. **Experience & Education (`components/experience-section.tsx`)**
   - Highlights `University of the Philippines Cebu` (`BS Computer Science · DOST scholar`, `Batch 2029`, `DOST-SEI`) above a 2-column organization grid (`UP Data Science Society`, `UP Cebu Storylab`, `Insight Philippines`, `UP Computer Science Guild`) with `All` / `Active` filtering and real-time duration calculation.

5. **Selected Work (`components/projects-section.tsx`)**
   - 3-row full-width horizontal split (`1.28fr` media stage : `1fr` editorial brief) for flagship platforms:
     - `01 / dfCTF` (`https://dfctf.vercel.app`, `Llenoxinn/dfCTF`) — Clean `16:10` widescreen live capture (`public/projects/dfctf.png`).
     - `02 / BELaude` (`https://belaude.vercel.app`, `Llenoxinn/belaude`) — Clean `16:10` widescreen live capture (`public/projects/belaude.png`).
     - `03 / Sylvi` (`Llenoxinn/Sylvi`) — Project summary preview with a source link. A real screenshot can replace it when available.
   - Includes a detailed **Case study** modal with full problem, architecture, outcome, and stack breakdown.

6. **More from GitHub (`components/github-section.tsx`)**
   - Fetches live 52-week contribution data for `@Llenoxinn` (with response validation, loading, error, and retry states).
   - Displays a 3×3 grid of **Repositories & Lab Experiments** (`Viscal`, `olatz tol`, `Phylogenetic Tree Builder`, `Voronoi Shatter`, `Protein Structure Viewer Lite`, `JeepOI`, `Taptap`, `AIght`, `Perk the Star`) with `All (9)` / `Shipped` / `Work in progress` filtering, restrained pointer feedback, keyboard access, and reduced-motion support.

7. **Scientific & Computational Research (`components/research-section.tsx`)**
   - Two structured research specification cards covering *in silico* molecular docking, ADME-Tox profiling, and *in vitro* natural product bioassays (`ADMET-IT · Ficus septica` and `Paspalum conjugatum · Anti-Quorum Sensing`).

8. **Notable Achievements (`components/achievements-section.tsx`)**
   - Regional and university cybersecurity competition honors (`HackforGov5 Region 7` Top 2 Student Performer · National Wildcard Qualifier, and `UPCSG Mission: CTF` Champion).

9. **Contact (`components/contact-section.tsx`)**
   - Interactive pixel-art laboratory bench on `--color-ink-deep` featuring Dexter's 2-frame wave animation (`DEXTER_WAVE_A` / `DEXTER_WAVE_B`), test-tube rack (`GAME_TUBES`), bubbling flask (`GAME_FLASK`), and a speech bubble that reacts live as visitors focus form inputs, hover social links, click the character, or send a message.
   - Validated form that opens a draft in the visitor's email app. It does not claim server-side delivery.

10. **Footer & Endless Runner (`components/site-footer.tsx`, `components/lab-game.tsx`)**
    - Embeds the playable pixel-art endless runner game in `#footer-game`, followed by brand metadata, section links, external profile links, and the live `Asia/Manila` build date.
