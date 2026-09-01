"use client";

import { CANONICAL_COMPOSITION_COUNTS } from "@/lib/audit/measurement-matrix";

export default function ReportPagePreview() {
  const { unbranded, branded } = CANONICAL_COMPOSITION_COUNTS;
  return (
    <div
      role="region"
      aria-label="Contoh laporan ilustratif"
      data-report-preview="illustrative"
      className="flex h-[310px] w-[340px] flex-col overflow-hidden rounded-[6px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="flex shrink-0 items-center justify-between bg-[#0d1738] px-4 py-3">
        <p className="type-label-sm m-0 text-white">Contoh laporan</p>
        <span className="type-label-sm text-white/60">Ilustrasi</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div
          data-illustrative-result="true"
          aria-hidden="true"
          className="flex flex-col gap-3 rounded-md border border-border-light bg-gray-50 p-3"
          style={{
            filter: "blur(8px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <p className="type-label-sm m-0 text-gray-500">Contoh hasil</p>
          <p className="type-label-sm m-0 text-[#111827]">
            Bisnis Anda muncul di X dari 10 pertanyaan
          </p>
          <p className="type-label-sm m-0 text-gray-500">
            {`Tanpa menyebut bisnis Anda: …/${unbranded} · Menyebut bisnis Anda: …/${branded}`}
          </p>
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-2 rounded-full bg-gray-300" />
            <div className="h-2 w-4/5 rounded-full bg-gray-300" />
            <div className="h-2 w-3/5 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border-light px-4 py-2.5">
        <span className="type-label-sm text-gray-400">
          Bukan hasil bisnis Anda
        </span>
        <span className="type-label-sm flex h-7 items-center rounded-md bg-brand px-3 text-white">
          Contoh
        </span>
      </div>
    </div>
  );
}
