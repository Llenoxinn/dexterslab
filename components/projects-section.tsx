"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/modal";
import { StackIcon } from "@/components/stack-icons";
import { ProjectSlotMachine } from "@/components/project-slot-machine";
import { type ProjectEntry, projects, techStack } from "@/lib/content";

const STACK_ID_BY_NAME = new Map(techStack.map((item) => [item.name.toLowerCase(), item.id]));

function ExternalArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3.5 10.5L10.5 3.5M10.5 3.5H4.75M10.5 3.5V9.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectPreview({ project }: { project: ProjectEntry }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (project.image && !imgFailed) {
    return (
      <Image
        className="work-stage-img"
        src={project.image}
        alt={`${project.name} live interface screenshot`}
        loading="lazy"
        width={1600}
        height={1000}
        sizes="(max-width: 768px) 92vw, (max-width: 1400px) 52vw, 680px"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="work-preview-unavailable">
      <span className="display">{project.name}</span>
      <p>{imgFailed ? "Preview unavailable. Explore the project using the links below." : project.tagline}</p>
    </div>
  );
}

export function ProjectsSection() {
  const [selected, setSelected] = useState<ProjectEntry | null>(null);

  const card = (project: ProjectEntry) => {
    const primaryHref = project.links?.live ?? project.links?.source;
    return (
      <article className="work-case">
        <div className="work-case-media">
          <a href={primaryHref} target="_blank" rel="noreferrer" className="work-case-stage-link" aria-label={`Open ${project.name}`}>
            <div className="work-case-viewport">
              <ProjectPreview project={project} />
            </div>
          </a>
        </div>

        <div className="work-case-content">
          <div className="work-case-header">
            <div className="work-case-eyebrow">
              <span className="work-case-kind">{project.figureLabel}</span>
              <span className="work-case-year">{project.date}</span>
            </div>
            <h3 className="work-case-title">{project.name}</h3>
            <p className="work-case-summary">{project.summary}</p>
          </div>

          <dl className="work-case-specs">
            <div className="work-case-spec">
              <dt>Architecture</dt>
              <dd>{project.built}</dd>
            </div>
            <div className="work-case-spec">
              <dt>Outcome</dt>
              <dd>{project.result}</dd>
            </div>
          </dl>

          <div className="work-case-Bottom">
            <ul className="work-case-stack" aria-label={`${project.name} tech stack`}>
              {project.stack.map((tech) => {
                const iconId = STACK_ID_BY_NAME.get(tech.toLowerCase()) ?? tech.toLowerCase();
                return (
                  <li key={tech} className="spec-chip spec-chip--icon">
                    <StackIcon id={iconId} />
                    <span>{tech}</span>
                  </li>
                );
              })}
            </ul>

            <div className="work-case-actions">
              <button type="button" className="work-bento-cta work-bento-cta--primary" onClick={() => setSelected(project)}>
                <span>Case study</span>
              </button>
              {project.links?.live && (
                <a className="work-bento-cta work-bento-cta--ghost" href={project.links.live} target="_blank" rel="noreferrer">
                  <span>Live site</span>
                  <ExternalArrow />
                </a>
              )}
              {project.links?.source && (
                <a className="work-bento-cta work-bento-cta--ghost" href={project.links.source} target="_blank" rel="noreferrer">
                  <span>Source</span>
                  <ExternalArrow />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="projects" className="wrap lab-section work-section" aria-labelledby="projects-title">
      <div className="work-section-head">
        <h2 id="projects-title" className="section-title">
          Selected work
        </h2>
        <p className="section-intro">Three tools I built from scratch. Pull the lever for the next one.</p>
      </div>

      <ProjectSlotMachine items={projects} renderCard={card} />

      {selected && (
        <Modal className="spec-modal-backdrop" labelledBy="spec-modal-title" onClose={() => setSelected(null)}>
          <div
            className="spec-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spec-modal-head">
              <div>
                <div className="spec-meta">
                  <span className={`spec-status spec-status--${selected.status.replace(" ", "-")}`}>
                    {selected.status === "in progress" ? "Work in progress" : selected.status === "shipped" ? "Shipped" : "Archived"}
                  </span>
                  <span className="spec-date">{selected.date}</span>
                </div>
                <h3 id="spec-modal-title" className="spec-modal-title">
                  {selected.name}
                </h3>
              </div>
              <button
                type="button"
                className="customizer-close"
                aria-label="Close project details"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            <p className="spec-summary">{selected.summary}</p>

            <dl className="spec-modal-dl">
              <div className="spec-modal-block">
                <dt>Problem</dt>
                <dd>{selected.problem}</dd>
              </div>
              <div className="spec-modal-block">
                <dt>Architecture &amp; implementation</dt>
                <dd>{selected.built}</dd>
              </div>
              <div className="spec-modal-block">
                <dt>Outcome</dt>
                <dd>{selected.result}</dd>
              </div>
            </dl>

            <div className="spec-modal-foot">
              <ul className="spec-stack" aria-label="Tech stack">
                {selected.stack.map((tech) => {
                  const iconId = STACK_ID_BY_NAME.get(tech.toLowerCase()) ?? tech.toLowerCase();
                  return (
                    <li key={tech} className="spec-chip spec-chip--icon">
                      <StackIcon id={iconId} />
                      <span>{tech}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="spec-links">
                {selected.links?.live && (
                  <a
                    className="work-bento-cta work-bento-cta--primary"
                    href={selected.links.live}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Live site</span>
                    <ExternalArrow />
                  </a>
                )}
                {selected.links?.source && (
                  <a
                    className="work-bento-cta work-bento-cta--ghost"
                    href={selected.links.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Source</span>
                    <ExternalArrow />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
