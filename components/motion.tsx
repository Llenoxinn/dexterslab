"use client";

import { useEffect } from "react";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function PageMotion() {
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>("[data-sheet]");
    const header = document.querySelector<HTMLElement>(".site-header");
    let headerObserver: IntersectionObserver | undefined;
    const watchHeader = () => {
      headerObserver?.disconnect();
      if (!header || !sheet) return;
      const height = header.offsetHeight;
      headerObserver = new IntersectionObserver(([entry]) => {
        header.classList.toggle("is-light", entry.isIntersecting);
      }, { rootMargin: `-${height}px 0px -${Math.max(0, innerHeight - height - 1)}px 0px` });
      headerObserver.observe(sheet);
    };
    watchHeader();
    window.addEventListener("resize", watchHeader);

    const ambientObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-visible", entry.isIntersecting);
    }, { rootMargin: "60px", threshold: 0.01 });
    document.querySelectorAll(".lab-section").forEach((section) => ambientObserver.observe(section));

    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let clearMotion = () => {};
    let enabled: boolean | undefined;
    const syncMotion = () => {
      const next = !media.matches && document.documentElement.dataset.labFx !== "calm";
      if (next === enabled) return;
      enabled = next;
      clearMotion();
      if (!next) return;
      const cleanups: VoidFunction[] = [];
      const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
      const surfaceSelector = ".about-focus-item, .exp-card, .work-case-stage-link, .gh-repo-card, .finding-item, .contact-channel-block";
      let activeSurface: HTMLElement | null = null;
      let bounds: DOMRect | null = null;
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;
      const findSurface = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(surfaceSelector) : null;
      const resetSurface = () => {
        if (activeSurface) { activeSurface.style.removeProperty("transform"); activeSurface.classList.remove("is-lab-hovered"); }
        activeSurface = null;
        bounds = null;
        cancelAnimationFrame(frame);
        frame = 0;
      };
      const onOver = (event: PointerEvent) => {
        if (!finePointer.matches || event.pointerType !== "mouse") return;
        const surface = findSurface(event.target);
        if (!surface || surface === activeSurface) return;
        resetSurface();
        activeSurface = surface;
        bounds = surface.getBoundingClientRect();
        surface.classList.add("is-lab-hovered");
      };
      const onMove = (event: PointerEvent) => {
        if (!activeSurface || !bounds) return;
        pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
        pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
        if (!frame) frame = requestAnimationFrame(() => {
          frame = 0;
          if (activeSurface) activeSurface.style.transform = `perspective(1000px) rotateX(${-pointerY * 3}deg) rotateY(${pointerX * 3}deg) translateY(-3px)`;
        });
      };
      const onOut = (event: PointerEvent) => { if (findSurface(event.relatedTarget) !== activeSurface) resetSurface(); };
      document.addEventListener("pointerover", onOver, { passive: true });
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      cleanups.push(() => {
        resetSurface();
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerout", onOut);
      });
      document.documentElement.style.scrollBehavior = "smooth";
      cleanups.push(() => document.documentElement.style.removeProperty("scroll-behavior"));

      const reveal = (elements: HTMLElement[]) => {
        elements.forEach((element, index) => {
          const animation = element.animate([
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0px)" },
          ], { duration: 280, delay: index * 50, easing: EASE_OUT, fill: "backwards" });
          cleanups.push(() => animation.cancel());
        });
      };

      const hero = [...document.querySelectorAll<HTMLElement>(".hero-3d-intro > *")];
      reveal(hero);

      const sections = [...document.querySelectorAll<HTMLElement>(".lab-section")]
        .filter((section) => section.getBoundingClientRect().top >= innerHeight * 0.9);
      const targets = new Map<HTMLElement, HTMLElement[]>();
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const elements = targets.get(entry.target as HTMLElement) ?? [];
          for (const element of elements) delete element.dataset.reveal;
          reveal(elements);
          observer.unobserve(entry.target);
        }
      }, { threshold: 0.08 });
      for (const section of sections) {
        const elements = [...section.children].filter((element): element is HTMLElement => element instanceof HTMLElement);
        targets.set(section, elements);
        for (const element of elements) element.dataset.reveal = "pending";
        observer.observe(section);
      }
      cleanups.push(() => {
        observer.disconnect();
        for (const elements of targets.values()) for (const element of elements) delete element.dataset.reveal;
      });
      clearMotion = () => cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
    };
    syncMotion();
    media.addEventListener("change", syncMotion);
    window.addEventListener("lab:preferences", syncMotion);
    return () => {
      clearMotion();
      headerObserver?.disconnect();
      ambientObserver.disconnect();
      window.removeEventListener("resize", watchHeader);
      media.removeEventListener("change", syncMotion);
      window.removeEventListener("lab:preferences", syncMotion);
    };
  }, []);
  return null;
}
