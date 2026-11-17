"use client";

import { useEffect, useRef, useState } from "react";
import { GitHubMark } from "@/components/icons";
import { LogoMark } from "@/components/logo-mark";
import { NAV_ICONS } from "@/components/nav-icons";
import { site } from "@/lib/site";

const STATIONS = [
  { label: "About", hash: "#method", icon: NAV_ICONS.about },
  { label: "Experience", hash: "#experience", icon: NAV_ICONS.experience },
  { label: "Projects", hash: "#projects", icon: NAV_ICONS.projects },
  { label: "GitHub", hash: "#github", icon: NAV_ICONS.github },
  { label: "Research", hash: "#research", icon: NAV_ICONS.research },
  { label: "Achievements", hash: "#achievements", icon: NAV_ICONS.achievements },
];

/**
 * Navigation as part of the lab: the sections are stops on a pneumatic tube down the left edge, and a
 * canister rides the tube to the one you are reading. The logo and the actions float in the top
 * corners instead of sitting in a bar. Small screens get the stops as a full-screen menu.
 */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [scrolled, setScrolled] = useState(false);
  const railRef = useRef<HTMLOListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const href = (hash: string) => (home ? hash : `/${hash}`);

  // PageMotion marks the section in view with aria-current; the canister follows it.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const read = () => setCurrent([...rail.querySelectorAll("a")].findIndex((a) => a.getAttribute("aria-current") === "location"));
    const observer = new MutationObserver(read);
    observer.observe(rail, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    read();
    return () => observer.disconnect();
  }, []);

  // Past the first screen only the mark stays in the corner; the wordmark would sit over the copy.
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const media = matchMedia("(min-width: 1100px)");
    const onResize = () => {
      if (media.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onResize);
    document.documentElement.classList.add("menu-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
      document.documentElement.classList.remove("menu-open");
    };
  }, [menuOpen]);

  const openCustomizer = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event("lab:toggle-customizer"));
  };

  return (
    <header className={`lab-nav ${menuOpen ? "is-open" : ""}`} data-scrolled={scrolled ? "" : undefined}>
      <a className="lab-nav-brand" href="/">
        <LogoMark className="lab-nav-mark" />
        <span className="lab-nav-wordmark">{site.wordmark}</span>
      </a>

      <div className="lab-nav-actions">
        <a className="lab-nav-icon" href={site.github} aria-label="GitHub" target="_blank" rel="noreferrer">
          <GitHubMark />
        </a>
        <button type="button" className="lab-nav-text" aria-haspopup="dialog" onClick={openCustomizer}>
          Lab UI
        </button>
        <a className="lab-nav-cta" href={href("#contact")}>
          Get in touch
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="lab-nav-icon lab-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="lab-menu"
          aria-label={menuOpen ? "Close the menu" : "Open the menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="hamburger" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      <nav className="lab-rail" aria-label="Sections">
        <span className="lab-rail-tube" aria-hidden="true" />
        <span
          className="lab-rail-canister"
          aria-hidden="true"
          data-hidden={current < 0 ? "" : undefined}
          style={{ transform: `translateY(calc(${Math.max(0, current)} * var(--stop)))` }}
        />
        <ol ref={railRef} className="lab-rail-stops">
          {STATIONS.map((station) => (
            <li key={station.hash}>
              <a className="lab-rail-stop" href={href(station.hash)} aria-label={station.label}>
                {station.icon}
                <span className="lab-rail-label" aria-hidden="true">
                  {station.label}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div id="lab-menu" className="lab-menu on-ink" hidden={!menuOpen}>
        <ol className="lab-menu-list">
          {STATIONS.map((station) => (
            <li key={station.hash}>
              <a className="lab-menu-link" href={href(station.hash)} onClick={() => setMenuOpen(false)}>
                {station.icon}
                {station.label}
              </a>
            </li>
          ))}
        </ol>
        <div className="lab-menu-actions">
          <button type="button" className="lab-nav-text" onClick={openCustomizer}>
            Customize the lab
          </button>
          <a className="lab-nav-icon" href={site.github} aria-label="GitHub" target="_blank" rel="noreferrer">
            <GitHubMark />
          </a>
        </div>
      </div>
    </header>
  );
}
