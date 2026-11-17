"use client";

import { useEffect, useState } from "react";

const manilaTime = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** Splits a line into letters that fade in one after another (see .lab-intro-line span). */
function Letters({ text, from }: { text: string; from: number }) {
  return (
    <>
      {[...text].map((char, i) => (
        <span key={i} style={{ animationDelay: `${from + i * 34}ms` }}>
          {char}
        </span>
      ))}
    </>
  );
}

/**
 * The opening's frame around the lab: letterbox bars, a black veil until the hall has drawn its first
 * frame, and two subtitle lines. The lights themselves are run by LabWorld; this only listens.
 */
export function LabIntro() {
  const [state, setState] = useState<"off" | "waiting" | "playing" | "leaving">("off");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "play") return;
    setTime(manilaTime.format(new Date()));
    setState("waiting");
    const start = () => setState((s) => (s === "waiting" ? "playing" : s));
    const done = () => {
      setState("leaving");
      window.setTimeout(() => setState("off"), 900);
    };
    // If the hall never draws (no WebGL, a stalled load), the page is not held hostage. Once it has
    // started, the hall runs the opening to its end.
    let started = false;
    const fallback = window.setTimeout(() => {
      if (!started && document.documentElement.dataset.intro === "play") {
        document.documentElement.dataset.intro = "done";
        done();
      }
    }, 9000);
    const onStart = () => {
      started = true;
      start();
    };
    window.addEventListener("lab:intro-start", onStart);
    window.addEventListener("lab:intro-done", done);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("lab:intro-start", onStart);
      window.removeEventListener("lab:intro-done", done);
    };
  }, []);

  if (state === "off") return null;

  return (
    <div className="lab-intro" data-state={state} aria-hidden="true">
      <div className="lab-intro-veil" />
      <div className="lab-intro-bar lab-intro-bar--top" />
      <div className="lab-intro-bar lab-intro-bar--bottom" />
      <p className="lab-intro-line">
        <Letters text={`${time} in Cebu.`} from={300} />
        <br />
        <Letters text="Someone's still in the lab." from={1100} />
      </p>
      <button type="button" className="lab-intro-skip" tabIndex={-1} onClick={() => window.dispatchEvent(new Event("lab:intro-skip"))}>
        Skip
      </button>
    </div>
  );
}
