import type { Metadata } from "next";
import AuditWorkflow from "./AuditWorkflow";

export const metadata: Metadata = {
  title: "Create an AI Visibility Audit | Nuave",
  description:
    "Verify one client business, review ten questions, and create an evidence-led AI Visibility Report.",
};

export default function AuditPage() {
  return <AuditWorkflow />;
}
