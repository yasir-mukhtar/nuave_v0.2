import type { Metadata } from "next";
import IntakeBriefConcept from "./IntakeBriefConcept";

export const metadata: Metadata = {
  title: "Konsep Brief Bisnis | Nuave",
  description:
    "Konsep desain untuk tahap verifikasi brief bisnis sebelum audit Nuave.",
  robots: { index: false, follow: false },
};

export default function IntakeBriefConceptPage() {
  return <IntakeBriefConcept />;
}
