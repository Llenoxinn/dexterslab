import { researchWorks } from "@/lib/content";
import { ResearchBook } from "@/components/research-book";

export function ResearchSection() {
  return (
    <section
      id="research"
      className="lab-section research-scene-section"
      aria-labelledby="research-title"
    >
      <ResearchBook studies={researchWorks} />
    </section>
  );
}
