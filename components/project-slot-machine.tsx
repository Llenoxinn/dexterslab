"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Selected work as a one-reel slot machine (after Notion /dev's webhook machine):
 * one project card shows at a time; pulling the lever rolls it up and out as the next one rises in.
 */
export function ProjectSlotMachine<T extends { slug: string; name: string }>({
  items,
  renderCard,
}: {
  items: T[];
  renderCard: (item: T) => ReactNode;
}) {
  const count = items.length;
  // Three copies of the list let the reel always roll upward; after each landing it re-centres silently.
  const [position, setPosition] = useState(count);
  const [animate, setAnimate] = useState(true);
  const [pulled, setPulled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const active = position % count;
  const next = items[(active + 1) % count];

  const land = (pos: number) => {
    setRolling(false);
    if (pos >= 2 * count) {
      setAnimate(false);
      setPosition(pos - count);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }
  };

  const pull = () => {
    if (rolling || count < 2) return;
    const target = position + 1;
    setPulled(true);
    timers.current.push(window.setTimeout(() => setPulled(false), 340));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRolling(!reduce);
    setPosition(target);
    if (reduce) land(target);
    else timers.current.push(window.setTimeout(() => land(target), 760));
  };

  const cards = [...items, ...items, ...items];

  return (
    <div className="reel">
      <div className="reel-window">
        {/* Invisible sizer: every card stacked in one cell, so the window is exactly as tall as the tallest card. */}
        <div className="reel-sizer" aria-hidden="true" inert>
          {items.map((item) => (
            <div key={item.slug}>{renderCard(item)}</div>
          ))}
        </div>
        <div
          className="reel-track"
          style={{
            height: `${cards.length * 100}%`,
            gridTemplateRows: `repeat(${cards.length}, 1fr)`,
            transform: `translateY(${(-100 * position) / cards.length}%)`,
            transition: animate ? undefined : "none",
          }}
        >
          {cards.map((item, i) => (
            <div key={`${item.slug}-${i}`} className="reel-slot" inert={i !== position} aria-hidden={i !== position}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={`slot-lever ${pulled ? "is-pulled" : ""}`}
        onClick={pull}
        aria-label={`Pull the lever to show ${next.name}`}
      >
        <span className="slot-lever-stick" aria-hidden="true">
          <span className="slot-lever-knob" />
        </span>
        <span className="slot-lever-base" aria-hidden="true" />
      </button>
      <p className="sr-only" aria-live="polite">
        Showing {items[active].name}
      </p>
    </div>
  );
}
