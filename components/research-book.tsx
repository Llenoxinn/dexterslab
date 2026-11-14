"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import type { ResearchEntry } from "@/lib/content";
import { site } from "@/lib/site";

// Keep in sync with FLIP_MID in research-desk-canvas.tsx (not imported to keep three.js out of this chunk).
const FLIP_MID = 0.225;

const ResearchDeskCanvas = dynamic(
  () => import("@/components/research-desk-canvas").then((module) => module.ResearchDeskCanvas),
  { ssr: false },
);

export function ResearchBook({ studies }: { studies: ResearchEntry[] }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px" },
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const scrollable = track.offsetHeight - window.innerHeight;
      const next = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      setProgress((prev) => (Math.abs(prev - next) > 0.0005 ? next : prev));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToStudy = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const scrollable = track.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const clamped = Math.max(0, Math.min(studies.length - 1, index));
      const readingT = (clamped + 0.35) / Math.max(1, studies.length);
      const targetP = 0.14 + readingT * (0.94 - 0.14);
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: trackTop + targetP * scrollable, behavior: "smooth" });
    },
    [studies.length],
  );

  if (!studies.length) return null;

  const readingT = Math.min(0.999, Math.max(0, (progress - 0.14) / (0.94 - 0.14)));
  const activeIndex = Math.min(studies.length - 1, Math.floor(readingT * studies.length + FLIP_MID));
  const modalIndex = readingIndex ?? activeIndex;
  const modalStudy = studies[modalIndex] ?? studies[0];

  const manuscript = (entry: ResearchEntry, titleId: string, index: number) => (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-domain">{entry.domain}</p>
        <h3 id={titleId} className="paper-title">
          {entry.shortName}
        </h3>
      </header>

      <p className="paper-summary">{entry.summary}</p>

      <div className="paper-findings">
        {entry.highlights.map((highlight) => (
          <section key={highlight.heading}>
            <h4>{highlight.heading}</h4>
            <p>{highlight.detail}</p>
          </section>
        ))}
      </div>

      <dl className="paper-facts">
        <div>
          <dt>Approach</dt>
          <dd>{entry.modality}</dd>
        </div>
        <div>
          <dt>Keywords</dt>
          <dd>{entry.tags.join(", ")}</dd>
        </div>
        <div className="paper-facts-wide">
          <dt>Full title</dt>
          <dd>{entry.title}</dd>
        </div>
      </dl>
      <span className="sr-only">
        Study {index + 1} of {studies.length}
      </span>
    </article>
  );

  const trackHeight = `${100 + studies.length * 105}vh`;

  return (
    <div
      ref={trackRef}
      className="research-scroll-track"
      style={unsupported ? undefined : { minHeight: trackHeight }}
    >
      <div className={unsupported ? "research-sticky-stage is-static" : "research-sticky-stage"}>
        <div className="wrap research-scene-heading">
          <h2 id="research-title" className="section-title">
            Scientific &amp; Computational Research
          </h2>
          <p>Molecular docking, computational pharmacology, and natural product bioassays.</p>
        </div>

        {active && !unsupported && (
          <ResearchDeskCanvas
            studies={studies}
            progress={progress}
            onRead={(idx) => setReadingIndex(idx)}
            onReady={() => setReady(true)}
            onUnsupported={() => {
              setUnsupported(true);
              setReady(true);
            }}
          />
        )}

        {!ready && (
          <div className="research-desk-loading" role="status">
            <span aria-hidden="true" />
            Preparing the 3D monograph…
          </div>
        )}

        {unsupported && (
          <div className="research-desk-fallback">{manuscript(studies[activeIndex], "research-fallback-title", activeIndex)}</div>
        )}

        {!unsupported && (
          <div className="wrap research-desk-hud">
            <div className="research-hud-dock">
              <div className="research-hud-now">
                <span className="research-hud-entry">
                  {activeIndex + 1} of {studies.length}
                </span>
                <span className="research-hud-title" aria-live="polite">
                  {studies[activeIndex].shortName}
                </span>
              </div>

              <nav className="research-hud-jump" aria-label="Change study">
                <button
                  type="button"
                  className="research-hud-arrow"
                  aria-label="Previous study"
                  disabled={activeIndex === 0}
                  onClick={() => scrollToStudy(activeIndex - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="research-hud-arrow"
                  aria-label="Next study"
                  disabled={activeIndex === studies.length - 1}
                  onClick={() => scrollToStudy(activeIndex + 1)}
                >
                  ›
                </button>
              </nav>

              <button type="button" className="research-read-button" onClick={() => setReadingIndex(activeIndex)}>
                Read study
              </button>
            </div>
            <p className="research-desk-hint">Scroll to turn the page, or click the notebook to read it.</p>
          </div>
        )}
      </div>

      {readingIndex !== null && (
        <Modal
          className="research-reader-backdrop"
          labelledBy="research-manuscript-title"
          onClose={() => setReadingIndex(null)}
        >
          <div
            className="research-reader-shell"
            onKeyDown={(event) => {
              // Arrow keys move between studies.
              if (event.key === "ArrowRight" && modalIndex < studies.length - 1) setReadingIndex(modalIndex + 1);
              if (event.key === "ArrowLeft" && modalIndex > 0) setReadingIndex(modalIndex - 1);
            }}
          >
            <div className="research-reader-topbar">
              <span className="research-reader-counter">
                Study {modalIndex + 1} of {studies.length}
              </span>
              <button
                type="button"
                className="research-reader-close"
                onClick={() => setReadingIndex(null)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="research-reader-body" key={modalStudy.id}>
              {manuscript(modalStudy, "research-manuscript-title", modalIndex)}
            </div>
            {studies.length > 1 && (
              <nav className="research-reader-pagination" aria-label="Other studies">
                {modalIndex > 0 && (
                  <button type="button" onClick={() => setReadingIndex(modalIndex - 1)}>
                    <span aria-hidden="true">←</span> {studies[modalIndex - 1].shortName}
                  </button>
                )}
                {modalIndex < studies.length - 1 && (
                  <button type="button" className="is-next" onClick={() => setReadingIndex(modalIndex + 1)}>
                    {studies[modalIndex + 1].shortName} <span aria-hidden="true">→</span>
                  </button>
                )}
              </nav>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
