import { AchievementsSection } from "@/components/achievements-section";
import { ContactSection } from "@/components/contact-section";
import { ExperienceSection } from "@/components/experience-section";
import { GitHubSection } from "@/components/github-section";
import { LabInterlude } from "@/components/lab-interlude";
import { MethodSection } from "@/components/method-section";
import { PageMotion } from "@/components/motion";
import { NotionHero } from "@/components/notion-hero";
import { PixelEdge } from "@/components/pixel-edge";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <SiteHeader home />

      {/* The anchor sits on <main>, not the sticky hero: a stuck element always measures as "already at the top". */}
      <main id="lab" tabIndex={-1}>
        <div className="hero on-ink">
          <NotionHero />
        </div>

        <LabInterlude />

        <div data-sheet className="sheet rails">
          <PixelEdge />

          <MethodSection />
          <ExperienceSection />
          <ProjectsSection />
          <GitHubSection />
          <ResearchSection />
          <AchievementsSection />
          <ContactSection />
        </div>
      </main>

      <SiteFooter home />
      <PageMotion />
    </>
  );
}
