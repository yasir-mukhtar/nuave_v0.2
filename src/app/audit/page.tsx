import type { Metadata } from "next";
import { auditMode, newAuditEnabled } from "@/lib/audit/deployment-gate";
import AuditIntakeClient from "./audit-intake.client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Buat AI Visibility Report | Nuave",
  description:
    "Periksa satu bisnis, tinjau sepuluh pertanyaan, lalu buat AI Visibility Report berbasis bukti.",
};

type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** The server gate owns availability and mode. Synthetic-only stub behavior
 * remains available to the offline browser suite; no fixture enters intake. */
export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  if (!newAuditEnabled()) {
    return (
      <main lang="id">
        <h1 className="type-heading-lg">Audit tidak tersedia saat ini.</h1>
      </main>
    );
  }
  const params = searchParams ? await searchParams : undefined;
  const synthetic = auditMode() === "synthetic";
  return (
    <AuditIntakeClient
      live={!synthetic}
      glmStubBehavior={synthetic ? first(params?.["glm-stub"]) : undefined}
    />
  );
}
