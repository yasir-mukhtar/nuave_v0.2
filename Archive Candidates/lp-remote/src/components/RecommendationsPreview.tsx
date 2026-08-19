"use client";

import ActionItemPanel from "@/components/dashboard/ActionItemPanel";

const DUMMY_FINDINGS = [
  {
    title: "Optimalkan halaman kategori futsal dengan kata kunci AI",
    description:
      "AI tidak menyebut Ortuseight saat ditanya sepatu futsal terbaik di Indonesia. Halaman kategori butuh kata kunci yang relevan.",
    severity: "high" as const,
    problem_type: "meta_structure",
  },
  {
    title: "Buat konten perbandingan Ortuseight vs Specs",
    description:
      "Banyak pencarian AI membandingkan brand lokal. Belum ada konten perbandingan detail di website yang bisa dirujuk AI.",
    severity: "high" as const,
    problem_type: "content_gap",
  },
  {
    title: "Tambahkan FAQ tentang teknologi sol Ortus",
    description:
      "AI sering menjawab pertanyaan teknis soal material sepatu. Halaman FAQ terstruktur akan membantu AI merujuk brand Anda.",
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
