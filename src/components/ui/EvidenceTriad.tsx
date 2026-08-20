import React from "react";
import clsx from "clsx";

export interface EvidenceTriadProps extends React.HTMLAttributes<HTMLDivElement> {
  finding: React.ReactNode;
  interpretation: React.ReactNode;
  action: React.ReactNode;
}

export function EvidenceTriad({
  finding,
  interpretation,
  action,
  className,
  ...props
}: EvidenceTriadProps) {
  return (
    <div
      className={clsx(
        "rounded-md border border-border-default bg-page divide-y divide-border-light text-sm shadow-card overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* 1. Observation: Yang ditemukan */}
      <div className="p-4 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Yang ditemukan
        </p>
        <div className="text-text-heading leading-relaxed">{finding}</div>
      </div>

      {/* 2. Interpretation: Artinya bagi Anda */}
      <div className="p-4 space-y-1.5 bg-surface/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Artinya bagi Anda
        </p>
        <div className="text-text-body leading-relaxed">{interpretation}</div>
      </div>

      {/* 3. Action: Yang dapat dilakukan */}
      <div className="p-4 space-y-1.5 bg-surface">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Yang dapat dilakukan
        </p>
        <div className="text-text-heading leading-relaxed">{action}</div>
      </div>
    </div>
  );
}
