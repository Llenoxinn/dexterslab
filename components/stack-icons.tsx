import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Crisp 24x24 single-colour glyphs in `currentColor` for the Tech Stack directory and project cards.
export function StackIcon({ id, ...props }: { id: string } & IconProps) {
  const key = id.toLowerCase().trim();
  switch (key) {
    case "c":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2a10 10 0 1 0 8.66 15l-3.46-2a6 6 0 1 1 0-6l3.46-2A10 10 0 0 0 12 2Z" />
        </svg>
      );
    case "cpp":
    case "c++":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M10.5 3a9 9 0 1 0 7.5 14l-2.6-1.5a6 6 0 1 1 0-7L18 7a9 9 0 0 0-7.5-4Zm6.5 7v1.5h-1.5V13H17v1.5h1.5V13H20v-1.5h-1.5V10H17Zm4 0v1.5h-1.5V13H21v1.5h1.5V13H24v-1.5h-1.5V10H21Z" />
        </svg>
      );
    case "csharp":
    case "c#":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M10 3a9 9 0 1 0 7.2 14.4l-2.5-1.6a6 6 0 1 1 0-7.6L17.2 6.6A9 9 0 0 0 10 3Zm6.5 5.5v2H15V12h1.5v2H15v1.5h1.5v2H18v-2h1.5v2H21v-2h1v-1.5h-1V12h1v-1.5h-1v-2h-1.5v2H18v-2h-1.5Zm1.5 3.5h1.5v2H18v-2Z" />
        </svg>
      );
    case "haskell":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M2 19h3.4l4.2-7-4.2-7H2l4.2 7L2 19Zm5.4 0h3.4l2.5-4.2L15.8 19h3.4L10.8 5H7.4l4.2 7-4.2 7Zm9.6-5.5h5v-2.2h-6.3l1.3 2.2Zm-2.2-3.7H22V7.6h-8.5l1.3 2.2Z" />
        </svg>
      );
    case "python":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M11.9 2C7.4 2 7.7 4 7.7 4v2.1h4.3v.7H6s-3-.3-3 4.3c0 4.6 2.6 4.4 2.6 4.4h1.5v-2.1s-.1-2.6 2.6-2.6h4.4s2.5 0 2.5-2.4V4.5S17 2 11.9 2Zm-2.4 1.5a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6ZM12.1 22c4.5 0 4.2-2 4.2-2v-2.1H12v-.7h6s3 .3 3-4.3c0-4.6-2.6-4.4-2.6-4.4h-1.5v2.1s.1 2.6-2.6 2.6H9.9s-2.5 0-2.5 2.4v3.9S7 22 12.1 22Zm2.4-1.5a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Z" />
        </svg>
      );
    case "javascript":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M3 3h18v18H3V3Zm10.8 14.2c0 1.6-.9 2.3-2.3 2.3-.9 0-1.6-.4-2-.9l1.2-.8c.2.4.5.6.9.6.5 0 .8-.2.8-.9v-4.8h1.4v4.5Zm5.5-.1c0 1.5-1.1 2.4-2.7 2.4-1.2 0-2.1-.5-2.6-1.4l1.2-.7c.3.5.7.9 1.4.9.7 0 1.1-.3 1.1-.8 0-.6-.4-.8-1.3-1.2l-.5-.2c-1.3-.5-2.1-1.2-2.1-2.5 0-1.3 1-2.2 2.5-2.2 1.1 0 1.9.4 2.4 1.2l-1.2.8c-.3-.4-.6-.6-1.2-.6-.5 0-.9.3-.9.7 0 .5.3.7 1.1 1l.5.2c1.5.6 2.3 1.2 2.3 2.4Z" />
        </svg>
      );
    case "typescript":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" {...props}>
          <path d="M3 3h18v18H3V3Zm9.2 9.4H9.6v7.1H8v-7.1H5.4V11h6.8v1.4Zm7.1 4.8c0 1.5-1.1 2.4-2.8 2.4-1.1 0-2.1-.4-2.7-1.1l1-1.1c.5.5 1.1.8 1.8.8.8 0 1.2-.3 1.2-.8 0-.5-.4-.8-1.4-1.1l-.6-.2c-1.3-.4-2-1.1-2-2.3 0-1.3 1-2.2 2.5-2.2 1 0 1.9.3 2.5 1l-.9 1.1c-.5-.4-1-.6-1.6-.6-.6 0-1 .3-1 .7s.3.7 1.2 1l.6.2c1.5.5 2.2 1.1 2.2 2.2Z" />
        </svg>
      );
    case "html5":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M4 3h16l-1.5 16.2L12 21l-6.5-1.8L4 3Zm3.4 5.2.4 4.5h6.5l-.2 2.4-2.1.6-2.1-.6-.1-1.5H7.8l.3 3.1 3.9 1.1 3.9-1.1.5-5.7H9.6l-.2-1.9h7.2l.2-1.9H7.4Z" />
        </svg>
      );
    case "css3":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M4 3h16l-1.5 16.2L12 21l-6.5-1.8L4 3Zm3.5 5.2.2 1.9h6.9l-.2 1.9H9.3l.2 1.9h4.8l-.3 2.4-2 .6-2-.6-.1-1.4H7.9l.3 2.9 3.8 1.1 3.8-1.1.7-7.7-.1-1.9H7.5Z" />
        </svg>
      );
    case "react":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false" {...props}>
          <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </svg>
      );
    case "nextjs":
    case "next.js":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2a10 10 0 1 0 7.7 16.4L9.4 7.5H8v9h1.5v-6.7l9.2 10A10 10 0 0 0 12 2Zm3.2 5.5v6.8l1.5 1.8V7.5h-1.5Z" />
        </svg>
      );
    case "svelte":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M18.3 4.3a4.6 4.6 0 0 0-6.3-1.4L6.8 6.2a4.3 4.3 0 0 0-1.9 4.5 4.2 4.2 0 0 0 .7 1.6 4.4 4.4 0 0 0-.6 3.5 4.6 4.6 0 0 0 6.3 2.9l5.2-3.3a4.3 4.3 0 0 0 1.9-4.5 4.2 4.2 0 0 0-.7-1.6 4.4 4.4 0 0 0 .6-5ZM10.7 17a2.5 2.5 0 0 1-3.4-1.5 2.4 2.4 0 0 1 .4-2.1l.4-.5.6.4a6.4 6.4 0 0 0 2.5 1l.2.1v.3a1.4 1.4 0 0 1-.7 1l-.4.2.4 1.1Zm4.7-4.9-.4.5-.6-.4a6.4 6.4 0 0 0-2.5-1l-.2-.1v-.3a1.4 1.4 0 0 1 .7-1l2.8-1.8a2.5 2.5 0 0 1 3.4 1.5 2.4 2.4 0 0 1-.4 2.1l-2.8.5Z" />
        </svg>
      );
    case "vite":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M21 4.2 12.5 20a.6.6 0 0 1-1 0L3 4.2a.6.6 0 0 1 .7-.9l8.3 2.4a.6.6 0 0 0 .3 0l8-2.4a.6.6 0 0 1 .7.9ZM14.6 3.5l-4.2 1.2 1.1 5.2 2.8-.6-1.2 4.5 4.3-6.6-2.9.6.1-4.3Z" />
        </svg>
      );
    case "tailwindcss":
    case "tailwind css":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 6c-2.7 0-4.3 1.3-5 4 1-1.3 2.2-1.8 3.5-1.5.8.2 1.3.7 1.9 1.3 1 1 2.1 2.2 4.6 2.2 2.7 0 4.3-1.3 5-4-1 1.3-2.2 1.8-3.5 1.5-.8-.2-1.3-.7-1.9-1.3-1-1-2.1-2.2-4.6-2.2ZM7 12c-2.7 0-4.3 1.3-5 4 1-1.3 2.2-1.8 3.5-1.5.8.2 1.3.7 1.9 1.3 1 1 2.1 2.2 4.6 2.2 2.7 0 4.3-1.3 5-4-1 1.3-2.2 1.8-3.5 1.5-.8-.2-1.3-.7-1.9-1.3-1-1-2.1-2.2-4.6-2.2Z" />
        </svg>
      );
    case "zustand":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M7.5 4.5A2.5 2.5 0 0 0 5 7c0 .8.4 1.5 1 2a6.5 6.5 0 0 0-2 4.7C4 17.5 7.6 20 12 20s8-2.5 8-6.3a6.5 6.5 0 0 0-2-4.7c.6-.5 1-1.2 1-2a2.5 2.5 0 0 0-4.5-1.5A8.4 8.4 0 0 0 12 5c-.9 0-1.7.2-2.5.5A2.5 2.5 0 0 0 7.5 4.5Zm1.7 7.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm5.6 0a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-2.8 2.6c1.1 0 2 .6 2 1.4 0 .8-.9 1.3-2 1.3s-2-.5-2-1.3c0-.8.9-1.4 2-1.4Z" />
        </svg>
      );
    case "d3":
    case "d3.js":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M2 5v14h4.5c4.2 0 7.5-3.1 7.5-7s-3.3-7-7.5-7H2Zm3 3h1.5c2.5 0 4.4 1.8 4.4 4s-1.9 4-4.4 4H5V8Zm10.2-3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 1 0 9h-2.5v-3h2.5a1.5 1.5 0 0 0 0-3h-2.5v-3h2.5a1.5 1.5 0 0 0 0-3h-2.5V5h2.5Z" />
        </svg>
      );
    case "threejs":
    case "three.js":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
          <polygon points="12 3 21 19 3 19" />
          <polygon points="12 11 16.5 19 7.5 19" />
          <line x1="7.5" y1="11" x2="16.5" y2="11" />
        </svg>
      );
    case "postgresql":
    case "postgres":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false" {...props}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
          <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
        </svg>
      );
    case "drizzle":
    case "drizzle orm":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false" {...props}>
          <line x1="7" y1="14" x2="10" y2="7" />
          <line x1="12" y1="17" x2="15" y2="10" />
          <line x1="16" y1="14" x2="19" y2="7" />
          <line x1="5" y1="18" x2="8" y2="11" />
        </svg>
      );
    case "docker":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M13 5h2v2h-2V5Zm-3 0h2v2h-2V5ZM7 8h2v2H7V8Zm3 0h2v2h-2V8Zm3 0h2v2h-2V8Zm3 0h2v2h-2V8ZM4 11h2v2H4v-2Zm3 0h2v2H7v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2Zm4.5 1.2c-.6-.4-1.4-.5-2.1-.3-.2-.8-.7-1.5-1.4-1.9l-.3-.2-.2.3c-.4.7-.5 1.6-.2 2.4-.5.3-1.1.4-1.8.4H2.2c-.3 1.8.2 3.6 1.3 4.9 1.2 1.4 3 2.1 5.3 2.1 4.2 0 7.4-1.9 8.9-5.4.7 0 1.9 0 2.6-1.2.1-.2.2-.5.2-.7l-.3-.2-.7-.2Z" />
        </svg>
      );
    case "mediapipe":
    case "google mediapipe":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false" {...props}>
          <path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3" />
          <circle cx="9.5" cy="10" r="1.2" fill="currentColor" />
          <circle cx="14.5" cy="10" r="1.2" fill="currentColor" />
          <path d="M9 14.5c1.5 1.2 4.5 1.2 6 0" strokeLinecap="round" />
        </svg>
      );
    case "radix":
    case "radix ui":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M11 4v8H5a4 4 0 1 1 0-8h6Zm0 10v6H5a6 6 0 0 1 6-6Zm3-10a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10h6v6h-6v-6Z" />
        </svg>
      );
    case "vitest":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M13 3 5 14h6l-1 7 9-11h-6l0-7Z" />
        </svg>
      );
    case "maplibre":
    case "maplibre gl":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "blazor":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1.4 14.8c-2.6.8-5.2-.6-5.8-3.1-.5-2.1.7-4.3 2.8-5 1.8-.6 3.7.3 4.4 2-.6-.4-1.4-.5-2.2-.3-1.4.4-2.2 1.8-1.8 3.2.4 1.4 1.9 2.2 3.3 1.8.8-.2 1.4-.8 1.7-1.5.2 1.3-.7 2.5-2.4 2.9Z" />
        </svg>
      );
    case "fastapi":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1 15v-4.5H7.5L13 6v4.5h3.5L11 17Z" />
        </svg>
      );
    case "redis":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 3 3 7.5 12 12l9-4.5L12 3Zm0 11.2L3 9.7v3.1L12 17.3l9-4.5V9.7l-9 4.5Zm0 4.5L3 14.2v3.1L12 21.8l9-4.5v-3.1l-9 4.5Z" />
        </svg>
      );
    case "canvas":
    case "canvas api":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false" {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 15c2-5 4-5 6 0s4 5 4-2" strokeLinecap="round" />
        </svg>
      );
    case "nodejs":
    case "node.js":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2 3.5 6.9v9.8L12 21.6l8.5-4.9V6.9L12 2Zm3.8 12.6c0 1.4-1 2.2-2.6 2.2-1.1 0-2-.4-2.5-1.1l1.1-.8c.3.4.8.7 1.4.7.7 0 1.1-.3 1.1-.9V9.2h1.5v5.4Zm-6.6 2.1H7.7V9.2h1.5v7.5Z" />
        </svg>
      );
    case "supabase":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M13.6 21.3c-.6.8-1.9.3-1.9-.7v-7.5h7.9c1.2 0 1.9 1.4 1.1 2.3l-7.1 5.9Zm-3.2-18.6c.6-.8 1.9-.3 1.9.7v7.5H4.4c-1.2 0-1.9-1.4-1.1-2.3l7.1-5.9Z" />
        </svg>
      );
    case "godot":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 3a8 8 0 0 0-8 8v5.5l2.5 1.5v2h3v-1.5h5V20h3v-2l2.5-1.5V11a8 8 0 0 0-8-8Zm-3.2 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6.4 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-3.2 1.2c.6 0 1 .4 1 1v1h-2v-1c0-.6.4-1 1-1Z" />
        </svg>
      );
    case "wsl":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" focusable="false" {...props}>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M7 9l3 3-3 3M13 15h4" />
        </svg>
      );
    case "chimerax":
    case "ucsf chimerax":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false" {...props}>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(35 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-35 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
        </svg>
      );
    case "audacity":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 3a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1.5v-6H6.2v-2a5.8 5.8 0 0 1 11.6 0v2h-2.3v6H17a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8Zm-1 8v6h2v-6h-2Zm-2.5 2v4h1.5v-4H8.5Zm5.5 0v4h1.5v-4H14Z" />
        </svg>
      );
    case "figma":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M8.5 3a3 3 0 0 0 0 6H12V3H8.5Zm0 6a3 3 0 0 0 0 6H12V9H8.5Zm0 6a3 3 0 1 0 3 3v-3H8.5ZM12 3v6h3.5a3 3 0 0 0 0-6H12Zm3.5 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        </svg>
      );
    case "photoshop":
    case "adobe photoshop":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M3 3h18v18H3V3Zm4 13h1.6v-2.7h1.2c1.8 0 2.9-1 2.9-2.6S11.6 8 9.8 8H7v8Zm1.6-4V9.3h1.1c.9 0 1.4.4 1.4 1.3s-.5 1.4-1.4 1.4H8.6Zm6.8 4.1c1.4 0 2.3-.7 2.3-1.8 0-1-.6-1.4-1.8-1.7l-.7-.2c-.6-.1-.8-.3-.8-.6s.3-.6.8-.6c.5 0 .9.2 1.3.5l.8-1c-.5-.5-1.2-.8-2-.8-1.3 0-2.2.7-2.2 1.8 0 1 .6 1.4 1.8 1.7l.7.2c.6.1.8.3.8.6s-.3.6-.9.6c-.6 0-1.1-.2-1.5-.6l-.8 1c.6.6 1.4.9 2.4.9Z" />
        </svg>
      );
    case "indesign":
    case "adobe indesign":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M3 3h18v18H3V3Zm4.2 13h1.7V8H7.2v8Zm6.1.1c.9 0 1.6-.4 2-.9v.8h1.5V7.5h-1.6v3.1c-.4-.5-1-.8-1.8-.8-1.6 0-2.7 1.3-2.7 3.2s1.1 3.1 2.6 3.1Zm.4-1.3c-.9 0-1.4-.7-1.4-1.8s.5-1.9 1.4-1.9c.8 0 1.4.7 1.4 1.9s-.6 1.8-1.4 1.8Z" />
        </svg>
      );
    case "illustrator":
    case "adobe illustrator":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M3 3h18v18H3V3Zm8 13h1.8L10.3 8H8.4L5.9 16h1.7l.5-1.8h2.4l.5 1.8Zm-2.5-3.1.9-3.1.9 3.1H8.5Zm6.6 3.1h1.6v-6h-1.6v6Zm.8-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
      );
    case "canva":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.4 14.5c-2.6 0-4.4-1.8-4.4-4.5s1.8-4.5 4.4-4.5c1.6 0 2.8.7 3.5 1.8l-1.5 1c-.4-.7-1.1-1.1-2-1.1-1.5 0-2.5 1.1-2.5 2.8s1 2.8 2.5 2.8c.9 0 1.6-.4 2.1-1.1l1.5 1c-.8 1.1-2 1.8-3.6 1.8Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" focusable="false" {...props}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
  }
}
