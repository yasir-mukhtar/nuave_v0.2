"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuditNoticeProps = {
  title: string;
  tone?: "info" | "warning" | "danger";
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
  const isInfo = tone === "info";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        isDanger
          ? "border-[var(--red)] bg-[var(--red-light)]"
          : isInfo
            ? "border-[var(--action)] bg-[var(--action-soft)]"
            : "border-[var(--amber)] bg-[var(--amber-light)]",
        className,
      )}
      role="alert"
    >
      <span
        className={cn(
          "type-label-sm grid size-5 shrink-0 place-items-center rounded-full border",
          isDanger
            ? "border-[var(--red)] text-[var(--red)]"
            : isInfo
              ? "border-[var(--action)] text-[var(--action)]"
              : "border-[var(--amber)] text-[var(--amber)]",
        )}
        aria-hidden="true"
      >
        !
      </span>
      <div className="min-w-0">
        <h2 className="type-label m-0 text-foreground">{title}</h2>
        <div className="type-copy-sm mt-1 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
