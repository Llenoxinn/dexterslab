import { STACK_GROUPS, techStack } from "@/lib/content";

/**
 * The lobby under the lake. The 3D layer (components/lab-3d-canvas.tsx) dives here after the
 * interlude and holds while this section scrolls past; this markup carries the meaning: what the lab
 * runs on, group by group, before you go in. Without WebGL it is a plain, readable section.
 */
export function LabLobby() {
  return (
    <section id="lobby" className="lab-lobby" aria-labelledby="lobby-title">
      <div className="lab-lobby-pin">
        <div className="lab-lobby-copy">
          <h2 id="lobby-title" className="lab-lobby-title">Before you go in.</h2>
          <p className="lab-lobby-lede">Everything in the lab runs on these. Five shelves, one per kind of work.</p>
          <dl className="lab-lobby-groups">
            {STACK_GROUPS.map((group) => (
              <div key={group} className="lab-lobby-group">
                <dt>{group}</dt>
                <dd>
                  {techStack
                    .filter((item) => item.group === group)
                    .map((item) => item.name)
                    .join(", ")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
