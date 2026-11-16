import type { ReactNode } from "react";

/** Line icons for the section links: one stroke weight, `currentColor`, so they follow the link's state. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const NAV_ICONS = {
  about: (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 3.9-5.5 7-5.5s5.8 1.9 7 5.5" />
    </Icon>
  ),
  experience: (
    <Icon>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
    </Icon>
  ),
  projects: (
    <Icon>
      <path d="M9.5 3.5h5M10.5 3.5v5.2l-5.1 8.9a2 2 0 0 0 1.7 2.9h9.8a2 2 0 0 0 1.7-2.9l-5.1-8.9V3.5M7.6 14h8.8" />
    </Icon>
  ),
  github: (
    <Icon>
      <circle cx="6.5" cy="5.5" r="2" />
      <circle cx="6.5" cy="18.5" r="2" />
      <circle cx="17.5" cy="7.5" r="2" />
      <path d="M6.5 7.5v9M17.5 9.5c0 4.5-6 3.5-10 7.5" />
    </Icon>
  ),
  research: (
    <Icon>
      <path d="M7 3.5h7l4 4v13H7zM14 3.5v4h4M9.5 12h6M9.5 15.5h6" />
    </Icon>
  ),
  achievements: (
    <Icon>
      <path d="M5.5 21V4M5.5 4.5h12l-2.8 4 2.8 4h-12" />
    </Icon>
  ),
} as const;
