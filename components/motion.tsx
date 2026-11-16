"use client";

import { useEffect } from "react";
import { advanceSpring } from "@/lib/spring";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function PageMotion() {
  useEffect(() => {
    // The paper comes in several sheets with the lab showing between them; the header is light over any of them.
    const sheets = [...document.querySelectorAll<HTMLElement>("[data-sheet]")];
    const header = document.querySelector<HTMLElement>(".site-header");
    let headerObserver: IntersectionObserver | undefined;
    const watchHeader = () => {
      headerObserver?.disconnect();
      if (!header || !sheets.length) return;
      const height = header.offsetHeight;
      const under = new Set<Element>();
      headerObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) under.add(entry.target);
          else under.delete(entry.target);
        }
        header.classList.toggle("is-light", under.size > 0);
      }, { rootMargin: `-${height}px 0px -${Math.max(0, innerHeight - height - 1)}px 0px` });
      for (const sheet of sheets) headerObserver.observe(sheet);
    };
    watchHeader();
    window.addEventListener("resize", watchHeader);

    const ambientObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-visible", entry.isIntersecting);
    }, { rootMargin: "60px", threshold: 0.01 });
    document.querySelectorAll(".lab-section").forEach((section) => ambientObserver.observe(section));

    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".site-header a[href^='#']")];
    const visibleSections = new Map<Element, number>();
    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSections.set(entry.target, Math.abs(entry.boundingClientRect.top));
        else visibleSections.delete(entry.target);
      }
      const current = [...visibleSections].sort((a, b) => a[1] - b[1])[0]?.[0].id;
      for (const link of navLinks) {
        if (current && link.hash === `#${current}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }, { rootMargin: "-15% 0px -60% 0px" });
    document.querySelectorAll("main section[id]").forEach((section) => sectionObserver.observe(section));

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
      const surfaceSelector = ".about-focus-item, .exp-card, .finding-item, .gh-repo-card, .work-case-stage-link";
      let activeSurface: HTMLElement | null = null;
      let bounds: DOMRect | null = null;
      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;
      const springX = { position: 0, velocity: 0 };
      const springY = { position: 0, velocity: 0 };
      let lastFrame = 0;
      const drawSurface = (now: number) => {
        frame = 0;
        if (!activeSurface || document.hidden) return;
        const dt = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
        lastFrame = now;
        const movingX = advanceSpring(springX, pointerX, dt);
        const movingY = advanceSpring(springY, pointerY, dt);
        activeSurface.style.transform = `perspective(1000px) rotateX(${-springY.position * 3}deg) rotateY(${springX.position * 3}deg) translateY(-3px)`;
        if (movingX || movingY) frame = requestAnimationFrame(drawSurface);
      };
      const findSurface = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(surfaceSelector) : null;
      const resetSurface = () => {
        if (activeSurface) { activeSurface.style.removeProperty("transform"); activeSurface.classList.remove("is-lab-hovered"); }
        activeSurface = null;
        bounds = null;
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
        springX.position = springY.position = springX.velocity = springY.velocity = 0;
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
        pointerX = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - 0.5));
        pointerY = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - 0.5));
        if (!frame) frame = requestAnimationFrame(drawSurface);
      };
      const onOut = (event: PointerEvent) => { if (findSurface(event.relatedTarget) !== activeSurface) resetSurface(); };
      document.addEventListener("pointerover", onOver, { passive: true });
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      window.addEventListener("scroll", resetSurface, { passive: true });
      document.addEventListener("visibilitychange", resetSurface);
      cleanups.push(() => {
        resetSurface();
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerout", onOut);
        window.removeEventListener("scroll", resetSurface);
        document.removeEventListener("visibilitychange", resetSurface);
      });
      document.documentElement.style.scrollBehavior = "smooth";
      cleanups.push(() => document.documentElement.style.removeProperty("scroll-behavior"));

      const reveal = (elements: HTMLElement[]) => {
        elements.forEach((element, index) => {
          const animation = element.animate([
            { opacity: 0, transform: "translateY(18px)" },
            { opacity: 1, transform: "translateY(0px)" },
          ], { duration: 280, delay: Math.min(index, 5) * 50, easing: EASE_OUT, fill: "backwards" });
          cleanups.push(() => animation.cancel());
        });
      };

      const hero = [...document.querySelectorAll<HTMLElement>(".hero-3d-intro > *")];
      reveal(hero);

      // Reveal the individual specimens as they enter, rather than moving an entire long list.
      const specimens = [...document.querySelectorAll<HTMLElement>(".about-focus-item, .exp-card, .gh-repo-card, .finding-item")];
      const specimenObserver = new IntersectionObserver((entries) => {
        const incoming = entries.filter((entry) => entry.isIntersecting);
        reveal(incoming.map((entry) => entry.target as HTMLElement));
        incoming.forEach((entry) => specimenObserver.unobserve(entry.target));
      }, { threshold: 0.15 });
      specimens.forEach((element) => specimenObserver.observe(element));
      cleanups.push(() => specimenObserver.disconnect());

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
        const elements = [...section.children].filter((element): element is HTMLElement =>
          element instanceof HTMLElement && !element.matches(".exp-grid, .findings-grid, .contact-panel-area, .contact-finale") && !element.querySelector(".about-focus-item, .gh-repo-card"));
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
      sectionObserver.disconnect();
      navLinks.forEach((link) => link.removeAttribute("aria-current"));
      window.removeEventListener("resize", watchHeader);
      media.removeEventListener("change", syncMotion);
      window.removeEventListener("lab:preferences", syncMotion);
    };
  }, []);
  return null;
}
