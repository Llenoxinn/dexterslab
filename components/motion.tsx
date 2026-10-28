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

// All page motion lives here, so the markup stays server-rendered and readable without
// JavaScript. Transforms are full strings, not x/y/scale shorthands, so the browser can
// run them off the main thread (and on the native scroll timeline where supported).
export function PageMotion() {
  useEffect(() => {
    const $ = (s: string) => document.querySelector<HTMLElement>(s);
    const $$ = (s: string) => [...document.querySelectorAll<HTMLElement>(s)];
    const cleanups: VoidFunction[] = [];
    const sheet = $("[data-sheet]");

    // Header: light once the paper sheet reaches it, like Notion's /dev nav. A colour
    // change, not motion, so it runs under reduced motion too.
    const header = $(".site-header");
    if (header && sheet) {
      let frame = 0;
      const sync = () => {
        frame = 0;
        header.classList.toggle("is-light", sheet.getBoundingClientRect().top <= header.offsetHeight);
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(sync);
      };
      sync();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(frame);
      });
    }

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
        animate(
          lede,
          { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0px)"] },
          { duration: 0.6, ease: EASE_OUT, delay: 0.45 },
        );
        animate(
          scene,
          { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0px)"] },
          { duration: 0.8, ease: EASE_OUT, delay: 0.6 },
        );
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
          const x = (i - mid) * spread;
          const y = (i % 2 ? 1 : -1) * spread * 0.3;
          const r = i % 2 ? 4 : -4;
          const scatter = animate(
            word,
            {
              transform: ["translate(0px, 0px) rotate(0deg)", `translate(${x}px, ${y}px) rotate(${r}deg)`],
              opacity: [1, 0.15],
            },
            { ease: "linear" },
          );
          cleanups.push(scroll(scatter, { target: sheet, offset: ["start end", "end end"] }));
        });
      }

      // Contact: current runs down the wire as you scroll; once the section is in view the
      // dashed frame draws itself from the corner badge, the links power on in turn, and
      // Dexter waves (.is-live).
      const contact = $("[data-contact]");
      if (contact) {
        const wire = $("[data-wire]");
        const frame = $("[data-frame]");
        const socials = $$(".contact .social");
        if (wire) {
          const fill = animate(wire, { transform: ["scaleY(0)", "scaleY(1)"] }, { ease: "linear" });
          cleanups.push(scroll(fill, { target: contact, offset: ["start 95%", "start 55%"] }));
        }
        if (frame) frame.style.clipPath = "inset(0% 100% 100% 0%)";
        for (const el of socials) el.style.opacity = "0";
        const stop = inView(
          contact,
          () => {
            contact.classList.add("is-live");
            if (frame) {
              animate(
                frame,
                { clipPath: ["inset(0% 100% 100% 0%)", "inset(0% 0% 0% 0%)"] },
                { duration: 0.8, ease: EASE_OUT },
              );
            }
            animate(
              socials,
              { opacity: [0, 1], transform: ["scale(0.9)", "scale(1)"] },
              { duration: 0.4, ease: EASE_OUT, delay: stagger(0.09, { startDelay: 0.3 }) },
            );
            stop();
          },
          { amount: 0.4 },
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
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
