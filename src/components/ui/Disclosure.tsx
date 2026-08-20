"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { IconChevronDown } from "@tabler/icons-react";

export interface DisclosureProps extends React.HTMLAttributes<HTMLDetailsElement> {
  summary: React.ReactNode;
  defaultOpen?: boolean;
}

export function Disclosure({
  summary,
  defaultOpen = false,
  children,
  className,
  ...props
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      className={clsx(
        "group rounded-md border border-border-default bg-page text-sm overflow-hidden",
        className,
      )}
      {...props}
    >
      <summary className="flex items-center justify-between gap-4 p-4 font-medium text-text-heading cursor-pointer list-none select-none transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-[-2px]">
        <span>{summary}</span>
        <IconChevronDown
          aria-hidden="true"
          className={clsx(
            "h-4 w-4 text-text-muted transition-transform duration-base ease-out group-open:rotate-180 flex-shrink-0",
          )}
        />
      </summary>
      <div className="p-4 pt-0 text-text-body border-t border-border-light mt-2">
        {children}
      </div>
    </details>
  );
}
