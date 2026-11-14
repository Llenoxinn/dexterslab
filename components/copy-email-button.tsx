"use client";

import { useClipboard } from "@/lib/use-clipboard";
import { site } from "@/lib/site";

export function CopyEmailButton() {
  const { status, copy } = useClipboard();

  return (
    <button type="button" className="choice-chip contact-copy-btn" onClick={() => copy(site.email)} aria-live="polite">
      {status === "copied" ? "Email copied!" : status === "error" ? `Select and copy: ${site.email}` : `Copy ${site.email}`}
    </button>
  );
}
