"use client";

import { CANONICAL_COMPOSITION_COUNTS } from "@/lib/audit/measurement-matrix";

type ExampleReportPreviewProps = {
  id?: string;
  ariaLabel?: string;
};

export default function ExampleReportPreview({
  id = "contoh-laporan",
  ariaLabel = "Contoh laporan ilustratif",
}: ExampleReportPreviewProps) {
  const { unbranded, branded } = CANONICAL_COMPOSITION_COUNTS;
  return (
    <section
      id={id}
      role="region"
      aria-label={ariaLabel}
      data-report-preview="illustrative"
      className="mx-auto max-w-[640px] overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white text-left shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
    >
      <header className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
        <p className="type-label m-0 text-gray-900">Contoh laporan</p>
        <span className="type-label-sm rounded-full bg-gray-100 px-2.5 py-1 text-gray-500">
          Ilustrasi
        </span>
      </header>

      <div className="px-6 pt-4">
        <p className="type-copy-sm m-0 text-gray-600">
          Contoh tampilan saja — bukan hasil untuk bisnis Anda.
        </p>
      </div>

      <div className="p-6 pt-4">
        <div
          data-illustrative-result="true"
          aria-hidden="true"
          className="flex flex-col gap-4 rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4"
          style={{
            filter: "blur(9px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div>
            <p className="type-label-sm m-0 text-gray-500">Contoh hasil</p>
            <p className="type-label m-0 mt-1 text-[#111827]">
              Bisnis Anda muncul di X dari 10 pertanyaan
            </p>
            <p className="type-label-sm m-0 mt-1 text-gray-500">
              {`Tanpa menyebut bisnis Anda: …/${unbranded} · Menyebut bisnis Anda: …/${branded}`}
            </p>
          </div>
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-3 w-4/5 rounded-full bg-gray-300" />
            <div className="h-3 w-full rounded-full bg-gray-300" />
            <div className="h-3 w-3/5 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      <p className="type-label-sm m-0 border-t border-[#E5E7EB] px-6 py-4 text-gray-500">
        Hasil nyata baru tersedia setelah pembayaran simulasi dan audit
        dijalankan.
      </p>
    </section>
  );
}
