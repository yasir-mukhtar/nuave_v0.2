import type { Metadata } from "next";
import AuditWorkflow from "./AuditWorkflow";

export const metadata: Metadata = {
  title: "Buat Audit AI Visibility | Nuave",
  description:
    "Buat, tinjau, jalankan, dan ekspor satu audit AI Visibility berbasis bukti.",
};

export default function AuditPage() {
  return <AuditWorkflow />;
}
