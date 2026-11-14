# dexterslab.dev: Portfolio Content Specification

Source of truth for **Dexter Juevesano's** portfolio (`dexterslab.dev` / `lib/content.ts` & `lib/site.ts`).
Last updated: **14 Nov 2026**.

---

## Identity

- **Name:** Dexter Juevesano
- **Wordmark:** `dexterslab`
- **Domain:** `dexterslab.dev` (`dexterslab-dev.vercel.app`)
- **Headline:** Part storyteller, part systems thinker.
- **Hero Intro (`/dev/dexter`):** I build web tools, break things in CTFs, and turn biological data into pictures. Computer science at UP Cebu, DOST-SEI scholar.
- **Full Intro:** Computer science student at UP Cebu and DOST scholar. I play CTFs and I am exploring AI software development, cybersecurity and bioinformatics, learning by building things and breaking them to see how they work.
- **Interests:** AI software development, cybersecurity & CTFs, bioinformatics & scientific visualization, interface and publication design
- **Open to:** Projects, internships, research collaborations, or a CTF team that needs one more
- **Location:** Cebu, Philippines (UTC+8)

---

## Education

| School | Program | Batch | Status |
|---|---|---|---|
| University of the Philippines Cebu | BS Computer Science · DOST-SEI Merit Scholar | Batch 2029 | Shown on site |
| San Remigio National High School | STEM Strand | Batch 2025 | Archived in content log |

---

## Experience (newest first)

Rendered in `#experience` (`components/experience-section.tsx`) with live duration computation (`formatDuration` in `lib/content.ts`) and an `All` / `Active` filter.

| Organisation | Focus | Role | Dates | Status |
|---|---|---|---|---|
| **UP Data Science Society** | Applied data science, peer study tracks, and analytical tooling. | Associate | Sep 2026 – present | Current |
| **UP Cebu Storylab** | Campus multimedia storytelling, production workflows, and creative tech. | Member | Jul 2026 – present | Current |
| | | Apprentice | Feb 2026 – Jun 2026 | Completed |
| **Insight Philippines** | Editorial layout systems, visual hierarchy, and publication design. | Layout Artist | Feb 2026 – Sep 2026 | Completed |
| **UP Computer Science Guild (UPCSG)** | CS student representation, cohort coordination, and guild creatives. | Block Representative | Aug 2025 – Jun 2026 | Completed |
| | | Creative Associate | Sep 2025 – Apr 2026 | Completed |

---

## Core Focus & Skills (`#method`)

Rendered in `components/method-section.tsx` under **Systems, security and scientific code**.

### Focus Pillars
1. **AI and web tooling:** Study tools, structured LLM pipelines, and web apps (`dfCTF`, `BELaude`, `Sylvi`, `AIght`) that stay fast enough to use every day.
2. **CTF and security:** Web exploitation, cryptography, forensics, and OSINT in regional competitions (`HackforGov5 Region 7`, `UPCSG Mission: CTF`), written up and automated afterwards.
3. **Bioinformatics:** Sequences, phylogenetic trees (`PhyTree`), protein structures (`Protein Structure Viewer Lite`), and molecular docking (`ADMET-IT`) turned into interactive visuals and reproducible pipelines.
4. **Design and org work:** Layout systems, publication design, and creative direction for campus organizations (`UP Cebu Storylab`, `Insight Philippines`, `UPCSG`).

### Tech Stack Directory (`lib/content.ts` & `components/stack-icons.tsx`)

| Group | Items |
|---|---|
| **Languages** | C, C++, C#, Haskell, Python, JavaScript, TypeScript, HTML5, CSS3 |
| **Web** | React, Next.js, Svelte, Blazor, Vite, Tailwind CSS, Zustand, D3.js, Three.js, MapLibre GL, Radix UI, Canvas API |
| **Back end** | Node.js, PostgreSQL, Drizzle ORM, Supabase, FastAPI, Redis |
| **Tools** | Docker, MediaPipe, Vitest, Godot, WSL, UCSF ChimeraX, Audacity |
| **Design** | Figma, Adobe Photoshop, Adobe InDesign, Adobe Illustrator, Canva |

---

## Selected Work (`#projects`)

Rendered in `components/projects-section.tsx` as a 3-row full-width `16:10` editorial case-study showcase with live deployment screenshots (`public/projects/`), an interactive desktop studio preview for `Sylvi`, status filtering (`All`, `Shipped`, `In progress`, `Archived`), and an interactive case-study modal.

### 01 / dfCTF (`CTF Platform · 2026`)
- **Status:** Shipped (`featured: true`)
- **Summary:** Capture-the-Flag platform with server-side flag verification, weekly Asia/Manila leaderboards, first-blood tracking, and staff authoring workflows.
- **Problem (Hypothesis):** Running campus and guild CTF practice rooms meant juggling heavy multi-container setups without integrated challenge review gates, write-up unlocks, or player telemetry.
- **Architecture (Method):** Next.js 16 modular monolith backed by PostgreSQL, Drizzle ORM, PGlite for zero-config local dev, and Better Auth with 2FA, submission cooldowns, post-solve explanations, and exportable player cards.
- **Outcome (Finding):** Delivers challenges across seven security categories with weekly and all-time leaderboards, timed competitions, and independent staff review.
- **Stack:** Next.js, React, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, Docker
- **Media:** `/projects/dfctf.png` (`996×622`, `16:10` widescreen capture)
- **Links:**
  - Live: https://dfctf.vercel.app
  - Source: https://github.com/Llenoxinn/dfCTF

### 02 / BELaude (`UP GWA Planner · 2026`)
- **Status:** Shipped
- **Summary:** Client-side UP Latin honors roadmap planner that calculates the exact semester GWA needed to graduate Summa, Magna, or Cum Laude.
- **Problem (Hypothesis):** Standard GWA calculators only report past standing and leave students guessing what target grades are required across remaining semesters to reach Latin honors.
- **Architecture (Method):** 100% client-side React 19 and TypeScript web app with built-in UP Cebu study plans, custom unit entry for other UP campuses, Vitest GWA math verification, and shareable roadmap cards.
- **Outcome (Finding):** Computes semester-by-semester target GWAs and honest reachability checks with zero data tracking in the browser.
- **Stack:** React, TypeScript, Vite, Tailwind CSS, Radix UI, Vitest, Python
- **Media:** `/projects/belaude.png` (`1004×620`, `16:10` widescreen capture)
- **Links:**
  - Live: https://belaude.vercel.app
  - Source: https://github.com/Llenoxinn/BELaude

### 03 / Sylvi (`ID Print Studio · 2026`)
- **Status:** Shipped
- **Summary:** True-to-size ID photo layout and print-shop automation studio with client-side MediaPipe face cropping and 300 DPI print-sheet export.
- **Problem (Hypothesis):** Philippine print shops manually lay out 1×1, 2×2, and passport ID packages in Word, wasting time on alignment, crop marks, and paper sizing.
- **Architecture (Method):** Offline-ready React and TypeScript PWA using Google MediaPipe face detection for automatic ID framing, guillotine-trimmer straight-cut guides, 24-hour IndexedDB job history, and Supabase shop sync.
- **Outcome (Finding):** Generates print-ready 300 DPI PDF, PNG, and JPG sheets in seconds with exact physical dimensions and crop marks.
- **Stack:** TypeScript, React, Vite, Tailwind CSS, MediaPipe, Supabase, Zustand
- **Media:** Interactive `SylviStudioPreview` desktop studio interface (`4R · 300 DPI` sheet layout + MediaPipe face biometrics inspector)
- **Links:**
  - Source: https://github.com/Llenoxinn/Sylvi

---

## More from GitHub: Repositories & Lab Experiments (`#github`)

Rendered in `components/github-section.tsx` alongside a live 52-week GitHub contribution heatmap for `@Llenoxinn` (with validated data and an explicit unavailable state) and a 3×3 interactive repository grid.

| # | Name | Repository | Status | Stack | Description |
|---|---|---|---|---|---|
| 1 | **Viscal** | `Llenoxinn/Viscal` | Shipped | React, TypeScript, Vite, Tailwind CSS, Canvas API | Browser-based generative math and art playground featuring three real-time engines: Lissajous harmonic curves, procedural L-System branching fractals (Sierpinski, Koch, Dragon, Hilbert), and Gray-Scott reaction-diffusion chemical patterns with custom palettes and PNG export. |
| 2 | **olatz tol** | `Llenoxinn/Olatz-tol` | Shipped | JavaScript, React, Vite, Tailwind CSS, Zustand, Vitest | Interactive Collatz conjecture (`3n + 1`) visualizer that traces how any positive integer falls to 1 across five inspection modes, including a step-by-step logarithmic path view, multi-number range heatmaps, and live stopping-time and peak statistics. |
| 3 | **Phylogenetic Tree Builder** | `Llenoxinn/PhyTree` | Shipped | TypeScript, React, D3.js, Vite, Tailwind CSS, Zustand | Interactive bioinformatics tool that constructs and renders evolutionary phylogenetic trees step-by-step from sequence alignments using UPGMA and Neighbor-Joining hierarchical clustering algorithms. |
| 4 | **Voronoi Shatter** | `Llenoxinn/Voronoi-Shatter` | Shipped | Svelte, Vite, Tailwind CSS, JavaScript, Canvas API | Interactive computational geometry web experiment demonstrating dynamic Voronoi polygon tessellation, cell shattering, and real-time fracture physics in the browser. |
| 5 | **Protein Structure Viewer Lite** | `Llenoxinn/Protein-Structure-Viewer-Lite-` | Shipped | React, Three.js, JavaScript, Vite, Tailwind CSS | Lightweight 3D macromolecular PDB structure viewer built on raw Three.js without external molecular viewer libraries. Supports RCSB PDB accession fetching, `.pdb`/`.ent` uploads, CPK/chain/residue palettes, backbone ribbon tubes, atom tooltips, and adaptive LOD. |
| 6 | **JeepOI** | `Llenoxinn/JeepOI` | In progress | Python, React, TypeScript, MapLibre GL, Vite | Offline-first Cebu traditional and modern jeepney transit planner. Uses a Python Overpass API and KMZ geospatial pipeline to compile structured GeoJSON routes paired with a MapLibre GL route explorer and Dijkstra fare and trip pathfinder. |
| 7 | **Taptap** | `Llenoxinn/Taptap` | In progress | TypeScript, React, Vite, Tailwind CSS | Rhythm and reflex interaction project currently under active repository scaffolding and early mechanics prototyping. |
| 8 | **AIght** | `Llenoxinn/AIGht` | In progress | C#, Blazor, Three.js, Python, FastAPI, Redis, Docker | Document intelligence platform that turns complex documents into plain-English explanations, action checklists, and source-verified answers. Pairs a Blazor and Three.js 3D page-stack navigator with a Landlock/seccomp-sandboxed Python FastAPI ingestion pipeline and ClamAV scanning. |
| 9 | **Perk the Star** | `GeoCeff/perk-the-star` | Shipped | Godot, C++, Python | Orbital tower defense game built in Godot 4.6 where rotating towers defend the Sun across a 12-wave campaign, Endless scaling modes, a No-Flare challenge, and a Tech XP unlock tree powered by C++ GDExtension native systems. |

---

## Scientific & Computational Research (`#research`)

Rendered in `components/research-section.tsx` from `researchWorks` in `lib/content.ts`.

### 1. ADMET-IT · *Ficus septica* (`In Silico & In Vitro`)
- **Full Title:** *ADMET-IT: In Silico Structural Analyses, Molecular Docking, Pharmacokinetic ADME-Tox Profiling of Bioactive Phytocompounds Against Diabetes-Related Enzymes, and In Vitro Evaluation of Cytotoxicity, and Alpha-Glucosidase Inhibitory Activity of Ficus septica Burm. f. leaf ethanolic and methanolic extracts*
- **Domain:** Cheminformatics, Molecular Docking & Enzymatic Bioassay
- **Summary:** Integrated computational pharmacology and wet-lab investigation evaluating bioactive phytocompounds from *Ficus septica* Burm. f. (Hauili / Lagnub) as candidate inhibitors of diabetes-associated metabolic enzymes.
- **Highlights:**
  - **In Silico Docking & ADME-Tox Pipeline:** Conducted structural modeling, receptor-ligand molecular docking against diabetes-related enzymes, and pharmacokinetic ADME-Tox (Absorption, Distribution, Metabolism, Excretion, and Toxicity) screening of candidate *Ficus septica* phytocompounds.
  - **In Vitro Bioassay & Enzyme Inhibition:** Prepared ethanolic and methanolic leaf extracts of *Ficus septica* Burm. f. and evaluated their in vitro cytotoxicity profiles alongside alpha-glucosidase inhibitory activity.
- **Tags:** Molecular Docking, ADME-Tox Profiling, Structural Bioinformatics, Alpha-Glucosidase Assay, Cytotoxicity Evaluation, Phytochemistry

### 2. *Paspalum conjugatum* · Anti-Quorum Sensing (`In Vitro`)
- **Full Title:** *Phytochemical Analysis, Antibacterial Activity, and Anti-Quorum Sensing Activity of Hilo Grass (Paspalum conjugatum) Extract against Streptococcus mutans*
- **Domain:** Phytochemistry, Oral Microbiology & Biofilm Attenuation
- **Summary:** Experimental evaluation of ethanolic and aqueous stem and leaf extracts from *Paspalum conjugatum* (Hilo grass) targeting cariogenic pathogen *Streptococcus mutans* through both growth inhibition and quorum-sensing disruption.
- **Highlights:**
  - **Qualitative Phytochemical Screening:** Characterized secondary metabolites present in *Paspalum conjugatum* stem and leaf extracts to identify bioactive alkaloids, flavonoids, tannins, and phenolic constituents.
  - **Antibacterial & Anti-Quorum Sensing Assays:** Assessed antibacterial susceptibility and cell-to-cell signaling (quorum sensing) inhibition against *Streptococcus mutans* to evaluate virulence and cariogenic biofilm suppression.
- **Tags:** Phytochemical Analysis, Anti-Quorum Sensing, Antibacterial Assay, *Streptococcus mutans*, Natural Products, Biostatistics

---

## Notable Achievements (`#achievements`)

Rendered in `components/achievements-section.tsx` from `achievements` in `lib/content.ts`.

### 1. HackforGov5 Region 7
- **Result:** Top 2 Student Performer · National Wildcard Qualifier
- **Issued by:** Department of Information and Communications Technology (DICT) Region 7
- **Date:** Oct 2026
- **Context:** Competed across web exploitation, digital forensics, and reverse-engineering challenges in the regional cyber-defense qualifier.

### 2. UPCSG Mission: CTF (Mini Capture the Flag)
- **Result:** Champion
- **Issued by:** UP Computer Science Guild
- **Date:** Sep 2026
- **Context:** Cleared the highest-point challenges across web exploitation, cryptography, and OSINT to finish 1st overall.

---

## Contact (`#contact`)

Rendered in `components/contact-section.tsx` with an interactive pixel-art laboratory bench scene (`DEXTER_WAVE_A` / `DEXTER_WAVE_B`, `GAME_TUBES`, bubbling `GAME_FLASK`, reactive speech bubble) and a direct message form (Web3Forms + `mailto:` fallback).

- **Prompt:** Always happy to chat about new projects, internships, or anything you are building. Feel free to reach out.
- **Email:** `redxter.xed@gmail.com`
- **GitHub:** https://github.com/Llenoxinn
- **LinkedIn:** https://www.linkedin.com/in/dsjuevesano/
- **Facebook:** https://www.facebook.com/acetylsphaericus
