import { ArrowUpIcon, BeakerIcon, FlaskIcon, TeslaIcon, TubesIcon } from "@/components/icons";
import { LabGame } from "@/components/lab-game";
import { site } from "@/lib/site";

const built = new Date();
const builtLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
}).format(built);

const FOOTER_SECTIONS = [
  { label: "About", hash: "#method" },
  { label: "Experience", hash: "#experience" },
  { label: "Projects", hash: "#projects" },
  { label: "GitHub", hash: "#github" },
  { label: "Research", hash: "#research" },
  { label: "Achievements", hash: "#achievements" },
  { label: "Contact", hash: "#contact" },
];

export function SiteFooter({ home = false }: { home?: boolean }) {
  return (
    <footer className="site-footer on-ink">
      {home && (
        <section id="footer-game" data-lab-arena className="footer-game" aria-label="Interactive lab runner game">
          <LabGame />
        </section>
      )}

      <div className="wrap footer-grid">
        <div className="footer-brand-col">
          <a className="brand footer-brand" href={home ? "#lab" : "/"}>
            <FlaskIcon className="brand-mark" />
            <span className="wordmark">{site.wordmark}</span>
          </a>
          <p className="footer-bio">
            Built and broken by {site.name}. {site.school} · DOST-SEI Scholar.
          </p>
          <p className="footer-loc">Cebu, Philippines (UTC+8)</p>
        </div>

        <nav className="footer-col" aria-label="Footer sections">
          <p className="footer-col-title">Sections</p>
          <ul className="footer-links">
            {FOOTER_SECTIONS.map((s) => (
              <li key={s.hash}>
                <a href={home ? s.hash : `/${s.hash}`}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <p className="footer-col-title">Elsewhere</p>
          <ul className="footer-links">
            <li>
              <a href={site.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </li>
            <li>
              <a href={site.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
            </li>
            <li>
              <a href={site.facebook} target="_blank" rel="noreferrer">
                Facebook ↗
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
          </ul>
        </div>
      </div>

      {!home && (
        <div className="wrap">
          <div data-bench className="bench" aria-hidden="true">
            <TeslaIcon className="bench-item" />
            <BeakerIcon className="bench-item" />
            <span className="bench-flask">
              <span className="bubble" />
              <span className="bubble" />
              <span className="bubble" />
              <FlaskIcon className="bench-item bench-item--lit" />
            </span>
            <TubesIcon className="bench-item" />
          </div>
        </div>
      )}

      <div className="wrap footer-bottom">
        <p>
          © {built.getFullYear()} {site.name} · Updated{" "}
          <time dateTime={built.toISOString()}>{builtLabel}</time>
        </p>
        <a className="btn btn-ghost footer-top-btn" href={home ? "#lab" : "/"}>
          <ArrowUpIcon className="btn-icon btn-icon--sm" />
          Back to top
        </a>
      </div>
    </footer>
  );
}
