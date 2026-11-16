import type { ReactNode } from "react";
import { AchievementsSection } from "@/components/achievements-section";
import { ContactSection } from "@/components/contact-section";
import { ExperienceSection } from "@/components/experience-section";
import { GitHubSection } from "@/components/github-section";
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

      {/* The anchor sits on <main>, not the sticky hero: a stuck element always measures as "already at the top". */}
      <main id="lab" tabIndex={-1}>
        <div className="hero hero--world on-ink" data-world-shot="console">
          <NotionHero />
        </div>

        <Sheet><MethodSection /></Sheet>
        <LabPassage shot="tubes" name="Pneumatic mail" note="One canister for every place I have worked." />
        <Sheet><ExperienceSection /></Sheet>
        <LabPassage shot="platform" name="The centre platform" note="A vault, a calculating engine and a photo booth: one machine per project." />
        <Sheet><ProjectsSection /></Sheet>
        <LabPassage shot="cabinet" name="The blueprint cabinet" note="A drawer for each smaller build." />
        <Sheet><GitHubSection /></Sheet>
        <LabPassage shot="projector" name="The projector" note="The research, on the big screen." />
        <Sheet><ResearchSection /></Sheet>
        <LabPassage shot="banderitas" name="Banderitas" note="Every flag on the line was captured." />
        <Sheet><AchievementsSection /></Sheet>
        <LabPassage shot="outbox" name="The outbox" note="Mail leaves the lab from here." />
        <Sheet><ContactSection /></Sheet>
      </main>

      <SiteFooter home />
      <PageMotion />
    </>
  );
}
