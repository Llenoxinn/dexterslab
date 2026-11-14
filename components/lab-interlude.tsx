"use client";

import { useEffect, useRef, useState } from "react";

const CODE = "CODE";
const GLYPHS = "{}<>/;=#$_01[]%&*+!?";

const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * The beat between the hero and the rest of the page. The lab has just shattered and its pieces
 * circle this line in two rings (the "swirl" formation in lib/lab-journey.ts), while the section
 * stays pinned for a little over a screen.
 *
 * "CODE" keeps decoding itself out of gibberish, and the last word flips like a split-flap board.
 */
export function LabInterlude() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [code, setCode] = useState(CODE);
  const [decoded, setDecoded] = useState(false);
  const [calm, setCalm] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(media.matches || document.documentElement.dataset.labFx === "calm");
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("lab:preferences", sync);
    return () => {
      io.disconnect();
      media.removeEventListener("change", sync);
      window.removeEventListener("lab:preferences", sync);
    };
  }, []);

  // Everything below only runs while the line is on screen and motion is welcome.
  useEffect(() => {
    if (calm) {
      setCode(CODE);
      setDecoded(true);
      return;
    }
    if (!inView || played.current) return;
    let tick = 0;
    let scramble = 0;
    // Decode: every letter spins through glyphs and locks in turn, left to right.
    const decode = () => {
      tick = 0;
      window.clearInterval(scramble);
      scramble = window.setInterval(() => {
        tick += 1;
        setCode(CODE.split("").map((ch, i) => (tick > 7 + i * 5 ? ch : glyph())).join(""));
        if (tick > 7 + CODE.length * 5) {
          window.clearInterval(scramble);
          setDecoded(true);
          played.current = true;
        }
      }, 45);
    };
    decode();

    return () => {
      window.clearInterval(scramble);
    };
  }, [inView, calm]);

  const word = "BEGIN";

  return (
    <section ref={ref} id="interlude" className={`lab-interlude ${inView ? "is-inview" : ""} ${decoded ? "is-decoded" : ""}`} aria-labelledby="interlude-title">
      <div className="lab-interlude-pin">
        <h2 id="interlude-title" className="lab-interlude-title" aria-label="Let the code begin">
          <span className="lab-interlude-line" aria-hidden="true">
            {"LET THE".split("").map((ch, i) => (
              <span key={i} className="lab-interlude-rise" style={{ transitionDelay: `${i * 35}ms` }}>
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </span>
          <span className="lab-interlude-line" aria-hidden="true">
            <span className="lab-interlude-rise" style={{ transitionDelay: "260ms" }}>
              <span className="lab-interlude-code">
                {code.split("").map((ch, i) => (
                  // The real letter always holds the cell's width; a glyph is drawn over it while it
                  // is still decoding. The key flips when the letter locks, which replays the snap.
                  <span key={`${i}-${ch === CODE[i]}`} className={`lab-interlude-cell ${ch === CODE[i] ? "is-locked" : "is-noise"}`}>
                    <span className="lab-interlude-cell-real">{CODE[i]}</span>
                    {ch !== CODE[i] && <span className="lab-interlude-cell-noise">{ch}</span>}
                  </span>
                ))}
              </span>{" "}
              <span className="lab-interlude-flap">
                {word.split("").map((ch, i) => (
                  // The key changes whenever this slot's letter changes, which replays the flip.
                  <span key={`${i}-${ch}`} className="lab-interlude-flap-cell" style={{ transitionDelay: `${i * 45}ms` }}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
              <span className="lab-interlude-caret" />
            </span>
          </span>
        </h2>
        <span className="lab-interlude-signal" aria-hidden="true"><span /></span>
        <p className="lab-interlude-sub">Web tools, CTF wins and research, all out of this one lab.</p>
      </div>
    </section>
  );
}
