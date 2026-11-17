import type { CSSProperties } from "react";
import { BeakerIcon, BoltIcon, FlaskIcon, TubesIcon } from "@/components/icons";
import { StackIcon } from "@/components/stack-icons";
import { techStack } from "@/lib/content";
import { site } from "@/lib/site";

const STACK_ID_BY_NAME = new Map(techStack.map((item) => [item.name.toLowerCase(), item.id]));
const SKILL_ICON_ALIASES: Record<string, string> = {
  "react 19": "react",
  "next.js 16": "nextjs",
  "godot 4": "godot",
  indesign: "indesign",
  illustrator: "illustrator",
  photoshop: "photoshop",
};

function resolveSkillIconId(tag: string): string | null {
  const key = tag.toLowerCase();
  return STACK_ID_BY_NAME.get(key) ?? SKILL_ICON_ALIASES[key] ?? null;
}

const FOCUS = [
  {
    Icon: FlaskIcon,
    title: "AI and web tooling",
    text: "Full-stack platforms, structured LLM pipelines, and client-side study tools built to stay fast every day.",
  },
  {
    Icon: BoltIcon,
    title: "CTF and security",
    text: "Web exploitation, cryptography, forensics, and OSINT in regional competitions, backed by custom CTF infrastructure.",
  },
  {
    Icon: TubesIcon,
    title: "Bioinformatics",
    text: "Phylogenetic trees, 3D macromolecular PDB viewers, and in silico molecular docking & ADME-Tox screening.",
  },
  {
    Icon: BeakerIcon,
    title: "Design and org work",
    text: "Editorial layout systems, publication design, and creative direction for UP Cebu student organizations.",
  },
] as const;

const FACTS = [
  { label: "Email", value: site.email, href: `mailto:${site.email}` },
  { label: "Based in", value: "Cebu, Philippines (UTC+8)" },
  { label: "Scholarship", value: "DOST-SEI Merit Scholar" },
  { label: "Open to", value: "Internships, research & CTF teams" },
] as const;

const SKILL_GROUPS = [
  {
    title: "AI & Back End",
    skills: [
      { name: "Full-stack & data systems", tags: ["PostgreSQL", "Drizzle ORM", "Supabase", "Docker"] },
      { name: "AI & vision pipelines", tags: ["MediaPipe", "FastAPI", "Python", "Redis"] },
      { name: "Agentic & LLM workflows", tags: ["Structured output", "RAG", "Sandboxed ingestion"] },
    ],
  },
  {
    title: "Front End & Graphics",
    skills: [
      { name: "Web applications", tags: ["React 19", "Next.js 16", "TypeScript", "Svelte", "Vite"] },
      { name: "Styling & interaction", tags: ["Tailwind CSS", "Radix UI", "Zustand", "Motion"] },
      { name: "3D, canvas & geospatial", tags: ["Three.js", "Canvas API", "MapLibre GL", "Godot 4"] },
    ],
  },
  {
    title: "Cybersecurity & CTF",
    skills: [
      { name: "Web exploitation & auth", tags: ["Injection", "Auth flows", "2FA", "Server verification"] },
      { name: "OSINT & digital forensics", tags: ["Recon", "Metadata", "File carving", "Steganography"] },
      { name: "Cryptography", tags: ["Classical ciphers", "RSA", "Custom encodings"] },
      { name: "Reverse engineering", tags: ["Ghidra", "Binary inspection", "WSL"] },
    ],
  },
  {
    title: "Science & Design",
    skills: [
      { name: "Computational biology", tags: ["Molecular docking", "ADME-Tox", "PDB parsing", "UCSF ChimeraX"] },
      { name: "Scientific visualization", tags: ["D3.js", "Phylogenetics", "Reaction-diffusion"] },
      { name: "Interface & editorial design", tags: ["Figma", "InDesign", "Illustrator", "Photoshop"] },
    ],
  },
] as const;

export function MethodSection() {
  return (
    <section id="method" aria-labelledby="method-heading" className="wrap lab-section method-section">
      <div className="section-head">
        <div>
          <h2 id="method-heading" className="section-title">
            Systems, security and scientific code
          </h2>
          <p className="section-intro">
            Building fast web software, dissecting systems in CTFs, and turning complex data into clear interfaces.
          </p>
        </div>
      </div>

      <div className="about-top">
          <div className="about-story">
            <p>
              I study <strong>Computer Science at UP Cebu</strong> as a <strong>DOST-SEI scholar</strong>, and I like
              the places where software, security and science overlap.
            </p>
            <p>
              Some weeks that means a study tool built on a local model, some weeks a CTF weekend, and some weeks a
              protein structure that needs a better picture.
            </p>
          </div>

          <ul className="about-focus">
            {FOCUS.map(({ Icon, title, text }) => (
              <li key={title} className="about-focus-item">
                <h3 className="about-focus-title">
                  <Icon className="about-focus-icon" />
                  {title}
                </h3>
                <p className="about-focus-text">{text}</p>
              </li>
            ))}
          </ul>

      </div>

          <dl className="about-quick">
            {FACTS.map((fact) => (
              <div key={fact.label} className="about-quick-item">
                <dt>{fact.label}</dt>
                <dd>{"href" in fact ? <a href={fact.href}>{fact.value}</a> : fact.value}</dd>
              </div>
            ))}
          </dl>

        <div className="about-skills">
          <h3 className="about-skills-heading">Core skills</h3>

          <div className="skill-groups">
          {/* Closed, each group is one scannable line; open, every skill shows its tools. */}
          {SKILL_GROUPS.map((group) => (
            <details key={group.title} className="skill-group">
              <summary className="skill-group-summary">
                <h4 className="skill-group-title">{group.title}</h4>
                <span className="skill-group-gist">{group.skills.map((skill) => skill.name).join(", ")}</span>
                <span className="skill-group-mark" aria-hidden="true" />
              </summary>
              <ul className="skill-list">
                {group.skills.map((skill, i) => (
                  // --i and --j stagger the rows and their tools as the group opens (see .skill-group[open]).
                  <li key={skill.name} className="skill-row" style={{ "--i": i } as CSSProperties}>
                    <div className="skill-row-head">
                      <span className="skill-name">{skill.name}</span>
                    </div>
                    <ul className="skill-tags" aria-label={`${skill.name} tools`}>
                      {skill.tags.map((tag, j) => {
                        const iconId = resolveSkillIconId(tag);
                        return (
                          <li key={tag} className={iconId ? "spec-chip spec-chip--icon" : undefined} style={{ "--j": j } as CSSProperties}>
                            {iconId && <StackIcon id={iconId} />}
                            <span>{tag}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          </div>
        </div>
    </section>
  );
}
