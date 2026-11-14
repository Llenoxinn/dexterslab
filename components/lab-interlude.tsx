"use client";

import { useEffect, useRef, useState } from "react";

const CODE = "CODE";
const GLYPHS = "{}<>/;=#$_01[]%&*+!?";
/** The last word keeps changing its mind: mostly BEGIN, now and then BEGUN or BE GONE! */
const ENDINGS: Array<{ word: string; hold: number }> = [
  { word: "BEGIN", hold: 3400 },
  { word: "BEGUN", hold: 1700 },
  { word: "BEGIN", hold: 3000 },
  { word: "BE GONE!", hold: 1900 },
];

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
  const [ending, setEnding] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Everything below only runs while the line is on screen and motion is welcome.
  useEffect(() => {
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCode(CODE);
      setEnding(0);
      return;
    }
    let tick = 0;
    let scramble = 0;
    let next = 0;
    // Decode: every letter spins through glyphs and locks in turn, left to right.
    const decode = () => {
      tick = 0;
      window.clearInterval(scramble);
      scramble = window.setInterval(() => {
        tick += 1;
        setCode(CODE.split("").map((ch, i) => (tick > 7 + i * 5 ? ch : glyph())).join(""));
        if (tick > 7 + CODE.length * 5) window.clearInterval(scramble);
      }, 45);
    };
    decode();
    const again = window.setInterval(decode, 5200);

    let index = 0;
    const advance = () => {
      index = (index + 1) % ENDINGS.length;
      setEnding(index);
      next = window.setTimeout(advance, ENDINGS[index].hold);
    };
    next = window.setTimeout(advance, ENDINGS[0].hold);

    return () => {
      window.clearInterval(scramble);
      window.clearInterval(again);
      window.clearTimeout(next);
    };
  }, [inView]);

  const word = ENDINGS[ending].word;

  return (
    <section ref={ref} id="interlude" className={`lab-interlude ${inView ? "is-inview" : ""}`} aria-labelledby="interlude-title">
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
                  <span key={`${i}-${ch}`} className="lab-interlude-flap-cell" style={{ animationDelay: `${i * 45}ms` }}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
              <span className="lab-interlude-caret" />
            </span>
          </span>
        </h2>
        <p className="lab-interlude-sub">Web tools, CTF wins and research, all out of this one lab.</p>
      </div>
    </section>
  );
}
