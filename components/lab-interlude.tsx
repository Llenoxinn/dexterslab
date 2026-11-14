"use client";

import { useEffect, useRef } from "react";

const BEATS = [
  { top: "LET THE", bottom: "CODE BEGIN!", label: "Begin" },
  { top: "THE CODING", bottom: "HAS BEGUN!", label: "Build" },
  { top: "LET THE CODE", bottom: "BE GONE!", label: "Release" },
  { top: "LET’S CODE", bottom: "TOGETHER.", label: "Together" },
] as const;

/** Reversible, scroll-scrubbed titles. Paused WAAPI timelines avoid React renders per frame. */
export function LabInterlude() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const panels = [...section.querySelectorAll<HTMLElement>(".lab-interlude-beat")];
    const marks = [...section.querySelectorAll<HTMLElement>(".lab-interlude-step")];
    const meter = section.querySelector<HTMLElement>(".lab-interlude-meter-fill");
    const animations: Animation[] = [];
    const easing = getComputedStyle(section).getPropertyValue("--ease-in-out").trim() || "cubic-bezier(0.77, 0, 0.175, 1)";
    let calm = false;
    let visible = false;
    let raf = 0;
    let progress = 0;
    let last = 0;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      return Math.max(0, Math.min(1, -rect.top / Math.max(1, section.offsetHeight - window.innerHeight)));
    };
    const paint = () => {
      for (const animation of animations) animation.currentTime = progress * 1000;
      if (meter) meter.style.transform = `scaleX(${progress})`;
      const active = progress < .235 ? 0 : progress < .505 ? 1 : progress < .765 ? 2 : 3;
      marks.forEach((mark, i) => { mark.dataset.active = String(i === active); });
    };
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || calm) return;
      const target = readProgress();
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      progress += (target - progress) * (1 - Math.exp(-dt * 12));
      if (Math.abs(target - progress) < .0001) progress = target;
      paint();
      if (progress !== target) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible && !calm && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const syncMotion = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      animations.splice(0).forEach((animation) => animation.cancel());
      calm = media.matches || document.documentElement.dataset.labFx === "calm";
      section.dataset.motion = calm ? "calm" : "full";
      if (calm) return;
      panels.forEach((panel, beat) => {
        const pieces = [...panel.querySelectorAll<HTMLElement>("[data-title-piece]")];
        pieces.forEach((piece, index) => {
          // Letter offsets form one continuous wave, without random scrambling or layout changes.
          const stagger = index * .003;
          const enter = beat === 0 ? 0 : [0, .18, .45, .71][beat] + stagger;
          const settled = beat === 0 ? 0 : enter + .09;
          const leave = [.16, .43, .69, 1][beat] + (beat === 3 ? 0 : stagger);
          const gone = Math.min(1, leave + .09);
          const rest = { opacity: 1, transform: "translate3d(0, 0, 0) rotateX(0deg) scale(1)" };
          const below = { opacity: 0, transform: "translate3d(0, 110%, 0) rotateX(-35deg) scale(.97)" };
          const above = {
            opacity: 0,
            transform: beat === 2 && index > 0
              ? `translate3d(${(index - pieces.length / 2) * 10}%, -110%, 0) rotate(${(index - pieces.length / 2) * 3}deg) scale(.94)`
              : "translate3d(0, -110%, 0) rotateX(25deg) scale(.97)",
          };
          const keyframes: Keyframe[] = beat === 0
            ? [{ ...rest, offset: 0, easing }]
            : [{ ...below, offset: 0 }, { ...below, offset: enter, easing }, { ...rest, offset: settled }];
          keyframes.push({ ...rest, offset: leave, easing });
          if (beat !== 3) keyframes.push({ ...above, offset: gone }, { ...above, offset: 1 });
          const animation = piece.animate(keyframes, { duration: 1000, fill: "both" });
          animation.pause();
          animations.push(animation);
        });
      });
      progress = readProgress();
      paint();
      wake();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else { cancelAnimationFrame(raf); raf = 0; }
    });
    observer.observe(section);
    syncMotion();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    window.addEventListener("lab:preferences", syncMotion);
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(raf);
      animations.forEach((animation) => animation.cancel());
      observer.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      window.removeEventListener("lab:preferences", syncMotion);
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return (
    <section ref={ref} id="interlude" className="lab-interlude" aria-labelledby="interlude-title">
      <div className="lab-interlude-pin">
        <p className="lab-interlude-eyebrow" aria-hidden="true">From the first line to what’s next</p>
        <h2 id="interlude-title" className="lab-interlude-title" aria-label={BEATS.map((beat) => `${beat.top} ${beat.bottom}`).join(" ")}>
          {BEATS.map((beat, index) => (
            <span className="lab-interlude-beat" key={beat.label} aria-hidden="true">
              <span className="lab-interlude-line"><span data-title-piece>{beat.top}</span></span>
              <span className={`lab-interlude-line lab-interlude-accent lab-interlude-accent-${index}`}>
                {[...beat.bottom].map((letter, i) => <span key={i} data-title-piece>{letter === " " ? "\u00a0" : letter}</span>)}
              </span>
            </span>
          ))}
        </h2>
        <div className="lab-interlude-timeline" aria-hidden="true">
          <div className="lab-interlude-meter"><span className="lab-interlude-meter-fill" /></div>
          <div className="lab-interlude-steps">
            {BEATS.map((beat, index) => <span key={beat.label} className="lab-interlude-step" data-active={index === 0}><span>0{index + 1}</span> {beat.label}</span>)}
          </div>
        </div>
        <p className="lab-interlude-sub">Scroll to write the next line<span aria-hidden="true"> ↓</span></p>
      </div>
    </section>
  );
}
