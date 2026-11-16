/**
 * The dexterslab mark: a conical flask on DOS blue, its liquid the lab's teal, with a parol star
 * rising through it. Bold shapes only, so it still reads at 16px in a browser tab.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="logo-flask">
          <path d="M13 11V6h6v5l6.6 11.4c1 1.8-.3 4-2.3 4H8.7c-2 0-3.3-2.2-2.3-4L13 11Z" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="8" fill="#1313ba" />
      <path d="M13 11V6h6v5l6.6 11.4c1 1.8-.3 4-2.3 4H8.7c-2 0-3.3-2.2-2.3-4L13 11Z" fill="#f6f6fc" />
      <rect x="4" y="16.4" width="24" height="12" fill="#66c4cf" clipPath="url(#logo-flask)" />
      <rect x="11.5" y="4" width="9" height="2.6" rx="1.3" fill="#f6f6fc" />
      <path d="M16 17.6l.85 2.23 2.38.12-1.85 1.5.62 2.3-2-1.3-2 1.3.62-2.3-1.85-1.5 2.38-.12Z" fill="#ffd772" />
      <circle cx="20.6" cy="20" r="1.1" fill="#f6f6fc" opacity=".85" />
      <circle cx="11.8" cy="22.6" r=".8" fill="#f6f6fc" opacity=".7" />
    </svg>
  );
}
