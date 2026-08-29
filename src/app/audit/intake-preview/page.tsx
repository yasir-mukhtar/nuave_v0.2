import type { Metadata } from "next";
import IntakeThemePreview from "./IntakeThemePreview";

export const metadata: Metadata = {
  title: "Intake theme preview | Nuave",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IntakePreviewPage() {
  return <IntakeThemePreview />;
}
