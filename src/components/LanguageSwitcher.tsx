'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
] as const;

interface LanguageSwitcherProps {
  /** Variant: 'dropdown' for settings, 'compact' for navbar */
  variant?: 'dropdown' | 'compact';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dropdown', className }: Readonly<LanguageSwitcherProps>) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(newLocale: string) {
    if (newLocale === locale) return;

    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;

    // Refresh the page to pick up the new locale
    startTransition(() => {
      router.refresh();
    });
  }

  if (variant === 'compact') {
    const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isPending}>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 bg-transparent border-none px-2 py-1.5 cursor-pointer text-[13px] font-medium transition-colors hover:opacity-70 focus-visible:outline-none",
              isPending && "opacity-50",
              className
            )}
          >
            <span className="text-base leading-none">{current.flag}</span>
            <IconChevronDown className="size-3.5 text-[var(--lp-text-secondary,#6B7280)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px] z-[100]">
          {LOCALES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => handleChange(l.code)}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="flex-1 text-sm font-medium">{l.label}</span>
              {l.code === locale && (
                <IconCheck className="size-4 text-foreground" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // dropdown variant for settings
  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className={cn(
        "w-full max-w-[280px] px-3 py-2 rounded-[var(--radius-sm)] border border-border-light bg-white text-text-heading type-body cursor-pointer",
        isPending && "opacity-50",
        className
      )}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
