"use client";

import { useEffect, useRef, useState } from "react";

export function useClipboard() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current++; clearTimeout(timer.current); }, []);

  const copy = async (text: string) => {
    const current = ++attempt.current;
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      if (current !== attempt.current) return;
      setStatus("copied");
    } catch {
      if (current !== attempt.current) return;
      setStatus("error");
    }
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  };
  return { status, copy };
}
