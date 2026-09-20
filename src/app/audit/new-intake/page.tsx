import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Audit visibilitas AI | Nuave",
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

/** Spec 010 R-08: `/audit` is the single public entry — the former preview
 * path forwards here, keeping the harness parameters usable for the
 * synthetic-mode test suite. */
export default async function NewIntakeRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") query.append(key, item);
    }
  }
  const suffix = query.toString();
  redirect(suffix ? `/audit?${suffix}` : "/audit");
}
