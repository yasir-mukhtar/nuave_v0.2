import type { Metadata } from "next";
import { INTAKE_FIXTURES, type FixtureId } from "@/lib/intake/fixtures";
import type {
  IntakeEntryMode,
  IntakeScopeChoice,
} from "@/lib/intake/navigation";
import IntakePreviewClient from "./intake-screens.client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pratinjau intake baru | Nuave",
  description:
    "Pratinjau pengembangan non-produksi untuk perjalanan intake baru Nuave.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Server-controlled gate for the non-production new-intake preview. Never
 * exposed to the client bundle (`no NEXT_PUBLIC_` prefix) and never linked
 * from any page. Set `NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true` on a dev server
 * to view the new journey.
 */
function isNewIntakePreviewEnabled(): boolean {
  const raw = process.env.NUAVE_NEW_INTAKE_PREVIEW_ENABLED;
  return raw === "true" || raw === "1";
}

function PreviewUnavailable() {
  return (
    <main lang="id">
      <p>Pratinjau intake baru</p>
      <h1>Pratinjau intake baru tidak tersedia saat ini.</h1>
      <p>Aktifkan di server pengembangan untuk melihat perjalanan baru.</p>
    </main>
  );
}

type PreviewSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Fixture + graph drivers for the skeleton preview (no live data).
 * - default: F1 rich, read path, brand scope.
 * - `entry=manual` → F5 manual fallback (enters at s-scope).
 * - `brand=fix` → F4 wrong identity (one brand-fix loop).
 * - `scope=cabang|produk` → branch/product conditional path.
 * - `market=skip` → drops s-market (geography immaterial).
 * - `fixture=F2|F3|F6` → messy/conflict/failure fixture on the read path.
 */
function fixtureForParams(searchParams?: PreviewSearchParams): {
  fixtureId: FixtureId;
  entry: IntakeEntryMode;
} {
  if (firstParam(searchParams?.entry) === "manual")
    return { fixtureId: "F5", entry: "manual" };
  if (firstParam(searchParams?.brand) === "fix")
    return { fixtureId: "F4", entry: "read" };
  const raw = firstParam(searchParams?.fixture);
  if (raw === "F2" || raw === "F3" || raw === "F6")
    return { fixtureId: raw, entry: "read" };
  return { fixtureId: "F1", entry: "read" };
}

/**
 * Unlinked non-production preview entry for the new intake journey.
 * Always renders the complete new shell; never the legacy journey.
 * Screen wiring lives in the client module; this server module passes
 * serializable props only.
 */
export default async function NewIntakePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<PreviewSearchParams>;
}) {
  if (!isNewIntakePreviewEnabled()) {
    return <PreviewUnavailable />;
  }
  const resolved = searchParams ? await searchParams : undefined;
  const scopeRaw = firstParam(resolved?.scope);
  const stubScope: IntakeScopeChoice =
    scopeRaw === "cabang" || scopeRaw === "produk" ? scopeRaw : "brand";
  const { fixtureId, entry } = fixtureForParams(resolved);
  return (
    <IntakePreviewClient
      entry={entry}
      stubScope={stubScope}
      stubBrandNeedsFix={firstParam(resolved?.brand) === "fix"}
      stubMarketSkipped={firstParam(resolved?.market) === "skip"}
      fixture={INTAKE_FIXTURES[fixtureId]}
      withArrival={firstParam(resolved?.arrival) === "1"}
    />
  );
}
