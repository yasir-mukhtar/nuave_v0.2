"use client";

import ActionItemPanel from "@/components/dashboard/ActionItemPanel";

const DUMMY_FINDINGS = [
  {
    title: "Optimize futsal category page with AI keywords",
    description:
      "AI doesn't mention Ortuseight when asked about the best futsal shoes in Indonesia. The category page needs relevant keywords.",
    severity: "high" as const,
    problem_type: "meta_structure",
  },
  {
    title: "Create Ortuseight vs Specs comparison content",
    description:
      "Many AI searches compare local brands. There's no detailed comparison content on the website that AI can reference.",
    severity: "high" as const,
    problem_type: "content_gap",
  },
  {
    title: "Add FAQ about Ortus sole technology",
    description:
      "AI frequently answers technical questions about shoe materials. A structured FAQ page will help AI reference your brand.",
    severity: "medium" as const,
    problem_type: "structured_data",
  },
];

export default function RecommendationsPreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px]">
      <ActionItemPanel items={DUMMY_FINDINGS} auditId="demo" />
    </div>
  );
}
