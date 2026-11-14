"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { DEFAULT_PREFS, STORAGE_KEY, parsePrefs, type LabPrefs } from "@/lib/preferences";

function applyPrefs(prefs: LabPrefs) {
  const root = document.documentElement;
  root.dataset.labTheme = prefs.theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "phosphor" : "dos") : prefs.theme;
  root.dataset.labRails = prefs.rails ? "on" : "off";
  root.dataset.labDensity = prefs.density;
  root.dataset.labFx = prefs.fx;
  window.dispatchEvent(new Event("lab:preferences"));
}

export function LabCustomizer() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<LabPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parsePrefs(JSON.parse(saved));
        setPrefs(parsed);
        applyPrefs(parsed);
      } else {
        applyPrefs(DEFAULT_PREFS);
      }
    } catch {
      applyPrefs(DEFAULT_PREFS);
    }
  }, []);

  useEffect(() => {
    if (prefs.theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyPrefs(prefs);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [prefs]);

  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev);
    window.addEventListener("lab:toggle-customizer", onToggle);
    return () => {
      window.removeEventListener("lab:toggle-customizer", onToggle);
    };
  }, []);

  const update = (patch: Partial<LabPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const reset = () => {
    setPrefs(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  if (!open) return null;

  return (
    <Modal className="customizer-backdrop" labelledBy="customizer-title" onClose={() => setOpen(false)}>
      <aside
        className="customizer-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="customizer-head">
          <div>
            <p className="customizer-kicker">LAB CONFIG</p>
            <h2 id="customizer-title" className="customizer-title">
              Customize workspace
            </h2>
          </div>
          <button type="button" className="customizer-close" onClick={() => setOpen(false)} aria-label="Close customizer">
            ×
          </button>
        </div>

        <div className="customizer-body">
          <fieldset className="customizer-group">
            <legend>Palette</legend>
            <div className="customizer-options">
              {(
                [
                  { id: "system", label: "System" },
                  { id: "dos", label: "DOS Ink" },
                  { id: "phosphor", label: "Phosphor" },
                  { id: "contrast", label: "High Contrast" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`choice-chip ${prefs.theme === opt.id ? "is-active" : ""}`}
                  aria-pressed={prefs.theme === opt.id}
                  onClick={() => update({ theme: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="customizer-group">
            <legend>Project spec density</legend>
            <div className="customizer-options">
              {(
                [
                  { id: "detailed", label: "Detailed" },
                  { id: "compact", label: "Compact" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`choice-chip ${prefs.density === opt.id ? "is-active" : ""}`}
                  aria-pressed={prefs.density === opt.id}
                  onClick={() => update({ density: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="customizer-group">
            <legend>Drafting rails</legend>
            <div className="customizer-options">
              <button
                type="button"
                className={`choice-chip ${prefs.rails ? "is-active" : ""}`}
                aria-pressed={prefs.rails}
                onClick={() => update({ rails: true })}
              >
                Visible
              </button>
              <button
                type="button"
                className={`choice-chip ${!prefs.rails ? "is-active" : ""}`}
                aria-pressed={!prefs.rails}
                onClick={() => update({ rails: false })}
              >
                Hidden
              </button>
            </div>
          </fieldset>

          <fieldset className="customizer-group">
            <legend>Motion &amp; FX</legend>
            <div className="customizer-options">
              <button
                type="button"
                className={`choice-chip ${prefs.fx === "full" ? "is-active" : ""}`}
                aria-pressed={prefs.fx === "full"}
                onClick={() => update({ fx: "full" })}
              >
                Full lab
              </button>
              <button
                type="button"
                className={`choice-chip ${prefs.fx === "calm" ? "is-active" : ""}`}
                aria-pressed={prefs.fx === "calm"}
                onClick={() => update({ fx: "calm" })}
              >
                Calm
              </button>
            </div>
          </fieldset>
        </div>

        <div className="customizer-foot">
          <p className="customizer-note">Your preferences are saved in this browser.</p>
          <button type="button" className="choice-chip" onClick={reset}>
            Reset defaults
          </button>
        </div>
      </aside>
    </Modal>
  );
}
