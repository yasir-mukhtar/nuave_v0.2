import type { Metadata } from "next";
import AuditEntryShell from "./AuditEntryShell";

export const metadata: Metadata = {
  title: "Buat AI Visibility Report | Nuave",
  description:
    "Periksa satu bisnis, tinjau sepuluh pertanyaan, lalu buat AI Visibility Report berbasis bukti.",
};

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  return (
    <AuditEntryShell landingExtracted={params.entry === "landing-extracted"} />
  );
}
