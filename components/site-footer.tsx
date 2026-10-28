import { ArrowUpIcon, BeakerIcon, FlaskIcon, TeslaIcon, TubesIcon } from "@/components/icons";
import { site } from "@/lib/site";

// Rendered at build time, so "Updated" is always the real deploy date.
const built = new Date();
const builtLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
}).format(built);

// `home` keeps "Back to the lab" a same-page anchor, so smooth scrolling handles it.
export function SiteFooter({ home = false }: { home?: boolean }) {
  return (
    <footer className="site-footer on-ink rails">
      <div className="wrap footer-top">
        <div className="footer-credit">
          <p>Built and broken by {site.name}.</p>
          <p>{site.school}</p>
        </div>
        <a className="btn btn-ghost" href={home ? "#lab" : "/"}>
          <ArrowUpIcon className="btn-icon btn-icon--sm" />
          Back to the lab
        </a>
      </div>

      {/* The lab bench stands on the name, which closes the page at full width. */}
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
        <p className="footer-giant" aria-hidden="true">
          {site.wordmark}
        </p>
      </div>

      <div className="wrap footer-bottom">
        <p>
          © {built.getFullYear()} {site.name}
        </p>
        <p>
          Updated <time dateTime={built.toISOString()}>{builtLabel}</time>
        </p>
      </div>
    </footer>
  );
}
