"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import type { ResearchEntry } from "@/lib/content";
import { site } from "@/lib/site";

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
      const targetP = 0.14 + readingT * (0.90 - 0.14);
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: trackTop + targetP * scrollable, behavior: "smooth" });
    },
    [studies.length],
  );

  if (!studies.length) return null;

  const readingT = Math.min(0.999, Math.max(0, (progress - 0.14) / (0.90 - 0.14)));
  const activeIndex = Math.min(studies.length - 1, Math.floor(readingT * studies.length));
  const modalIndex = readingIndex ?? activeIndex;
  const modalStudy = studies[modalIndex] ?? studies[0];

  const manuscript = (entry: ResearchEntry, titleId: string, index: number) => (
    <article className="research-manuscript">
      <header className="research-manuscript-head">
        <p className="research-manuscript-domain">{entry.domain}</p>
        <h3 id={titleId}>{entry.title}</h3>
        <div className="research-manuscript-byline">
          <span>{site.name}</span>
          <span aria-hidden="true">·</span>
          <span>University of the Philippines Cebu</span>
          <span aria-hidden="true">·</span>
          <span>{entry.modality}</span>
        </div>
      </header>

      <div className="research-manuscript-columns">
        <div className="research-manuscript-aside">
          <section className="research-abstract">
            <h4>Overview</h4>
            <p>{entry.summary}</p>
          </section>
          <section className="research-keywords-block" aria-label="Keywords">
            <h4>Keywords</h4>
            <p className="research-keywords-list">{entry.tags.join(" · ")}</p>
          </section>
        </div>

        <div className="research-manuscript-main">
          {entry.highlights.map((highlight) => (
            <section key={highlight.heading} className="research-highlight-item">
              <h4>{highlight.heading}</h4>
              <p>{highlight.detail}</p>
            </section>
          ))}
        </div>
      </div>
      <span className="sr-only">Study {index + 1} of {studies.length}</span>
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
              <nav className="research-study-tabs" aria-label="Jump to research study">
                {studies.map((paper, index) => (
                  <button
                    key={paper.id}
                    type="button"
                    aria-pressed={activeIndex === index}
                    className={activeIndex === index ? "is-selected" : ""}
                    onClick={() => scrollToStudy(index)}
                  >
                    {paper.shortName}
                  </button>
                ))}
              </nav>

              <span className="research-hud-divider" aria-hidden="true" />

              <div className="research-hud-progress" aria-label={`Study ${activeIndex + 1} of ${studies.length}`}>
                <span role="status">
                  {activeIndex + 1}/{studies.length}
                </span>
                <div className="research-scroll-meter" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
              </div>

              <span className="research-hud-divider" aria-hidden="true" />

              <button
                type="button"
                className="research-read-button"
                onClick={() => setReadingIndex(activeIndex)}
              >
                Read manuscript
              </button>
            </div>
            <p className="research-desk-hint">Scroll to open and turn pages · Click the book to read</p>
          </div>
        )}
      </div>

      {readingIndex !== null && (
        <Modal
          className="research-reader-backdrop"
          labelledBy="research-manuscript-title"
          onClose={() => setReadingIndex(null)}
        >
          <div className="research-reader-shell">
            <div className="research-reader-topbar">
              <span className="research-reader-counter">
                Research Monograph · Study 0{modalIndex + 1} / 0{studies.length}
              </span>
              <button
                type="button"
                className="research-reader-close"
                onClick={() => setReadingIndex(null)}
                aria-label="Close research paper"
              >
                Close ×
              </button>
            </div>
            <div className="research-reader-body">
              {manuscript(modalStudy, "research-manuscript-title", modalIndex)}
            </div>
            <nav className="research-reader-pagination" aria-label="Read another study">
              <button
                type="button"
                onClick={() => setReadingIndex((modalIndex + studies.length - 1) % studies.length)}
              >
                ← Previous study
              </button>
              <span>
                {modalIndex + 1} / {studies.length}
              </span>
              <button
                type="button"
                onClick={() => setReadingIndex((modalIndex + 1) % studies.length)}
              >
                Next study →
              </button>
            </nav>
          </div>
        </Modal>
      )}
    </div>
  );
}
