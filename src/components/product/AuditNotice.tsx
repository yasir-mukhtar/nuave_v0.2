"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuditNoticeProps = {
  title: string;
  tone?: "warning" | "danger";
  children: ReactNode;
  className?: string;
};

/** A semantic audit notice; it is not a generic UI primitive. */
export function AuditNotice({
  title,
  tone = "warning",
  children,
  className,
}: AuditNoticeProps) {
  const isDanger = tone === "danger";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        isDanger
          ? "border-[var(--red)] bg-[var(--red-light)]"
          : "border-[var(--amber)] bg-[var(--amber-light)]",
        className,
      )}
      role="alert"
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border text-xs font-bold",
          isDanger
            ? "border-[var(--red)] text-[var(--red)]"
            : "border-[var(--amber)] text-[var(--amber)]",
        )}
        aria-hidden="true"
      >
        !
      </span>
      <div className="min-w-0">
        <h2 className="m-0 font-heading text-sm font-semibold text-foreground">
          {title}
        </h2>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
