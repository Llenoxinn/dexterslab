"use client";

import { useEffect, useRef } from "react";
import { FlaskIcon } from "@/components/icons";

const SEGMENTS = 10;
const MIN_MS = 700;
const MAX_MS = 2500;
const EXIT_MS = 420;

// First visit in a session: the lab boots. The bar follows the real page load (fonts and
// assets), never shows for less than MIN_MS or more than MAX_MS, then wipes away in pixel
// steps and fires "lab:booted" so the title can decode. CSS hides it without JS, for
// reduced motion, and on repeat visits; the effect below only runs when it is showing.
export function BootScreen() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || getComputedStyle(el).display === "none") return;
    const segments = [...el.querySelectorAll<HTMLElement>(".boot-seg")];
    const percent = el.querySelector<HTMLElement>(".boot-pct");
    const status = el.querySelector<HTMLElement>(".boot-status span");

    let ready = false;
    const loaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });
    Promise.all([document.fonts.ready, loaded]).then(() => {
      ready = true;
    });

    const start = performance.now();
    let progress = 0;
    let shown = -1;
    let raf = 0;
    let exitTimer = 0;

    const finish = () => {
      if (status) status.textContent = "Ready.";
      el.classList.add("is-done");
      try {
        sessionStorage.setItem("lab-booted", "1");
      } catch {}
      window.dispatchEvent(new Event("lab:booted"));
      exitTimer = window.setTimeout(() => {
        el.hidden = true;
      }, EXIT_MS);
    };

    const tick = (now: number) => {
      const t = now - start;
      const target = (ready && t >= MIN_MS) || t >= MAX_MS ? 100 : Math.min(90, (t / MIN_MS) * 90);
      progress += (target - progress) * 0.18;
      if (target === 100 && progress > 99.5) progress = 100;
      const value = Math.floor(progress);
      if (value !== shown) {
        shown = value;
        if (percent) percent.textContent = `${String(value).padStart(3, "0")}%`;
        const lit = Math.floor(value / (100 / SEGMENTS));
        segments.forEach((seg, i) => seg.classList.toggle("is-lit", i < lit));
      }
      if (progress < 100) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
    };
  }, []);

  return (
    <div ref={ref} className="boot on-ink" aria-hidden="true">
      <div className="boot-inner">
        <span className="boot-flask">
          <span className="bubble" />
          <span className="bubble" />
          <span className="bubble" />
          <FlaskIcon />
        </span>
        <p className="boot-name">dexterslab</p>
        <div className="boot-meter">
          <span className="boot-bar">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className="boot-seg" />
            ))}
          </span>
          <span className="boot-pct">000%</span>
        </div>
        <p className="boot-status">
          <span>Booting the lab…</span>
          <span className="caret" />
        </p>
      </div>
    </div>
  );
}
