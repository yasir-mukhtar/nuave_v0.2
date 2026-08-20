import React from "react";
import clsx from "clsx";

export type ProvenanceType =
  | "website"
  | "google_maps"
  | "instagram"
  | "nuave_suggestion"
  | "user_added"
  | "needs_review";

export const PROVENANCE_LABELS: Record<ProvenanceType, string> = {
  website: "Ditemukan di website",
  google_maps: "Ditemukan di Google Maps",
  instagram: "Ditemukan di Instagram",
  nuave_suggestion: "Saran Nuave",
  user_added: "Ditambahkan oleh Anda",
  needs_review: "Perlu diperiksa",
};

export interface ProvenancePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: ProvenanceType;
  labelOverride?: string;
}

export function ProvenancePill({
  type,
  labelOverride,
  className,
  ...props
}: ProvenancePillProps) {
  const label = labelOverride ?? PROVENANCE_LABELS[type];

  const toneStyles: Record<ProvenanceType, string> = {
    website: "bg-surface border-border-default text-text-muted",
    google_maps: "bg-surface border-border-default text-text-muted",
    instagram: "bg-surface border-border-default text-text-muted",
    nuave_suggestion: "bg-brand-light border-purple-200 text-brand-dark",
    user_added: "bg-surface border-border-default text-text-muted",
    needs_review: "bg-amber-light border-amber-border text-amber-800",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-sm border select-none",
        toneStyles[type],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
