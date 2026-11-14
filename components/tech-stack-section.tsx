"use client";

import { useState } from "react";
import { StackIcon } from "@/components/stack-icons";
import { STACK_GROUPS, type StackGroup, type StackItem, techStack } from "@/lib/content";

export function TechStackSection() {
  const [activeGroup, setActiveGroup] = useState<"All" | StackGroup>("All");
  const [inspected, setInspected] = useState<StackItem | null>(null);

  const visibleGroups = activeGroup === "All" ? STACK_GROUPS : [activeGroup];

  return (
    <section id="stack" className="wrap lab-section" aria-labelledby="stack-title">
      <div className="section-head">
        <div>
          <p className="section-kicker">03 · APPARATUS</p>
          <h2 id="stack-title" className="section-title">
            Tech stack
          </h2>
          <p className="section-intro">Tools I’ve built with in projects, classes and orgs.</p>
        </div>

        <div className="filter-pills" role="group" aria-label="Filter tech stack by group">
          <button
            type="button"
            className={`filter-pill ${activeGroup === "All" ? "is-active" : ""}`}
            aria-pressed={activeGroup === "All"}
            onClick={() => setActiveGroup("All")}
          >
            All ({techStack.length})
          </button>
          {STACK_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              className={`filter-pill ${activeGroup === group ? "is-active" : ""}`}
              aria-pressed={activeGroup === group}
              onClick={() => setActiveGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <div className="stack-readout" aria-live="polite">
        <span className="readout-label">SELECTED APPARATUS</span>
        <span className="readout-value">
          {inspected ? `${inspected.name} - ${inspected.group}` : "Hover, focus, or click any icon"}
        </span>
      </div>

      <div className="stack-groups">
        {visibleGroups.map((group) => {
          const items = techStack.filter((item) => item.group === group);
          return (
            <div key={group} className="stack-group">
              <h3 className="stack-group-title">
                <span>{group}</span>
                <span className="stack-count">{items.length}</span>
              </h3>
              <ul className="stack-grid">
                {items.map((item) => {
                  const isSelected = inspected?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`stack-tile ${isSelected ? "is-selected" : ""}`}
                        aria-label={`${item.name} (${item.group})`}
                        aria-pressed={isSelected}
                        data-tip={item.name}
                        onMouseEnter={() => setInspected(item)}
                        onFocus={() => setInspected(item)}
                        onClick={() => setInspected((prev) => (prev?.id === item.id ? null : item))}
                      >
                        <StackIcon id={item.id} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
