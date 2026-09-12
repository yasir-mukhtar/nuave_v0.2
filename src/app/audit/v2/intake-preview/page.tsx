import type { Metadata } from "next";
import AuditWorkflow from "../../AuditWorkflow";
import { PREVIEW_INTAKE_SURFACE } from "../../intakeSurface";
import IntakePreviewDemo from "./IntakePreviewDemo";

export const metadata: Metadata = {
  title: "Pratinjau intake | Nuave",
  description: "Pratinjau internal layar persiapan audit yang baru.",
  robots: { index: false, follow: false },
};

/**
 * Internal preview of the recovered intake surface (recovery plan §6.0).
 * Not linked anywhere; it seeds from sessionStorage the way the e2e specs do
 * and falls through to the existing renderer for unconverted screens.
 */
export default async function IntakePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { demo } = await searchParams;
  if (demo === "1") return <IntakePreviewDemo />;
  return <AuditWorkflow intakeSurface={PREVIEW_INTAKE_SURFACE} />;
}
