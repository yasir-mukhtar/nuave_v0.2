import type { Metadata } from "next";
import { INTAKE_FIXTURES, type FixtureId } from "@/lib/intake/fixtures";
import IntakePreviewClient from "./intake-screens.client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Uji coba intake | Nuave",
  robots: { index: false, follow: false },
};
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Server gate selects the whole journey. Nothing links live customers here. */
export default async function NewIntakePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  if (
    !["true", "1"].includes(process.env.NUAVE_NEW_INTAKE_PREVIEW_ENABLED ?? "")
  ) {
    return (
      <main lang="id">
        <h1 className="type-heading-lg">
          Pratinjau intake baru tidak tersedia saat ini.
        </h1>
      </main>
    );
  }
  const params = searchParams ? await searchParams : undefined;
  const raw = first(params?.fixture);
  const fixtureId: FixtureId =
    raw === "F2" || raw === "F3" || raw === "F4" || raw === "F6" ? raw : "F1";
  // Optional recovery examples; scope and target are always chosen through the UI.
  return (
    <IntakePreviewClient
      fixture={INTAKE_FIXTURES[fixtureId]}
      failQuestionsOnce={first(params?.failure) === "questions"}
    />
  );
}
