"use client";

import { useEffect, useState } from "react";
import type { ShotId } from "@/lib/world/shots";

type Props = {
  shot: Exclude<ShotId, "console">;
  name: string;
  /** The verb on the button that works the machine (the same thing a click on it in the lab does). */
  action: string;
  /** What the machine can show, in order: the caption follows whichever one is in front. */
  items?: string[];
  note?: string;
};

/** A gap between two sheets of paper: a window onto one machine in the lab, and a way to work it. */
export function LabPassage({ shot, name, action, items, note }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ shot: ShotId; index: number }>).detail;
      if (detail?.shot === shot) setIndex(detail.index);
    };
    window.addEventListener("lab:state", onState);
    return () => window.removeEventListener("lab:state", onState);
  }, [shot]);

  const current = items?.length ? items[index % items.length] : null;

  return (
    <div className="lab-passage on-ink" data-world-shot={shot}>
      <div className="wrap lab-passage-caption">
        <p className="lab-passage-name">{name}</p>
        {current ? (
          <p className="lab-passage-note" aria-live="polite">
            <span key={current} className="lab-passage-item">{current}</span>
          </p>
        ) : (
          note && <p className="lab-passage-note">{note}</p>
        )}
        <button type="button" className="lab-passage-act" onClick={() => window.dispatchEvent(new CustomEvent("lab:act", { detail: { shot } }))}>
          {action}
        </button>
      </div>
    </div>
  );
}
