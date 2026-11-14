import { Source_Serif_4 } from "next/font/google";
import { researchWorks } from "@/lib/content";
import { ResearchBook } from "@/components/research-book";

const researchFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-research",
  display: "swap",
  preload: false,
});

export function ResearchSection() {
  return (
    <section
      id="research"
      className={`lab-section research-scene-section ${researchFont.variable}`}
      aria-labelledby="research-title"
    >
      <ResearchBook studies={researchWorks} />
    </section>
  );
}
