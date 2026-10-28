"use client";

import Lenis from "lenis";
import { animate, inView, scroll, stagger } from "motion";
import { useEffect } from "react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const GLYPHS = "#%&*+=<>/?!01{}[]ABCDEFGHJKLMNPQRSTUVWXYZ";

// The title decodes: each letter appears as scrambled lab glyphs, then resolves into the
// real letter, left to right. Widths are locked while scrambling, so nothing reflows.
// `onDone` fires once every letter has resolved.
function decode(chars: HTMLElement[], onDone: () => void) {
  const finals = chars.map((c) => c.textContent ?? "");
  for (const c of chars) c.style.width = `${c.getBoundingClientRect().width}px`;
  const start = performance.now();
  let timer = 0;
  const step = () => {
    const t = performance.now() - start;
    let done = true;
    chars.forEach((c, i) => {
      if (t < i * 28) {
        done = false;
        return;
      }
      c.style.opacity = "1";
      if (t >= 260 + i * 34) {
        if (c.textContent !== finals[i]) {
          c.textContent = finals[i];
          c.style.width = "";
        }
        return;
      }
      done = false;
      c.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    });
    if (!done) timer = window.setTimeout(step, 55);
    else onDone();
  };
  step();
  return () => {
    window.clearTimeout(timer);
    chars.forEach((c, i) => {
      c.textContent = finals[i];
      c.style.width = "";
      c.style.opacity = "";
    });
  };
}

// All page motion lives here, so the markup stays server-rendered and readable
// without JavaScript. Nothing below runs under reduced motion.
export function PageMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const $ = (s: string) => document.querySelector<HTMLElement>(s);
    const $$ = (s: string) => [...document.querySelectorAll<HTMLElement>(s)];
    const cleanups: VoidFunction[] = [];

    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -80 } });
    cleanups.push(() => lenis.destroy());

    // Load: the title decodes, then the lede and the bench arrive. It waits for the boot
    // screen when one is showing, and for fonts either way, so locked widths are right.
    const chars = $$(".hero-title .char");
    const lede = $$("[data-lede]");
    const scene = $$("[data-scene]");
    for (const el of [...chars, ...lede, ...scene]) el.style.opacity = "0";
    let cancelled = false;
    const intro = () => {
      if (cancelled) return;
      for (const el of $$("[data-intro]")) el.style.visibility = "visible";
      // Once decoded, the terminal cursor appears and the start prompt types itself out.
      cleanups.push(decode(chars, () => $(".hero-copy")?.classList.add("is-typed")));
      animate(lede, { opacity: [0, 1], y: [12, 0] }, { duration: 0.6, ease: EASE_OUT, delay: 0.45 });
      animate(scene, { opacity: [0, 1], y: [24, 0] }, { duration: 0.8, ease: EASE_OUT, delay: 0.6 });
    };
    const boot = $(".boot");
    const booting = boot !== null && !boot.hidden && getComputedStyle(boot).display !== "none";
    const onBooted = () => document.fonts.ready.then(intro);
    if (booting) window.addEventListener("lab:booted", onBooted, { once: true });
    else onBooted();
    cleanups.push(() => {
      cancelled = true;
      window.removeEventListener("lab:booted", onBooted);
    });

    // Scroll: as the paper sheet rises over the hero, the title's words scatter and the
    // text block fades, so nothing peeks between the sheet's teeth at the end of the page.
    const sheet = $("[data-sheet]");
    const words = $$(".hero-title .word");
    const heroText = $(".hero-main");
    if (sheet && heroText) {
      const fade = animate(heroText, { opacity: [1, 1, 0] }, { ease: "linear", times: [0, 0.55, 1] });
      cleanups.push(scroll(fade, { target: sheet, offset: ["start end", "end end"] }));
    }
    if (sheet) {
      const spread = innerWidth >= 768 ? 180 : 56;
      const mid = (words.length - 1) / 2;
      words.forEach((word, i) => {
        const scatter = animate(
          word,
          {
            x: [0, (i - mid) * spread],
            y: [0, (i % 2 ? 1 : -1) * spread * 0.3],
            rotate: [0, i % 2 ? 4 : -4],
            opacity: [1, 0.15],
          },
          { ease: "linear" },
        );
        cleanups.push(scroll(scatter, { target: sheet, offset: ["start end", "end end"] }));
      });
    }

    // Contact: current runs down the wire as you scroll; once the section is in view it
    // runs along the bus, each link powers on in turn, and Dexter waves (.is-live).
    const contact = $("[data-contact]");
    if (contact) {
      const wire = $("[data-wire]");
      const bus = $("[data-bus]");
      const socials = $$(".patch .social");
      if (wire) {
        const fill = animate(wire, { scaleY: [0, 1] }, { ease: "linear" });
        cleanups.push(scroll(fill, { target: contact, offset: ["start 95%", "start 45%"] }));
      }
      if (bus) bus.style.transform = "scaleX(0)";
      for (const el of socials) el.style.opacity = "0";
      const stop = inView(
        contact,
        () => {
          contact.classList.add("is-live");
          if (bus) animate(bus, { scaleX: [0, 1] }, { duration: 0.7, ease: EASE_OUT });
          animate(
            socials,
            { opacity: [0, 1], scale: [0.9, 1] },
            { duration: 0.4, ease: EASE_OUT, delay: stagger(0.09, { startDelay: 0.25 }) },
          );
          stop();
        },
        { amount: 0.5 },
      );
      cleanups.push(stop);
    }

    // Footer: the flask bubbles a couple of times when the bench comes into view.
    const bench = $("[data-bench]");
    if (bench) {
      const stop = inView(bench, () => {
        bench.classList.add("is-live");
        stop();
      });
      cleanups.push(stop);
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
