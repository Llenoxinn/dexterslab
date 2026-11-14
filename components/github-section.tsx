"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { StackIcon } from "@/components/stack-icons";
import { githubProjects, techStack } from "@/lib/content";
import { site } from "@/lib/site";

import { CONTRIBUTION_CACHE_KEY, contributionWeeks, parseContributions, readContributionCache, type ContribDay } from "@/lib/contributions";

const GITHUB_USER = "Llenoxinn";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STACK_ID_BY_NAME = new Map(techStack.map((item) => [item.name.toLowerCase(), item.id]));

export function GitHubSection() {
  const [days, setDays] = useState<ContribDay[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const [filter, setFilter] = useState<"all" | "shipped" | "in progress">("all");
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.14 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    try {
      const saved = readContributionCache(JSON.parse(localStorage.getItem(CONTRIBUTION_CACHE_KEY) || "null"));
      if (saved && attempt === 0) { setDays(saved); setLoadState("ready"); return; }
    } catch {}
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    setLoadState("loading");
    fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("GitHub is unavailable.");
        return response.json();
      })
      .then((data: unknown) => {
        const recent = parseContributions(data);
        if (controller.signal.aborted) return;
        setDays(recent);
        setLoadState("ready");
        try { localStorage.setItem(CONTRIBUTION_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), contributions: recent })); } catch {}
      })
      .catch(() => { if (!disposed) setLoadState("error"); })
      .finally(() => window.clearTimeout(timeout));
    let disposed = false;
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  const total = days.reduce((sum, day) => sum + day.count, 0);
  const weeks = useMemo(() => contributionWeeks(days), [days]);
  const inspectDay = (day: ContribDay) => {
    if (readoutRef.current) readoutRef.current.textContent = `${day.count} contributions on ${day.date}`;
  };

  const visibleProjects =
    filter === "all"
      ? githubProjects
      : githubProjects.filter((item) => item.status === filter);

  return (
    <section
      ref={sectionRef}
      id="github"
      className={`wrap lab-section ${inView ? "is-inview" : ""}`}
      aria-labelledby="github-title"
    >
      <div className="section-head">
        <div>
          <h2 id="github-title" className="section-title">
            More from GitHub
          </h2>
          <p className="section-intro">
            Daily commits, mathematical playgrounds, bioinformatics visualizers, and systems in progress on{" "}
            <a className="btn-inline-link" href={site.github} target="_blank" rel="noreferrer">
              @{GITHUB_USER}
            </a>
            .
          </p>
        </div>

        <div className="filter-pills" role="group" aria-label="Filter GitHub projects by status">
          <button
            type="button"
            className={`filter-pill ${filter === "all" ? "is-active" : ""}`}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All ({githubProjects.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === "shipped" ? "is-active" : ""}`}
            aria-pressed={filter === "shipped"}
            onClick={() => setFilter("shipped")}
          >
            Shipped
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === "in progress" ? "is-active" : ""}`}
            aria-pressed={filter === "in progress"}
            onClick={() => setFilter("in progress")}
          >
            Work in progress
          </button>
        </div>
      </div>

      <div className="gh-card" aria-busy={loadState === "loading"}>
        <div className="gh-card-head">
          <p className="gh-card-count" role="status">
            {loadState === "ready" ? `${total.toLocaleString("en-US")} contributions in the last ${days.length} days`
              : loadState === "loading" ? "Loading GitHub activity…" : "GitHub activity is unavailable"}
          </p>
          {loadState === "ready" && <p ref={readoutRef} className="gh-hover-readout">
            Hover or tap a cell to inspect
          </p>}
        </div>
        {loadState === "ready" ? <div className="gh-graph-scroll" role="group" aria-label="GitHub contributions. Use arrow keys to inspect days."
          onKeyDown={(event) => {
            const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0) return;
            const moves: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
              : event.key in moves ? Math.max(0, Math.min(buttons.length - 1, index + moves[event.key])) : null;
            if (next === null) return;
            event.preventDefault();
            buttons[index].tabIndex = -1;
            buttons[next].tabIndex = 0;
            buttons[next].focus({ preventScroll: true });
            buttons[next].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
          }}>
          <div className="gh-months" aria-hidden="true" style={{ "--week-count": weeks.length } as CSSProperties}>
            {weeks.map((week, index) => {
              const first = week.find((day) => day !== null);
              if (!first) return <span key={index} />;
              const date = new Date(`${first.date}T00:00:00Z`);
              return <span key={first.date}>{index === 0 || date.getUTCDate() <= 7 ? MONTHS[date.getUTCMonth()] : ""}</span>;
            })}
          </div>
          <div className="gh-grid" aria-label="Daily contributions" style={{ "--week-count": weeks.length } as CSSProperties}>
            {weeks.map((week, index) => <div key={index} className="gh-week">
              {week.map((day, row) => day ? <button
                key={day.date}
                type="button"
                className={`gh-cell gh-cell--${day.level}`}
                tabIndex={day === days[0] ? 0 : -1}
                title={`${day.count} contributions on ${day.date}`}
                aria-label={`${day.count} contributions on ${day.date}`}
                onMouseEnter={() => inspectDay(day)}
                onFocus={() => inspectDay(day)}
                onClick={() => inspectDay(day)}
              /> : <span key={`empty-${row}`} />)}
            </div>)}
          </div>
        </div> : loadState === "loading" ? <div className="gh-loading-grid" aria-hidden="true" /> : <div className="gh-unavailable">
          <p>The activity service could not be reached. My projects and repositories are still available below.</p>
          <button type="button" className="choice-chip" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
          <a className="btn-inline-link" href={site.github} target="_blank" rel="noreferrer">View on GitHub</a>
        </div>}
        <div className="gh-card-foot">
          <span className="gh-foot-note">{loadState === "ready" ? "Public GitHub contributions" : "No estimated activity is shown"}</span>
          {loadState === "ready" && <div className="gh-legend" aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => <span key={level} className={`gh-cell gh-cell--${level}`} />)}
            <span>More</span>
          </div>}
        </div>
      </div>

      <div className="gh-repos-block">
        <div className="gh-repos-head">
          <h3 className="gh-repos-title">Repositories &amp; Lab Experiments</h3>
          <a className="btn-inline-link" href={`${site.github}?tab=repositories`} target="_blank" rel="noreferrer">
            View all on GitHub
          </a>
        </div>

        <ul className="gh-showcase-grid">
          {visibleProjects.map((repo, ri) => (
            <li key={repo.slug} style={{ "--repo-idx": ri } as CSSProperties}>
              <a
                className="gh-repo-card gh-showcase-card"
                href={repo.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="gh-showcase-top">
                  <div className="gh-showcase-title-group">
                    <span className="gh-repo-name">
                      {repo.name}
                      <svg
                        className="gh-showcase-arrow"
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 10.5L10.5 3.5M10.5 3.5H4.75M10.5 3.5V9.25"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="gh-showcase-path">{repo.repoName}</span>
                  </div>
                  <span
                    className={`spec-status ${
                      repo.status === "in progress" ? "spec-status--in-progress" : "spec-status--shipped"
                    }`}
                  >
                    {repo.status === "in progress" ? "Work in progress" : "Shipped"}
                  </span>
                </div>

                <p className="gh-repo-desc">{repo.description}</p>

                <ul className="gh-showcase-stack" aria-label={`${repo.name} tech stack`}>
                  {repo.stack.map((tech, ci) => {
                    const iconId = STACK_ID_BY_NAME.get(tech.toLowerCase()) ?? tech.toLowerCase();
                    return (
                      <li
                        key={tech}
                        className="spec-chip spec-chip--icon"
                        style={{ "--chip-idx": ci } as CSSProperties}
                      >
                        <StackIcon id={iconId} />
                        <span>{tech}</span>
                      </li>
                    );
                  })}
                </ul>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
