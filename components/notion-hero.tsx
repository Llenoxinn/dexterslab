"use client";

import { useEffect, useState } from "react";
import { FlaskIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { achievements, experience, identity, projects } from "@/lib/content";
import { site } from "@/lib/site";

// The /dev/dexter window is a tiny shell: each entry is a "file" you can open with its number key.
const VIEWS = [
  { id: "whoami", command: "cat whoami", href: "#method", count: null },
  { id: "projects", command: "ls projects/", href: "#projects", count: projects.length },
  { id: "experience", command: "ls experience/", href: "#experience", count: experience.length },
  { id: "achievements", command: "ls achievements/", href: "#achievements", count: achievements.length },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const LINKS = [
  { label: "Email", value: site.email, href: `mailto:${site.email}` },
  { label: "GitHub", value: site.github.replace("https://", ""), href: site.github },
  { label: "LinkedIn", value: site.linkedin.replace("https://www.", "").replace(/\/$/, ""), href: site.linkedin },
] as const;

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const manilaTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" });

/** Cebu's time, ticking each minute. Rendered only after mount so server and client agree. */
function ManilaClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(manilaTime.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return <time className="hero-corner-time">{now ?? "--:--"} PHT</time>;
}

export function NotionHero() {
  const [view, setView] = useState<ViewId>("whoami");
  const [zoomed, setZoomed] = useState(false);

  // The big red button on the desk in the lab opens the same terminal.
  useEffect(() => {
    const open = () => setZoomed(true);
    window.addEventListener("lab:open-terminal", open);
    return () => window.removeEventListener("lab:open-terminal", open);
  }, []);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const picked = VIEWS[Number(e.key) - 1];
      if (picked && !e.metaKey && !e.ctrlKey && !e.altKey) setView(picked.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const close = () => setZoomed(false);

  return (
    <div className={`hero-3d-shell ${zoomed ? "is-zoomed" : ""}`}>
      {/* The lab itself is drawn behind the page by LabWorld; this is only the copy on top of it. */}
      <div className="wrap hero-3d-hud">
        <div className="hero-3d-top">
          {/* Quiet corner annotations, like a drawing sheet: who and where, with Cebu's live time. */}
          <p className="hero-corner-kicker" aria-hidden="true">
            <span>Student developer</span>
            <span>Cebu, Philippines · <ManilaClock /></span>
          </p>
          <div className="hero-3d-intro">
            <h1 className="ndev-title">/dev/dexter</h1>
            <p className="ndev-subtitle">
              Computer science at UP Cebu. Building web tools, solving CTFs, and visualizing biological data.
            </p>
            <div className="hero-split-ctas">
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => setZoomed(true)}
              >
                Open /dev/dexter
              </button>
              <a className="btn btn-ghost" href="#projects">
                View projects
              </a>
            </div>
          </div>
        </div>

      </div>

      {zoomed && (
        <Modal className="crt-zoom-overlay on-ink" label="/dev/dexter" onClose={close}>
          <div className="crt-zoom-shell">
            <div className="ndev-window crt-zoom-window dev-window">
              <div className="crt-os-titlebar">
                <div className="crt-os-title-left">
                  <FlaskIcon className="ndev-win-icon" />
                  <span className="crt-os-title">/dev/dexter</span>
                </div>
                <button type="button" className="crt-zoom-back" onClick={close}>
                  Back to the lab <kbd>Esc</kbd>
                </button>
              </div>

              <div className="crt-os-body">
                <nav className="dev-nav" aria-label="/dev/dexter files">
                  {VIEWS.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`dev-nav-btn ${view === v.id ? "is-active" : ""}`}
                      aria-current={view === v.id ? "page" : undefined}
                      onClick={() => setView(v.id)}
                    >
                      <kbd>{i + 1}</kbd>
                      <span>{v.id}</span>
                      {v.count !== null && <span className="dev-nav-count">{v.count}</span>}
                    </button>
                  ))}
                </nav>

                <div className="dev-main">
                  <div className="dev-prompt-row">
                    <p className="dev-prompt">
                      <span className="dev-prompt-user">dexter@lab</span>
                      <span aria-hidden="true">:~$ </span>
                      <span className="dev-prompt-cmd">{active.command}</span>
                    </p>
                    <a className="dev-jump" href={active.href} onClick={close}>
                      Go to section
                    </a>
                  </div>

                  {view === "whoami" && (
                    <div className="dev-whoami">
                      <p className="dev-whoami-lead">{identity.intro}</p>
                      <dl className="dev-facts">
                        <div>
                          <dt>Studying</dt>
                          <dd>{site.school}</dd>
                        </div>
                        <div>
                          <dt>Based in</dt>
                          <dd>{identity.location}</dd>
                        </div>
                        {LINKS.map((link) => (
                          <div key={link.label}>
                            <dt>{link.label}</dt>
                            <dd>
                              <a
                                href={link.href}
                                target={link.href.startsWith("http") ? "_blank" : undefined}
                                rel="noreferrer"
                              >
                                {link.value}
                              </a>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {view === "projects" && (
                    <ul className="dev-list">
                      {projects.map((p) => (
                        <li key={p.slug}>
                          <a className="dev-row" href="#projects" onClick={close}>
                            <span className="dev-row-main">
                              <span className="dev-row-name">{p.name}</span>
                              <span className="dev-row-sub">{p.tagline}</span>
                            </span>
                            <span className="dev-row-meta">
                              <span>{sentence(p.status)}</span>
                              <span>{p.stack.slice(0, 3).join(", ")}</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {view === "experience" && (
                    <ul className="dev-list">
                      {experience.map((org) => (
                        <li key={org.organisation}>
                          <a className="dev-row" href="#experience" onClick={close}>
                            <span className="dev-row-main">
                              <span className="dev-row-name">{org.organisation}</span>
                              <span className="dev-row-sub">{org.roles.map((r) => r.role).join(", ")}</span>
                            </span>
                            <span className="dev-row-meta">
                              <span>{org.roles.some((r) => r.end === "present") ? "Current" : "Past"}</span>
                              <span>{org.roles[0].dateLabel}</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {view === "achievements" && (
                    <ul className="dev-list">
                      {achievements.map((a) => (
                        <li key={a.id}>
                          <a className="dev-row" href="#achievements" onClick={close}>
                            <span className="dev-row-main">
                              <span className="dev-row-name">{a.title}</span>
                              <span className="dev-row-sub">{a.issuer}</span>
                            </span>
                            <span className="dev-row-meta">
                              <span>{a.result.split(" · ")[0]}</span>
                              <span>{a.date}</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
