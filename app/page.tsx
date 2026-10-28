import { BootScreen } from "@/components/boot-screen";
import { BoltIcon } from "@/components/icons";
import { LabGame } from "@/components/lab-game";
import { PageMotion } from "@/components/motion";
import { PixelEdge } from "@/components/pixel-edge";
import { PixelSprite } from "@/components/pixel-sprite";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";
import { DEXTER_WAVE_A, DEXTER_WAVE_B } from "@/lib/pixel-art";
import { site } from "@/lib/site";

// The runner, recoloured to read on paper.
const ON_PAPER = {
  N: "var(--color-ink-deep)",
  L: "var(--color-lavender)",
  P: "var(--color-ink)",
  D: "var(--color-ink-deep)",
};

export default function Home() {
  return (
    <>
      <BootScreen />
      <SiteHeader home />

      <main>
        <div className="hero on-ink">
          <div className="hero-frame" aria-hidden="true">
            <span className="corner corner--tl" />
            <span className="corner corner--tr" />
            <span className="corner corner--bl" />
            <span className="corner corner--br" />
          </div>
          <LabGame />
        </div>

        <div data-sheet className="sheet rails">
          <PixelEdge />
          {/* A circuit: the wire drops through the node, turns along the bus, and powers each link. */}
          <section id="contact" data-contact className="wrap contact" aria-labelledby="contact-title">
            <span data-wire className="wire" aria-hidden="true" />
            <div className="contact-head">
              <div className="title-row">
                <span className="node" aria-hidden="true">
                  <BoltIcon />
                </span>
                <h2 id="contact-title" className="display section-title">
                  Keep in touch
                </h2>
              </div>
              <p className="contact-intro">{site.openTo}</p>
            </div>
            <div className="patch">
              <span data-bus className="bus" aria-hidden="true" />
              <SocialLinks />
              <span className="waver" aria-hidden="true">
                <PixelSprite rows={DEXTER_WAVE_A} palette={ON_PAPER} className="wave-a" />
                <PixelSprite rows={DEXTER_WAVE_B} palette={ON_PAPER} className="wave-b" />
              </span>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      <PageMotion />
    </>
  );
}
