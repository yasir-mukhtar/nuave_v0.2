"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-desc" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-base"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content panel */}
      <div
        ref={dialogRef}
        className={clsx(
          "relative z-10 w-full max-w-md rounded-lg border border-border-default bg-page p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 duration-base",
          className,
        )}
      >
        <div className="space-y-1.5">
          <h3
            id="dialog-title"
            className="text-lg font-semibold text-text-heading leading-tight"
          >
            {title}
          </h3>
          {description && (
            <p
              id="dialog-desc"
              className="text-sm text-text-muted leading-normal"
            >
              {description}
            </p>
          )}
        </div>

        {children && <div className="text-sm text-text-body">{children}</div>}

        {actions && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
