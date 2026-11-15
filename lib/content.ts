export type ExperienceRole = {
  role: string;
  start: string; // YYYY-MM
  end: string | "present"; // YYYY-MM or "present"
  dateLabel: string;
};

export type ExperienceOrg = {
  organisation: string;
  roles: ExperienceRole[];
};

export type EducationEntry = {
  school: string;
  program: string;
  batch: string;
};

export type StackGroup = "Languages" | "Web" | "Back end" | "Tools" | "Design";

export type StackItem = {
  id: string;
  name: string;
  group: StackGroup;
};

export type ProjectStatus = "shipped" | "in progress" | "archived";

export type ProjectEntry = {
  slug: string;
  name: string;
  /** One short line for the card; the long fields live in the case-study dialog. */
  tagline: string;
  summary: string;
  problem: string;
  built: string;
  stack: string[];
  result: string;
  status: ProjectStatus;
  date: string;
  featured?: boolean;
  figureLabel: string;
  image?: string;
  links?: {
    live?: string;
    source?: string;
    writeup?: string;
  };
};

export type GitHubProjectEntry = {
  slug: string;
  name: string;
  repoName: string;
  url: string;
  status: "shipped" | "in progress";
  description: string;
  stack: string[];
};

export type ResearchEntry = {
  id: string;
  title: string;
  shortName: string;
  /** The study's subject, set as a second, lighter line under the short name. */
  subtitle: string;
  domain: string;
  modality: string;
  /** One line: the question the study asked. `**word**` marks emphasis. */
  problem: string;
  /** What was done, one short line each. */
  methods: string[];
  /** The numbers that matter, shown big. */
  results: Array<{ value: string; label: string }>;
  /** One line: what it means. `**word**` marks emphasis. */
  conclusion: string;
  authors: string[];
  institution: string;
  date?: string;
  tags: string[];
  linkedinUrl: string;
};

export type AchievementEntry = {
  id: string;
  result: string;
  title: string;
  issuer: string;
  date: string;
  context: string;
  proofUrl?: string;
};

export const identity = {
  name: "Dexter Juevesano",
  wordmark: "dexterslab",
  headline: "Part storyteller, part systems thinker.",
  intro:
    "Computer science student at UP Cebu and DOST scholar. I play CTFs and I am exploring AI software development, cybersecurity and bioinformatics, learning by building things and breaking them to see how they work.",
  location: "Cebu, Philippines (UTC+8)",
  openTo: "Always happy to chat about new projects, internships, or anything you are building. Feel free to reach out.",
  resumeUrl: "", // Fill with "/resume.pdf" or external URL when ready.
} as const;

export const experience: ExperienceOrg[] = [
  {
    organisation: "UP Data Science Society",
    roles: [{ role: "Associate", start: "2026-09", end: "present", dateLabel: "Sep 2026 - present" }],
  },
  {
    organisation: "UP Cebu Storylab",
    roles: [
      { role: "Member", start: "2026-07", end: "present", dateLabel: "Jul 2026 - present" },
      { role: "Apprentice", start: "2026-02", end: "2026-06", dateLabel: "Feb 2026 - Jun 2026" },
    ],
  },
  {
    organisation: "Insight Philippines",
    roles: [{ role: "Layout Artist", start: "2026-02", end: "2026-09", dateLabel: "Feb 2026 - Sep 2026" }],
  },
  {
    organisation: "UP Computer Science Guild (UPCSG)",
    roles: [
      { role: "Block Representative", start: "2025-08", end: "2026-06", dateLabel: "Aug 2025 - Jun 2026" },
      { role: "Creative Associate", start: "2025-09", end: "2026-04", dateLabel: "Sep 2025 - Apr 2026" },
    ],
  },
];

export const education: EducationEntry[] = [
  {
    school: "University of the Philippines Cebu",
    program: "BS Computer Science · DOST scholar",
    batch: "Batch 2029",
  },
];

export const STACK_GROUPS: StackGroup[] = ["Languages", "Web", "Back end", "Tools", "Design"];

export const techStack: StackItem[] = [
  // Languages
  { id: "c", name: "C", group: "Languages" },
  { id: "cpp", name: "C++", group: "Languages" },
  { id: "csharp", name: "C#", group: "Languages" },
  { id: "haskell", name: "Haskell", group: "Languages" },
  { id: "python", name: "Python", group: "Languages" },
  { id: "javascript", name: "JavaScript", group: "Languages" },
  { id: "typescript", name: "TypeScript", group: "Languages" },
  { id: "html5", name: "HTML5", group: "Languages" },
  { id: "css3", name: "CSS3", group: "Languages" },
  // Web
  { id: "react", name: "React", group: "Web" },
  { id: "nextjs", name: "Next.js", group: "Web" },
  { id: "svelte", name: "Svelte", group: "Web" },
  { id: "blazor", name: "Blazor", group: "Web" },
  { id: "vite", name: "Vite", group: "Web" },
  { id: "tailwindcss", name: "Tailwind CSS", group: "Web" },
  { id: "zustand", name: "Zustand", group: "Web" },
  { id: "d3", name: "D3.js", group: "Web" },
  { id: "threejs", name: "Three.js", group: "Web" },
  { id: "maplibre", name: "MapLibre GL", group: "Web" },
  { id: "radix", name: "Radix UI", group: "Web" },
  { id: "canvas", name: "Canvas API", group: "Web" },
  // Back end
  { id: "nodejs", name: "Node.js", group: "Back end" },
  { id: "postgresql", name: "PostgreSQL", group: "Back end" },
  { id: "drizzle", name: "Drizzle ORM", group: "Back end" },
  { id: "supabase", name: "Supabase", group: "Back end" },
  { id: "fastapi", name: "FastAPI", group: "Back end" },
  { id: "redis", name: "Redis", group: "Back end" },
  // Tools
  { id: "docker", name: "Docker", group: "Tools" },
  { id: "mediapipe", name: "MediaPipe", group: "Tools" },
  { id: "vitest", name: "Vitest", group: "Tools" },
  { id: "godot", name: "Godot", group: "Tools" },
  { id: "wsl", name: "WSL", group: "Tools" },
  { id: "chimerax", name: "UCSF ChimeraX", group: "Tools" },
  { id: "audacity", name: "Audacity", group: "Tools" },
  // Design
  { id: "figma", name: "Figma", group: "Design" },
  { id: "photoshop", name: "Adobe Photoshop", group: "Design" },
  { id: "indesign", name: "Adobe InDesign", group: "Design" },
  { id: "illustrator", name: "Adobe Illustrator", group: "Design" },
  { id: "canva", name: "Canva", group: "Design" },
];

export const projects: ProjectEntry[] = [
  {
    slug: "dfctf",
    name: "dfCTF",
    tagline: "A CTF platform with server-checked flags and weekly leaderboards.",
    summary:
      "Capture-the-Flag platform with server-side flag verification, weekly Asia/Manila leaderboards, first-blood tracking, and staff authoring workflows.",
    problem:
      "Running campus and guild CTF practice rooms meant juggling heavy multi-container setups without integrated challenge review gates, write-up unlocks, or player telemetry.",
    built:
      "Next.js 16 modular monolith backed by PostgreSQL, Drizzle ORM, PGlite for zero-config local dev, and Better Auth with 2FA, submission cooldowns, post-solve explanations, and exportable player cards.",
    stack: ["Next.js", "React", "TypeScript", "PostgreSQL", "Drizzle ORM", "Tailwind CSS", "Docker"],
    result:
      "Delivers challenges across seven security categories with weekly and all-time leaderboards, timed competitions, and independent staff review.",
    status: "shipped",
    date: "2026",
    featured: true,
    figureLabel: "CTF Platform",
    image: "/projects/dfctf.png",
    links: {
      live: "https://dfctf.vercel.app",
      source: "https://github.com/Llenoxinn/dfCTF",
    },
  },
  {
    slug: "belaude",
    name: "BELaude",
    tagline: "Works out the semester GWA you need for UP Latin honors.",
    summary:
      "Client-side UP Latin honors roadmap planner that calculates the exact semester GWA needed to graduate Summa, Magna, or Cum Laude.",
    problem:
      "Standard GWA calculators only report past standing and leave students guessing what target grades are required across remaining semesters to reach Latin honors.",
    built:
      "100% client-side React 19 and TypeScript web app with built-in UP Cebu study plans, custom unit entry for other UP campuses, Vitest GWA math verification, and shareable roadmap cards.",
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Radix UI", "Vitest", "Python"],
    result:
      "Computes semester-by-semester target GWAs and honest reachability checks with zero data tracking in the browser.",
    status: "shipped",
    date: "2026",
    figureLabel: "UP GWA Planner",
    image: "/projects/belaude.png",
    links: {
      live: "https://belaude.vercel.app",
      source: "https://github.com/Llenoxinn/BELaude",
    },
  },
  {
    slug: "sylvi",
    name: "Sylvi",
    tagline: "True-to-size ID photo sheets for print shops, with automatic face cropping.",
    summary:
      "True-to-size ID photo layout and print-shop automation studio with client-side MediaPipe face cropping and 300 DPI print-sheet export.",
    problem:
      "Philippine print shops manually lay out 1x1, 2x2, and passport ID packages in Word, wasting time on alignment, crop marks, and paper sizing.",
    built:
      "Offline-ready React and TypeScript PWA using Google MediaPipe face detection for automatic ID framing, guillotine-trimmer straight-cut guides, 24-hour IndexedDB job history, and Supabase shop sync.",
    stack: ["TypeScript", "React", "Vite", "Tailwind CSS", "MediaPipe", "Supabase", "Zustand"],
    result:
      "Generates print-ready 300 DPI PDF, PNG, and JPG sheets in seconds with exact physical dimensions and crop marks.",
    status: "shipped",
    date: "2026",
    figureLabel: "ID Print Studio",
    links: {
      source: "https://github.com/Llenoxinn/Sylvi",
    },
  },
];

export const githubProjects: GitHubProjectEntry[] = [
  {
    slug: "viscal",
    name: "Viscal",
    repoName: "Llenoxinn/Viscal",
    url: "https://github.com/Llenoxinn/Viscal",
    status: "shipped",
    description:
      "Browser-based generative math and art playground featuring three real-time engines: Lissajous harmonic curves, procedural L-System branching fractals (Sierpinski, Koch, Dragon, Hilbert), and Gray-Scott reaction-diffusion chemical patterns with custom palettes and PNG export.",
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Canvas API"],
  },
  {
    slug: "olatz-tol",
    name: "olatz tol",
    repoName: "Llenoxinn/Olatz-tol",
    url: "https://github.com/Llenoxinn/Olatz-tol",
    status: "shipped",
    description:
      "Interactive Collatz conjecture (3n + 1) visualizer that traces how any positive integer falls to 1 across five inspection modes, including a step-by-step logarithmic path view, multi-number range heatmaps, and live stopping-time and peak statistics.",
    stack: ["JavaScript", "React", "Vite", "Tailwind CSS", "Zustand", "Vitest"],
  },
  {
    slug: "phytree",
    name: "Phylogenetic Tree Builder",
    repoName: "Llenoxinn/PhyTree",
    url: "https://github.com/Llenoxinn/PhyTree",
    status: "shipped",
    description:
      "Interactive bioinformatics tool that constructs and renders evolutionary phylogenetic trees step-by-step from sequence alignments using UPGMA and Neighbor-Joining hierarchical clustering algorithms.",
    stack: ["TypeScript", "React", "D3.js", "Vite", "Tailwind CSS", "Zustand"],
  },
  {
    slug: "voronoi-shatter",
    name: "Voronoi Shatter",
    repoName: "Llenoxinn/Voronoi-Shatter",
    url: "https://github.com/Llenoxinn/Voronoi-Shatter",
    status: "shipped",
    description:
      "Interactive computational geometry web experiment demonstrating dynamic Voronoi polygon tessellation, cell shattering, and real-time fracture physics in the browser.",
    stack: ["Svelte", "Vite", "Tailwind CSS", "JavaScript", "Canvas API"],
  },
  {
    slug: "protein-structure-viewer-lite",
    name: "Protein Structure Viewer Lite",
    repoName: "Llenoxinn/Protein-Structure-Viewer-Lite-",
    url: "https://github.com/Llenoxinn/Protein-Structure-Viewer-Lite-",
    status: "shipped",
    description:
      "Lightweight 3D macromolecular PDB structure viewer built on raw Three.js without external molecular viewer libraries. Supports RCSB PDB accession fetching, .pdb/.ent uploads, CPK/chain/residue palettes, backbone ribbon tubes, atom tooltips, and adaptive LOD.",
    stack: ["React", "Three.js", "JavaScript", "Vite", "Tailwind CSS"],
  },
  {
    slug: "jeepoi",
    name: "JeepOI",
    repoName: "Llenoxinn/JeepOI",
    url: "https://github.com/Llenoxinn/JeepOI",
    status: "in progress",
    description:
      "Offline-first Cebu traditional and modern jeepney transit planner. Uses a Python Overpass API and KMZ geospatial pipeline to compile structured GeoJSON routes paired with a MapLibre GL route explorer and Dijkstra fare and trip pathfinder.",
    stack: ["Python", "React", "TypeScript", "MapLibre GL", "Vite"],
  },
  {
    slug: "taptap",
    name: "Taptap",
    repoName: "Llenoxinn/Taptap",
    url: "https://github.com/Llenoxinn/Taptap",
    status: "in progress",
    description:
      "Rhythm and reflex interaction project currently under active repository scaffolding and early mechanics prototyping.",
    stack: ["TypeScript", "React", "Vite", "Tailwind CSS"],
  },
  {
    slug: "aight",
    name: "AIght",
    repoName: "Llenoxinn/AIGht",
    url: "https://github.com/Llenoxinn/AIGht",
    status: "in progress",
    description:
      "Document intelligence platform that turns complex documents into plain-English explanations, action checklists, and source-verified answers. Pairs a Blazor and Three.js 3D page-stack navigator with a Landlock/seccomp-sandboxed Python FastAPI ingestion pipeline and ClamAV scanning.",
    stack: ["C#", "Blazor", "Three.js", "Python", "FastAPI", "Redis", "Docker"],
  },
  {
    slug: "perk-the-star",
    name: "Perk the Star",
    repoName: "GeoCeff/perk-the-star",
    url: "https://github.com/GeoCeff/perk-the-star",
    status: "shipped",
    description:
      "Orbital tower defense game built in Godot 4.6 where rotating towers defend the Sun across a 12-wave campaign, Endless scaling modes, a No-Flare challenge, and a Tech XP unlock tree powered by C++ GDExtension native systems.",
    stack: ["Godot", "C++", "Python"],
  },
];

export const researchWorks: ResearchEntry[] = [
  {
    id: "admet-it-ficus-septica",
    shortName: "ADMET-IT",
    subtitle: "Ficus septica",
    domain: "Cheminformatics, Molecular Docking & Enzymatic Bioassay",
    modality: "In Silico & In Vitro",
    title:
      "ADMET-IT: In Silico Structural Analyses, Molecular Docking, Pharmacokinetic ADME-Tox Profiling of Bioactive Phytocompounds Against Diabetes-Related Enzymes, and In Vitro Evaluation of Cytotoxicity, and Alpha-Glucosidase Inhibitory Activity of Ficus septica Burm. f. leaf ethanolic and methanolic extracts",
    problem:
      "Diabetes is a major global health challenge. Can **Lagnub (Ficus septica)** leaves inhibit the enzymes behind it?",
    methods: [
      "Docked 9 phytocompounds against 2QV4, 3TOP and GSK-3β (AutoDock Vina)",
      "Predicted ADME-Tox with pkCSM and SwissADME",
      "Brine shrimp lethality assay for cytotoxicity",
      "In vitro α-glucosidase inhibition assay",
    ],
    results: [
      { value: "≈ Acarbose", label: "docked inhibitory potential, comparable to the reference drug" },
      { value: "β‑Sitosterol", label: "best predicted absorption and low toxicity risk" },
      { value: "139.74 / 480.79 ppm", label: "LC50, ethanolic / methanolic extract" },
    ],
    conclusion:
      "The **methanolic extract** inhibited α-glucosidase more strongly, dose-dependently. **Promising antidiabetic potential**; efficacy still needs further study.",
    authors: ["Baby Trisha S. Quimod", "Dexter S. Juevesano", "Johanna D. Cereño"],
    institution: "San Remigio National High School · San Remigio I, Cebu Province, Region VII",
    tags: [
      "Molecular Docking",
      "ADME-Tox Profiling",
      "Structural Bioinformatics",
      "Alpha-Glucosidase Assay",
      "Cytotoxicity Evaluation",
      "Phytochemistry",
    ],
    linkedinUrl: "https://www.linkedin.com/in/dsjuevesano/",
  },
  {
    id: "paspalum-conjugatum-smutans",
    shortName: "Paspalum conjugatum",
    subtitle: "Anti-quorum sensing",
    domain: "Phytochemistry, Oral Microbiology & Biofilm Attenuation",
    modality: "In Vitro",
    title:
      "Phytochemical Analysis, Antibacterial Activity, and Anti-Quorum Sensing Activity of Hilo Grass Stem and Leaves (Paspalum conjugatum) Extract against Streptococcus mutans (S. mutans)",
    problem:
      "**Streptococcus mutans** drives dental caries. Can **Hilo grass** stop its growth and its quorum sensing?",
    methods: [
      "Ethanolic and aqueous extracts, qualitative phytochemical screening",
      "Disc and agar well diffusion for antibacterial and anti-quorum-sensing activity",
      "MIC by resazurin broth dilution; MBC on nutrient agar",
    ],
    results: [
      { value: "11 vs 22.4", label: "inhibition zone, 100% extract vs streptomycin (3 trials)" },
      { value: "31.25 mg/mL", label: "minimum inhibitory concentration" },
      { value: "62.5 mg/mL", label: "minimum bactericidal concentration" },
    ],
    conclusion:
      "Weaker than streptomycin, but the extract **inhibited and killed S. mutans**, with **substantial quorum-sensing inhibition** at full strength.",
    authors: ["Dexter S. Juevesano", "Johanna D. Cereño", "Khrislyn Rhose T. Dungog", "Ma. Jhea F. Tudlasan"],
    institution: "San Remigio National High School · San Remigio, Cebu",
    date: "June 2023 · S.Y. 2022–2023",
    tags: [
      "Phytochemical Analysis",
      "Anti-Quorum Sensing",
      "Antibacterial Assay",
      "Streptococcus mutans",
      "Natural Products",
      "Biostatistics",
    ],
    linkedinUrl: "https://www.linkedin.com/in/dsjuevesano/",
  },
];

export const achievements: AchievementEntry[] = [
  {
    id: "hackforgov5-r7",
    result: "Top 2 Student Performer · National Wildcard Qualifier",
    title: "HackforGov5 Region 7",
    issuer: "Department of Information and Communications Technology (DICT) Region 7",
    date: "Oct 2026",
    context:
      "Competed across web exploitation, digital forensics, and reverse-engineering challenges in the regional cyber-defense qualifier.",
  },
  {
    id: "upcsg-mission-ctf",
    result: "Champion",
    title: "UPCSG Mission: CTF (Mini Capture the Flag)",
    issuer: "UP Computer Science Guild",
    date: "Sep 2026",
    context:
      "Cleared the highest-point challenges across web exploitation, cryptography, and OSINT to finish 1st overall.",
  },
];

/**
 * Computes a concise human-readable duration (e.g. "5 mos", "1 yr 2 mos") from YYYY-MM dates.
 */
export function formatDuration(start: string, end: string | "present", now = new Date()): string {
  const [sy, sm] = start.split("-").map(Number);
  const ey = end === "present" ? now.getFullYear() : Number(end.split("-")[0]);
  const em = end === "present" ? now.getMonth() + 1 : Number(end.split("-")[1]);
  const totalMonths = Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mo${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} yr${years === 1 ? "" : "s"}`;
  return `${years} yr${years === 1 ? "" : "s"} ${months} mo${months === 1 ? "" : "s"}`;
}

export type MethodPillar = {
  id: "ai" | "ctf" | "bio";
  label: string;
  tagline: string;
  deliverables: string[];
  steps: Array<{
    step: string;
    title: string;
    detail: string;
  }>;
};

export const methodPillars: MethodPillar[] = [
  {
    id: "ai",
    label: "AI Software Dev",
    tagline: "Practical AI tools with fast interfaces, clear failure modes, and zero black-box fluff.",
    deliverables: ["Structured LLM pipelines", "Interactive web apps", "Local-first study & dev tools"],
    steps: [
      {
        step: "01",
        title: "Hypothesis",
        detail: "Pin down the exact bottleneck: what takes too long manually and what output shape actually helps.",
      },
      {
        step: "02",
        title: "Prototype",
        detail: "Wire a minimal Next.js or Svelte + Python loop early so real data hits the UI on day one.",
      },
      {
        step: "03",
        title: "Break & Verify",
        detail: "Test edge cases, latency, and messy inputs; strip away any prompt or UI step that feels brittle.",
      },
      {
        step: "04",
        title: "Ship & Document",
        detail: "Deploy fast, measure real usage, and write down what worked and what broke.",
      },
    ],
  },
  {
    id: "ctf",
    label: "Cybersecurity & CTF",
    tagline: "Learning systems from the inside out by dissecting challenges, payloads, and edge cases.",
    deliverables: ["Web & crypto exploit scripts", "Forensics & OSINT workflows", "Reproducible CTF write-ups"],
    steps: [
      {
        step: "01",
        title: "Recon",
        detail: "Map the surface: headers, source, binaries, and assumptions before touching a payload.",
      },
      {
        step: "02",
        title: "Isolate",
        detail: "Reproduce the target behavior locally in WSL or a sandboxed container for rapid iteration.",
      },
      {
        step: "03",
        title: "Exploit",
        detail: "Script a clean, repeatable Python solve rather than one-off manual clicks.",
      },
      {
        step: "04",
        title: "Write-up",
        detail: "Archive the root cause, the fix, and the exact solve script so the team levels up.",
      },
    ],
  },
  {
    id: "bio",
    label: "Bioinformatics & Tooling",
    tagline: "Turning dense biological and scientific data into interactive, visualizable interfaces.",
    deliverables: ["Sequence & structure parsers", "D3.js visualizers", "Reproducible analysis scripts"],
    steps: [
      {
        step: "01",
        title: "Parse",
        detail: "Clean raw PDB, FASTA, or tabular datasets into typed, queryable structures.",
      },
      {
        step: "02",
        title: "Model",
        detail: "Compute distance matrices, motifs, or summary metrics in Python without bloated dependencies.",
      },
      {
        step: "03",
        title: "Visualize",
        detail: "Build responsive 2D/interactive views (D3.js / canvas) paired with UCSF ChimeraX checks.",
      },
      {
        step: "04",
        title: "Validate",
        detail: "Cross-check outputs against reference structures and document every assumption.",
      },
    ],
  },
];
