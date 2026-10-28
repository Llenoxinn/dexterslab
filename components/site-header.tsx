import { FlaskIcon, GitHubMark } from "@/components/icons";
import { site } from "@/lib/site";

// `home` keeps the Contact link a same-page anchor, so smooth scrolling handles it.
export function SiteHeader({ home = false }: { home?: boolean }) {
  return (
    <header className="site-header on-ink">
      <div className="wrap header-inner">
        <a className="brand" href="/">
          <FlaskIcon className="brand-mark" />
          <span className="wordmark">{site.wordmark}</span>
        </a>
        <nav aria-label="Primary" className="header-nav">
          <a className="icon-btn" href={site.github} aria-label="GitHub">
            <GitHubMark />
          </a>
          <a className="btn btn-solid" href={home ? "#contact" : "/#contact"}>
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
