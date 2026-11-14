"use client";

import { education, experience, formatDuration } from "@/lib/content";

const ORG_FOCUS: Record<string, string> = {
  "UP Data Science Society": "Applied data science, peer study tracks, and analytical tooling.",
  "UP Cebu Storylab": "Campus multimedia storytelling, production workflows, and creative tech.",
  "Insight Philippines": "Editorial layout systems, visual hierarchy, and publication design.",
  "UP Computer Science Guild (UPCSG)": "CS student representation, cohort coordination, and guild creatives.",
};

function orgSpanLabel(roles: (typeof experience)[number]["roles"]) {
  const starts = roles.map((r) => r.start).sort();
  const hasPresent = roles.some((r) => r.end === "present");
  const ends = roles.map((r) => r.end).sort();
  const startYear = starts[0]?.slice(0, 4) ?? "";
  const endLabel = hasPresent ? "Present" : (ends[ends.length - 1]?.slice(0, 4) ?? "");
  return startYear === endLabel ? startYear : `${startYear} - ${endLabel}`;
}

export function ExperienceSection() {
  const entries = experience;

  return (
    <section id="experience" className="wrap lab-section" aria-labelledby="experience-title">
      <div className="section-head">
        <div>
          <h2 id="experience-title" className="section-title">
            Experience
          </h2>
          <p className="section-intro">
            Org roles at UP Cebu: technical, creative and leadership.
          </p>
        </div>
      </div>

      <div className="exp-edu-strip" aria-label="Education">
        {education.map((edu) => (
          <div key={edu.school} className="exp-edu-strip-main">
            <p className="exp-edu-school">{edu.school}</p>
            <p className="exp-edu-program">{edu.program}</p>
          </div>
        ))}
        <div className="exp-edu-strip-meta">
          <span>{education[0]?.batch}</span>
          <span className="education-stamp">DOST-SEI</span>
        </div>
      </div>

      <ol className="exp-grid">
        {entries.map((org) => {
          const hasActive = org.roles.some((r) => r.end === "present");
          const focus = ORG_FOCUS[org.organisation];
          return (
            <li key={org.organisation} className={`exp-card ${hasActive ? "is-active-org" : ""}`}>
              <div className="exp-card-top">
                <h3 className="exp-entry-org">{org.organisation}</h3>
                <div className="exp-entry-meta">
                  <span className="exp-entry-span">{orgSpanLabel(org.roles)}</span>
                  {hasActive && (
                    <span className="exp-live-inline">Current</span>
                  )}
                </div>
              </div>

              {focus && <p className="exp-card-focus">{focus}</p>}

              <ul className="exp-card-roles">
                {org.roles.map((r) => (
                  <li key={`${org.organisation}-${r.role}-${r.start}`} className="exp-card-role">
                    <span className="exp-card-role-title">{r.role}</span>
                    <span className="exp-card-role-time">
                      {r.dateLabel}, {formatDuration(r.start, r.end)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
