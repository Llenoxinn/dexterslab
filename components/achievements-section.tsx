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
              <span className="finding-item-rank">{item.result}</span>
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
