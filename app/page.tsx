import type { ReactNode } from "react";
import { experience, githubProjects, projects, researchWorks } from "@/lib/content";
import { AchievementsSection } from "@/components/achievements-section";
import { ContactSection } from "@/components/contact-section";
import { ExperienceSection } from "@/components/experience-section";
import { GitHubSection } from "@/components/github-section";
import { LabIntro } from "@/components/lab-intro";
import { LabPassage } from "@/components/lab-passage";
import { LabWorldLoader } from "@/components/lab-world-loader";
import { MethodSection } from "@/components/method-section";
import { PageMotion } from "@/components/motion";
import { NotionHero } from "@/components/notion-hero";
import { PixelEdge } from "@/components/pixel-edge";
import { ProjectsSection } from "@/components/projects-section";
import { ResearchSection } from "@/components/research-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { alternates: { canonical: "/" } };

/** A sheet of paper laid over the lab. The lab shows in the gaps between sheets. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div data-sheet className="sheet rails">
      <PixelEdge />
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader home />
      <LabWorldLoader />
      <LabIntro />

      {/* The anchor sits on <main>, not the sticky hero: a stuck element always measures as "already at the top". */}
      <main id="lab" tabIndex={-1}>
        <div className="hero hero--world on-ink" data-world-shot="console">
          <NotionHero />
        </div>

        <Sheet><MethodSection /></Sheet>
        <LabPassage shot="tubes" name="Pneumatic mail" action="Bring one down" items={experience.map((org) => org.organisation)} />
        <Sheet><ExperienceSection /></Sheet>
        <LabPassage shot="platform" name="The centre platform" action="Turn the platform" items={projects.map((project) => project.name)} />
        <Sheet><ProjectsSection /></Sheet>
        <LabPassage shot="cabinet" name="The blueprint cabinet" action="Open the next drawer" items={githubProjects.map((repo) => repo.name)} />
        <Sheet><GitHubSection /></Sheet>
        <LabPassage shot="projector" name="The projector" action="Next slide" items={researchWorks.map((paper) => paper.shortName)} />
        <Sheet><ResearchSection /></Sheet>
        <LabPassage shot="banderitas" name="Banderitas" action="Tug the line" note="Every flag on the line was captured." />
        <Sheet><AchievementsSection /></Sheet>
        <LabPassage shot="outbox" name="The outbox" action="Send a canister" note="Mail leaves the lab from here." />
        <Sheet><ContactSection /></Sheet>
      </main>

      <SiteFooter home />
      <PageMotion />
    </>
  );
}
