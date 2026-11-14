"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskIcon, GitHubMark } from "@/components/icons";
import { site } from "@/lib/site";

const NAV_ITEMS = [
  { label: "About", hash: "#method" },
  { label: "Experience", hash: "#experience" },
  { label: "Projects", hash: "#projects" },
  { label: "GitHub", hash: "#github" },
  { label: "Research", hash: "#research" },
  { label: "Achievements", hash: "#achievements" },
];

export function SiteHeader({ home = false }: { home?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const media = matchMedia("(min-width: 1100px)");
    const onResize = () => { if (media.matches) setMenuOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className="site-header on-ink">
      <div className="wrap header-inner">
        <a className="brand" href="/">
          <FlaskIcon className="brand-mark" />
          <span className="wordmark">{site.wordmark}</span>
        </a>

        <nav aria-label="Primary" className="header-nav">
          <ul className="nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.hash}>
                <a className="nav-link" href={home ? item.hash : `/${item.hash}`}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn btn-ghost header-customize"
            aria-label="Customize lab workspace"
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new Event("lab:toggle-customizer"));
            }}
          >
            Lab UI
          </button>

          <a className="btn btn-solid header-resume" href={home ? "#contact" : "/#contact"}>
            Get in touch
          </a>

          <a className="icon-btn" href={site.github} aria-label="GitHub" target="_blank" rel="noreferrer">
            <GitHubMark />
          </a>

          <button
            ref={toggleRef}
            type="button"
            className="icon-btn nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="hamburger" aria-hidden="true">
              <span /><span />
            </span>
          </button>
        </nav>
      </div>

      <div id="mobile-nav" className="mobile-nav" hidden={!menuOpen}>
        <ul className="wrap mobile-nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.hash}>
              <a
                className="mobile-nav-link"
                href={home ? item.hash : `/${item.hash}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li className="mobile-nav-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new Event("lab:toggle-customizer"));
              }}
            >
              Customize Lab UI
            </button>
            <a
              className="btn btn-solid"
              href={home ? "#contact" : "/#contact"}
              onClick={() => setMenuOpen(false)}
            >
              Get in touch
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
