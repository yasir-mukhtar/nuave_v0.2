import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a Google Favicon URL for the given domain or competitor name.
 * If a domain is provided, uses it directly. Otherwise guesses from the name.
 */
export function getFaviconUrl(nameOrDomain: string, websiteUrl?: string | null, size = 64): string {
  const raw = websiteUrl || `${nameOrDomain.toLowerCase().replaceAll(/\s+/g, "")}.com`;
  // Extract hostname when a full URL is provided, so Google gets a clean domain
  let domain = raw;
  try { domain = new URL(raw).hostname; } catch { /* already a bare domain */ }
  return `/api/favicon?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
