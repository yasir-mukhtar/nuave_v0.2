"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
] as const;

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({
  className,
}: Readonly<LanguageSwitcherProps>) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(newLocale: string) {
    if (newLocale === locale) return;

    // This browser-side preference write is intentionally triggered by a user event.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;

    // Refresh the page to pick up the new locale
    startTransition(() => {
      router.refresh();
    });
  }

  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          type="button"
          className={cn(
            "flex cursor-pointer items-center gap-1.5 border-none bg-transparent px-2 py-1.5 text-[13px] font-medium transition-colors hover:opacity-70 focus-visible:outline-none",
            isPending && "opacity-50",
            className,
          )}
        >
          <span className="text-base leading-none">{current.flag}</span>
          <IconChevronDown className="size-3.5 text-[var(--lp-text-secondary,#6B7280)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-[180px]">
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => handleChange(item.code)}
            className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
          >
            <span className="text-base leading-none">{item.flag}</span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.code === locale && (
              <IconCheck className="size-4 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
