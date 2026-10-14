import type { Metadata } from "next";
import UjiForm from "./UjiForm";

/** Spec 017 R-20 (Q6): the founder test-pass entry. No link anywhere points
 * here, and search engines are told to stay away. */
export const metadata: Metadata = {
  title: "Uji | Nuave",
  robots: { index: false, follow: false },
};

export default function UjiPage() {
  return <UjiForm />;
}
