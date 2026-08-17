import type { Metadata } from "next";
import AuditWorkflow from "./AuditWorkflow";

export const metadata: Metadata = {
  title: "Buat AI Visibility Report | Nuave",
  description:
    "Periksa satu bisnis, tinjau sepuluh pertanyaan, lalu buat AI Visibility Report berbasis bukti.",
};

export default function AuditPage() {
  return <AuditWorkflow />;
}
