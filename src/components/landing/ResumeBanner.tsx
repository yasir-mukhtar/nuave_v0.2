"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { readActiveOrder, readSmartSession } from "@/lib/intake/smart-session";

/** Progress saved in this browser: offered back before anything else. */
export function ResumeBanner({ className }: { className?: string }) {
  const [resume, setResume] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (readActiveOrder()) {
          setResume("Audit Anda sedang berjalan");
          return;
        }
        const saved = readSmartSession();
        // A paid order always resumes, even one a reload stopped mid-reading.
        if (
          saved &&
          (saved.order ||
            (saved.stage !== "entry" && saved.stage !== "reading"))
        ) {
          const name = saved.brand?.name ?? saved.entry.name.trim();
          setResume(name ? `Lanjutkan audit ${name}` : "Lanjutkan audit Anda");
        }
      } catch {
        // Storage blocked: nothing to resume.
      }
    });
  }, []);
  if (!resume) return null;
  return (
    <Link
      href="/audit"
      className={cn(
        "type-label-lg flex min-h-12 w-full items-center justify-between gap-3 rounded-tile bg-stone-50 px-4 text-left text-ink-900 no-underline transition-colors hover:bg-stone-100",
        className,
      )}
    >
      <span className="min-w-0 truncate">{resume}</span>
      <IconArrowRight
        size={18}
        stroke={1.75}
        aria-hidden="true"
        className="shrink-0"
      />
    </Link>
  );
}
