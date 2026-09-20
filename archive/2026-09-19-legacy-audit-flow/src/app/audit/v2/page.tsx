import type { Metadata } from "next";
import AuditV2Journey from "./AuditV2Journey";

export const metadata: Metadata = {
  title: "Cek bisnis Anda di AI | Nuave",
  description:
    "Pratinjau identitas bisnis, simulasi pembayaran, lalu siapkan AI Visibility Report.",
};

export default function AuditV2Page() {
  return <AuditV2Journey />;
}
