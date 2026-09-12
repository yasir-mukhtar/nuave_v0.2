import type { Metadata } from "next";
import AuditWorkflow from "../../AuditWorkflow";
import { PREVIEW_INTAKE_SURFACE } from "../../intakeSurface";

export const metadata: Metadata = {
  title: "Pratinjau intake | Nuave",
  description: "Pratinjau internal layar persiapan audit yang baru.",
  robots: { index: false, follow: false },
};

import IntakePreviewDemoSeed from "./IntakePreviewDemoSeed";

/**
 * Internal preview of the recovered intake surface (recovery plan §6.0).
 * Not linked anywhere; it seeds from sessionStorage the way the e2e specs do
 * and falls through to the existing renderer for unconverted screens.
 * `?demo=1` seeds a fictional confirmed brief first, so manual review lands
 * inside the intake screens without calling the identity/extraction APIs.
 */
export default async function IntakePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { demo } = await searchParams;
  const workflow = <AuditWorkflow intakeSurface={PREVIEW_INTAKE_SURFACE} />;
  return demo ? (
    <IntakePreviewDemoSeed>{workflow}</IntakePreviewDemoSeed>
  ) : (
    workflow
  );
}
