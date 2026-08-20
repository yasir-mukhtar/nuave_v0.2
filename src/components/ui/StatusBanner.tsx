import React from "react";
import clsx from "clsx";

export type StatusTone = "neutral" | "pending" | "confirmed" | "error" | "info";

export interface StatusBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: StatusTone;
  title?: string;
  action?: React.ReactNode;
}

export function StatusBanner({
  tone = "neutral",
  title,
  action,
  children,
  className,
  ...props
}: StatusBannerProps) {
  const toneStyles: Record<StatusTone, string> = {
    neutral: "bg-surface border-border-default text-text-body",
    pending: "bg-amber-light border-amber-border text-amber-900",
    confirmed: "bg-success-light border-green-border text-green-900",
    error: "bg-error-light border-red-border text-red-900",
    info: "bg-brand-light border-purple-200 text-brand-dark",
  };

  return (
    <div
      role="status"
      className={clsx(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md border text-sm leading-normal",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold text-text-heading">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
