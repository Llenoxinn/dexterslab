# dexterslab (`dexterslab.dev`)

Personal portfolio and interactive laboratory of **Dexter Juevesano** — BS Computer Science student at the **University of the Philippines Cebu** and **DOST-SEI Merit Scholar**, working across AI software development, cybersecurity (CTFs), and bioinformatics.

## Highlights

- **On-demand 3D Pixel Lab Hero (`components/notion-hero.tsx`, `components/lab-3d-canvas.tsx`):** An optimized poster of the actual scene loads first. Explore in 3D starts Three.js with orbit/zoom controls, station fly-tos (`Whole lab`, `Terminal`, `Holo core`, `Tank`, `Bench`, `Servers`), and the `/dev/dexter` interactive CRT shell (`whoami`, `projects`, `experience`, `achievements`).
- **Selected Work Showcase (`components/projects-section.tsx`):** Full-width `16:10` widescreen editorial case studies for flagship platforms:
  - **[dfCTF](https://dfctf.vercel.app)** ([Source](https://github.com/Llenoxinn/dfCTF)) — Modular Capture-the-Flag platform with server-side flag verification, weekly `Asia/Manila` leaderboards, 2FA, and staff review workflows.
  - **[BELaude](https://belaude.vercel.app)** ([Source](https://github.com/Llenoxinn/BELaude)) — Client-side UP Latin honors roadmap planner with exact semester-by-semester GWA targets and Vitest-verified calculations.
  - **Sylvi** ([Source](https://github.com/Llenoxinn/Sylvi)) — Offline-ready ID photo layout and print-shop automation PWA with Google MediaPipe face detection and `300 DPI` sheet export.
- **GitHub Activity & 3×3 Lab Experiments (`components/github-section.tsx`):** Live 52-week contribution heatmap for [`@Llenoxinn`](https://github.com/Llenoxinn) with validated live data, an honest unavailable state, and retry and a responsive repository showcase (`Viscal`, `olatz tol`, `Phylogenetic Tree Builder`, `Voronoi Shatter`, `Protein Structure Viewer Lite`, `JeepOI`, `Taptap`, `AIght`, `Perk the Star`).
- **Scientific & Computational Research (`components/research-section.tsx`):** *In silico* molecular docking, pharmacokinetic ADME-Tox profiling, and *in vitro* bioassays (*Ficus septica* Burm. f. and *Paspalum conjugatum*).
- **Interactive Pixel Lab Bench & Endless Runner (`components/contact-section.tsx`, `components/lab-game.tsx`):** Custom SVG/Canvas pixel-art sprites (`lib/pixel-art.ts`), reactive laboratory bench in the Contact section, and a playable endless lab runner game in the footer (`#footer-game`).

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.9
- **Styling:** Tailwind CSS v4 + custom design tokens in `app/globals.css`
- **3D & Graphics:** Three.js (`three`), HTML5 `<canvas>`, custom crisp-edge SVG pixel maps
- **Animation & Scroll:** Native Web Animations, IntersectionObserver, and browser scrolling with full `prefers-reduced-motion` support

## Project Structure

```text
├── app/
│   ├── globals.css          # Design tokens, layout grids, and component styling
│   ├── layout.tsx           # Self-hosted fonts, metadata, and root shell
│   ├── not-found.tsx        # Custom 404 ("Specimen not found.")
│   ├── opengraph-image.tsx  # Dynamic Open Graph card generation
│   └── page.tsx             # Main portfolio page assembling all lab sections
├── components/
│   ├── achievements-section.tsx
│   ├── contact-section.tsx
│   ├── experience-section.tsx
│   ├── github-section.tsx
│   ├── icons.tsx
│   ├── lab-3d-canvas.tsx
│   ├── lab-customizer.tsx
│   ├── lab-game.tsx
│   ├── method-section.tsx
│   ├── motion.tsx
│   ├── notion-hero.tsx
│   ├── pixel-edge.tsx
│   ├── pixel-sprite.tsx
│   ├── projects-section.tsx
│   ├── research-section.tsx
│   ├── site-footer.tsx
│   ├── site-header.tsx
│   └── stack-icons.tsx
├── lib/
│   ├── content.ts           # Typed source of truth for projects, repos, research, experience, and skills
│   ├── pixel-art.ts         # 2D pixel sprite matrices and palette definitions
│   └── site.ts              # Global identity and social links
├── public/
│   └── projects/            # 16:10 widescreen live application screenshots (dfctf.png, belaude.png)
├── CONTENT.md               # Complete portfolio copy and content documentation
└── PLAN.md                  # Architecture, design tokens, and section specifications
```

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Type Checking & Production Build

```bash
npm run typecheck
npm test
npm run build
npm run start
```

## Contact

- **Email:** [redxter.xed@gmail.com](mailto:redxter.xed@gmail.com)
- **GitHub:** [github.com/Llenoxinn](https://github.com/Llenoxinn)
- **LinkedIn:** [linkedin.com/in/dsjuevesano](https://www.linkedin.com/in/dsjuevesano/)
- **Facebook:** [facebook.com/acetylsphaericus](https://www.facebook.com/acetylsphaericus)

## Quality and accessibility

- Native dialogs trap focus, close with Escape, and return focus to their trigger.
- Use **Aa** in the header to choose System, DOS Ink, Phosphor, or High Contrast, adjust density, and enable Calm mode. System follows the operating system. Preferences are validated before use and saved locally.
- Reduced motion and Calm mode also disable JavaScript scroll effects. The 3D lab stops its continuous render loop in Calm mode and while covered by the content sheet.
- The GitHub heatmap loads near the viewport. Failed or invalid responses show a retry action. Arrow keys inspect individual days without adding hundreds of tab stops.
- The contact form prepares an email draft in the visitor's email app. It does not send mail through a server. Clipboard failure is shown without claiming success.
- Set `NEXT_PUBLIC_SITE_URL` to override the canonical production URL, Open Graph origin, sitemap, and robots sitemap location. The default is `https://dexterslab.dev`.
- `npm test` uses Node 24's built-in runner and TypeScript stripping. It requires no additional test dependencies.

Local browser captures and reports are stored under `output/playwright/` and are ignored by Git.

See [the quality review](docs/quality-review.md) for the implementation decisions and validation scope.
