"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The v2 provenance tag ("Hi/Badge"): a quiet stone pill. */
export function OriginTag({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <span
      id={id}
      className={cn(
        "type-label-sm inline-flex shrink-0 rounded-chip bg-stone-100 px-2.5 py-1 text-ink-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

const ORIGIN_TAG = {
  website: "Ditemukan di website",
  nuave: "Saran Nuave",
  owner: "Dari Anda",
} as const;

/**
 * Where a prepared answer came from, said once per screen (v2: "the source is
 * stated once"): the tag, then an optional plain-language tail.
 */
export function OriginNote({
  origin,
  text,
  className,
}: {
  origin: keyof typeof ORIGIN_TAG;
  text?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <OriginTag>{ORIGIN_TAG[origin]}</OriginTag>
      {text ? <span className="type-copy-sm text-ink-600">{text}</span> : null}
    </span>
  );
}

export function ScreenError({ error }: { error?: string | null }) {
  return error ? (
    <p role="alert" className="type-copy-sm m-0 mt-4 text-error">
      {error}
    </p>
  ) : null;
}

/** Case- and space-insensitive equality for Indonesian chip text. */
export function sameText(a: string, b: string): boolean {
  return (
    a.trim().toLocaleLowerCase("id-ID") === b.trim().toLocaleLowerCase("id-ID")
  );
}
