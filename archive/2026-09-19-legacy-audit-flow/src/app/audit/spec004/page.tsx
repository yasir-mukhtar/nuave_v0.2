import type { Metadata } from "next";
import Spec004Demo from "./Spec004Demo";

export const metadata: Metadata = {
  title: "Pratinjau Hero Intake (Spec 004) | Nuave",
  description:
    "Pratinjau layar pertama intake: satu kolom untuk link situs atau Instagram dengan transisi pemindaian.",
  robots: { index: false, follow: false },
};

export default function Spec004PreviewPage() {
  return <Spec004Demo />;
}
