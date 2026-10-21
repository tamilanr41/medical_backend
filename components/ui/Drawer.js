"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Slide-in drawer shell used for the compact navigation sidebar.
 * Dismisses on overlay click, Escape and close button; manages focus and
 * scroll locking like an accessible dialog.
 */
export default function Drawer({
  open,
  onClose,
  label,
  children,
  className,
  side = "left",
  size = "w-72",
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeButton = panelRef.current?.querySelector("[data-drawer-close]");
    closeButton?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isRight = side === "right";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="anim-fade-in absolute inset-0 bg-navy-950/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "absolute inset-y-0 flex max-w-[92vw] flex-col bg-panel",
          size,
          isRight
            ? "anim-drawer-right right-0 border-l border-ink-200 shadow-[-24px_0_60px_-30px_rgba(16,31,53,0.5)]"
            : "anim-drawer left-0 border-r border-ink-200 shadow-[24px_0_60px_-30px_rgba(16,31,53,0.5)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

