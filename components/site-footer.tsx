import { BeakerIcon, FlaskIcon, TeslaIcon, TubesIcon } from "@/components/icons";
import { site } from "@/lib/site";

// Rendered at build time, so "Updated" is always the real deploy date.
const built = new Date();
const builtLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
}).format(built);

export function SiteFooter() {
  return (
    <footer className="site-footer on-ink rails">
      <div className="wrap footer-top">
        <div className="footer-brand">
          <a className="brand" href="/">
            <FlaskIcon className="brand-mark" />
            <span className="wordmark">{site.wordmark}</span>
          </a>
          <p>Built and broken by {site.name}.</p>
          <p>{site.school}</p>
        </div>
      </div>

      {/* The lab bench: decorative pixel equipment. Bubbles rise twice when it scrolls into view. */}
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
