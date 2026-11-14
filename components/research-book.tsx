"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import type { ResearchEntry } from "@/lib/content";
import type { ResearchDeskApi } from "@/components/research-desk-canvas";
import { site } from "@/lib/site";

const ResearchDeskCanvas = dynamic(() => import("@/components/research-desk-canvas").then((module) => module.ResearchDeskCanvas), { ssr: false });

export function ResearchBook({ studies }: { studies: ResearchEntry[] }) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const api = useRef<ResearchDeskApi | null>(null);
  const study = studies[selected];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); observer.disconnect(); }
    }, { rootMargin: "400px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  if (!study) return null;
  const select = (index: number) => { setSelected(index); setOpen(true); };

  const manuscript = (titleId: string) => <article className="research-manuscript">
    <p className="research-manuscript-imprint">Computational &amp; Experimental Biology</p>
    <h3 id={titleId}>{study.title}</h3>
    <p className="research-manuscript-author">{site.name}</p>
    <p className="research-manuscript-affiliation">University of the Philippines Cebu</p>
    <section className="research-abstract"><h4>Abstract <span>Placeholder</span></h4>
      <p>Abstract to be provided. This space is reserved for the research question, methodology, principal findings, and conclusions.</p>
    </section>
    <p className="research-manuscript-keywords"><strong>Keywords:</strong> {study.tags.join("; ")}</p>
    <section><h4>Study overview</h4><p>{study.summary}</p></section>
    {study.highlights.map((highlight) => <section key={highlight.heading}><h4>{highlight.heading}</h4><p>{highlight.detail}</p></section>)}
  </article>;

  return (
    <div ref={rootRef} className="research-desk-experience">
      {active && !unsupported && <ResearchDeskCanvas study={study} open={open} api={api}
        onOpen={() => setOpen(true)} onRead={() => setReading(true)}
        onReady={() => setReady(true)} onUnsupported={() => { setUnsupported(true); setReady(true); }} />}
      {!ready && <div className="research-desk-loading" role="status"><span aria-hidden="true" />Preparing the reading desk…</div>}
      {unsupported && <div className="research-desk-fallback">{manuscript("research-fallback-title")}</div>}

      <div className="wrap research-desk-hud">
        <nav className="research-study-tabs" aria-label="Choose research study">
          {studies.map((paper, index) => <button key={paper.id} type="button" aria-pressed={selected === index}
            className={selected === index ? "is-selected" : ""} onClick={() => select(index)}>{paper.shortName}</button>)}
        </nav>
        <div className="research-desk-toolbar">
          <div className="research-study-controls">
            <button type="button" aria-label="Previous research paper" onClick={() => select((selected + studies.length - 1) % studies.length)}>←</button>
            <span role="status">Study {selected + 1} of {studies.length}</span>
            <button type="button" aria-label="Next research paper" onClick={() => select((selected + 1) % studies.length)}>→</button>
            <button type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close journal" : "Open journal"}</button>
            <button type="button" className="research-read-button" onClick={() => setReading(true)}>Read study</button>
          </div>
          <div className="research-camera-controls" role="group" aria-label="Research desk camera controls">
            <button type="button" aria-label="Rotate research desk left" onClick={() => api.current?.rotate(-1)}>↶</button>
            <button type="button" aria-label="Rotate research desk right" onClick={() => api.current?.rotate(1)}>↷</button>
            <button type="button" aria-label="Zoom research journal out" onClick={() => api.current?.zoom(-1)}>−</button>
            <button type="button" aria-label="Zoom research journal in" onClick={() => api.current?.zoom(1)}>+</button>
            <button type="button" onClick={() => api.current?.reset()}>Reset view</button>
          </div>
        </div>
        <p className="research-desk-hint">Drag the journal to move it. Drag the desk to orbit. Use Read study for the manuscript.</p>
      </div>

      {reading && <Modal className="research-reader-backdrop" labelledBy="research-manuscript-title" onClose={() => setReading(false)}>
        <div className="research-reader-shell">
          <button type="button" className="research-reader-close" onClick={() => setReading(false)} aria-label="Close research paper">Close ×</button>
          {manuscript("research-manuscript-title")}
          <nav className="research-reader-pagination" aria-label="Read another study">
            <button type="button" onClick={() => select((selected + studies.length - 1) % studies.length)}>← Previous study</button>
            <span>{selected + 1} / {studies.length}</span>
            <button type="button" onClick={() => select((selected + 1) % studies.length)}>Next study →</button>
          </nav>
        </div>
      </Modal>}
    </div>
  );
}
