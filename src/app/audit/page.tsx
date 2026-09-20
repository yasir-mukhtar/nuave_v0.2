import type { Metadata } from "next";
import { auditMode, newAuditEnabled } from "@/lib/audit/deployment-gate";
import { INTAKE_FIXTURES, type FixtureId } from "@/lib/intake/fixtures";
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

/** Spec 010 R-08: the single public audit entry. The server gate owns
 * availability and mode; the `?fixture=`/`?glm=`/`?failure=`/`?glm-stub=`
 * harness parameters exist only for the synthetic test path — a live
 * deployment always starts the blank GLM journey and ignores them. */
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
  const raw = synthetic ? first(params?.fixture) : undefined;
  const fixtureId = raw && raw in INTAKE_FIXTURES ? (raw as FixtureId) : null;
  return (
    <AuditIntakeClient
      fixture={fixtureId ? INTAKE_FIXTURES[fixtureId] : undefined}
      blank={fixtureId === null}
      live={!synthetic}
      glmExperiment={synthetic ? first(params?.glm) === "1" : true}
      failQuestionsOnce={synthetic && first(params?.failure) === "questions"}
      glmStubBehavior={synthetic ? first(params?.["glm-stub"]) : undefined}
    />
  );
}
