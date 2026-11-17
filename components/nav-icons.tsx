import type { ReactNode } from "react";

/**
 * Section glyphs, each one the machine that section's station is in the lab: the canister from the
 * pneumatic mail, the flask, the notebook on the desk, a pennant off the banderitas. Duotone: a tinted
 * fill (`.nav-icon-fill`) under one 1.75 stroke, all in `currentColor`, so they follow the link's state
 * and still read at 18px.
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const fill = { className: "nav-icon-fill", fill: "currentColor", stroke: "none" } as const;

export const NAV_ICONS = {
  // A person with a lab ID clipped on.
  about: (
    <Icon>
      <path {...fill} d="M4.5 20.5c.9-4 3.9-6.3 7.5-6.3s6.6 2.3 7.5 6.3z" />
      <circle cx="12" cy="7.8" r="3.6" />
      <path d="M4.5 20.5c.9-4 3.9-6.3 7.5-6.3s6.6 2.3 7.5 6.3" />
      <rect x="13.6" y="16.4" width="3.4" height="2.6" rx="0.6" fill="currentColor" stroke="none" />
    </Icon>
  ),
  // The pneumatic mail canister: a capsule with two brass bands.
  experience: (
    <Icon>
      <rect {...fill} x="5" y="6.5" width="14" height="11" rx="3" />
      <rect x="5" y="4" width="14" height="16" rx="4.5" />
      <path d="M5 8.5h14M5 15.5h14" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  ),
  // A flask with glowing reagent and two bubbles rising.
  projects: (
    <Icon>
      <path {...fill} d="M6.8 14h10.4l1.7 3a1.8 1.8 0 0 1-1.6 2.7H6.7A1.8 1.8 0 0 1 5.1 17z" />
      <path d="M9 3.5h6M10.2 3.5v5.4l-5.1 8.4a1.8 1.8 0 0 0 1.6 2.7h10.6a1.8 1.8 0 0 0 1.6-2.7l-5.1-8.4V3.5" />
      <circle cx="10.5" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="12.4" r="0.7" fill="currentColor" stroke="none" />
    </Icon>
  ),
  // A branch graph: solid commits on the main line, one merged back in.
  github: (
    <Icon>
      <path d="M7 6v12M17 8.2c0 4.6-5.6 4.4-9.6 8.3" />
      <circle cx="7" cy="5" r="2.2" fill="currentColor" />
      <circle cx="7" cy="19" r="2.2" fill="currentColor" />
      <circle {...fill} cx="17" cy="6.5" r="2.2" />
      <circle cx="17" cy="6.5" r="2.2" />
    </Icon>
  ),
  // The lab notebook, open, with a line of notes on each page.
  research: (
    <Icon>
      <path {...fill} d="M3.5 6.2c2.9-.9 5.8-.6 8.5 1.1 2.7-1.7 5.6-2 8.5-1.1v12.3c-2.9-.9-5.8-.6-8.5 1.1-2.7-1.7-5.6-2-8.5-1.1z" />
      <path d="M3.5 6.2c2.9-.9 5.8-.6 8.5 1.1 2.7-1.7 5.6-2 8.5-1.1v12.3c-2.9-.9-5.8-.6-8.5 1.1-2.7-1.7-5.6-2-8.5-1.1zM12 7.3v12.3M6 10.2c1.4-.3 2.7-.2 3.8.3M14.2 10.5c1.1-.5 2.4-.6 3.8-.3" />
    </Icon>
  ),
  // A banderita pennant on its pole: the captured flag.
  achievements: (
    <Icon>
      <path {...fill} d="M6.5 4.5h12l-3.4 4.3 3.4 4.3h-12z" />
      <path d="M6.5 21V3.5M6.5 4.5h12l-3.4 4.3 3.4 4.3h-12" />
    </Icon>
  ),
} as const;
