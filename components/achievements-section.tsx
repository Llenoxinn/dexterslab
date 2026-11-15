import { achievements } from "@/lib/content";

export function AchievementsSection() {
  return (
    <section id="achievements" className="wrap lab-section" aria-labelledby="achievements-title">
      <div className="section-head">
        <div>
          <h2 id="achievements-title" className="section-title">
            Achievements
          </h2>
          <p className="section-intro">
            Capture-the-flag competitions.
          </p>
        </div>
      </div>

      <ol className="findings-grid">
        {achievements.map((item) => (
          <li key={item.id} className="finding-item">
            <div className="finding-item-meta">
              {/* A captured flag: it runs up its pole as the row scrolls into view. */}
              <svg className="finding-flag" viewBox="0 0 12 16" aria-hidden="true" shapeRendering="crispEdges">
                <rect x="1" y="0" width="1" height="16" />
                <path className="finding-flag-cloth" d="M2 1h8v1h-1v1h-1v1h1v1h1v1H2z" />
              </svg>
              <span className="finding-item-rank">
                {item.result.split(" · ")[0]}
                {item.result.includes(" · ") && (
                  <span className="finding-item-rank-sub">{item.result.split(" · ").slice(1).join(", ")}</span>
                )}
              </span>
              <span className="finding-item-date">{item.date}</span>
            </div>

            <div className="finding-item-body">
              <h3 className="finding-item-title">{item.title}</h3>
              <p className="finding-item-issuer">{item.issuer}</p>
              <p className="finding-item-context">{item.context}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
