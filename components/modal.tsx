"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native dialogs provide focus trapping, Escape, and an inert background. */
export function Modal({ children, className, label, labelledBy, onClose }: {
  children: ReactNode;
  className: string;
  label?: string;
  labelledBy?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`lab-dialog ${className}`}
      aria-label={label}
      aria-labelledby={labelledBy}
      data-lenis-prevent
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
        )].filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]"));
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) { event.preventDefault(); event.currentTarget.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {children}
    </dialog>
  );
}
