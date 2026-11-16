import type { ShotId } from "@/lib/world/shots";

/** A gap between two sheets of paper: a window onto the lab, with the name of the machine in view. */
export function LabPassage({ shot, name, note }: { shot: Exclude<ShotId, "console">; name: string; note: string }) {
  return (
    <div className="lab-passage on-ink" data-world-shot={shot} aria-hidden="true">
      <p className="wrap lab-passage-caption">
        <span className="lab-passage-name">{name}</span>
        <span className="lab-passage-note">{note}</span>
      </p>
    </div>
  );
}
