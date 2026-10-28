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

      {/* The anchor sits on <main>, not the sticky hero: a stuck element always measures as "already at the top". */}
      <main id="lab">
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
          {/* The wire drops into the frame's corner badge; the frame draws itself, the links power on,
              and Dexter, standing on the frame, names whichever link you point at. */}
          <section id="contact" data-contact className="wrap contact" aria-labelledby="contact-title">
            <span data-wire className="wire" aria-hidden="true" />
            <div className="contact-frame">
              <span data-frame className="frame-line" aria-hidden="true" />
              <span className="frame-badge" aria-hidden="true">
                <BoltIcon />
              </span>
              <div className="contact-copy">
                <h2 id="contact-title" className="section-title">
                  Keep in touch.
                </h2>
                <p className="contact-intro">{site.openTo}</p>
                <SocialLinks />
              </div>
              <div className="contact-dexter" aria-hidden="true">
                <p className="say">
                  <span className="say-default">Say hi!</span>
                  <span className="say-email">Email me.</span>
                  <span className="say-github">My GitHub.</span>
                  <span className="say-linkedin">My LinkedIn.</span>
                  <span className="say-facebook">My Facebook.</span>
                </p>
                <span className="waver">
                  <PixelSprite rows={DEXTER_WAVE_A} palette={ON_PAPER} className="wave-a" />
                  <PixelSprite rows={DEXTER_WAVE_B} palette={ON_PAPER} className="wave-b" />
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter home />
      <PageMotion />
    </>
  );
}
