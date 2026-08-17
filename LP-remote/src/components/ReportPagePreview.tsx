"use client";

export default function ReportPagePreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
      {/* Report page header */}
      <div className="shrink-0 bg-[#0d1738] px-4 py-3 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-white m-0">Laporan Visibilitas AI</p>
        <span className="text-[10px] text-white/60">Toko Sepatu Jaya</span>
      </div>

      {/* Report body */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-subtle px-4 py-3 flex flex-col gap-3">
        {/* Score */}
        <div className="rounded-md border border-border-light bg-gray-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Skor AI Visibility</span>
            <span className="text-[13px] font-bold text-gray-900">Sedang</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 mt-2 overflow-hidden">
            <div className="h-full w-[55%] rounded-full bg-brand" />
          </div>
        </div>

        {/* AI response */}
        <div className="rounded-md border border-border-light p-3">
          <p className="text-[11px] font-medium text-gray-500 m-0 mb-1">Respon AI</p>
          <p className="text-[12px] leading-[1.5] text-gray-900 m-0">
            "1. Toko Sepatu Jaya, salah satu brand lokal yang dikenal untuk sepatu lari dan futsal."
          </p>
          <p className="text-[11px] text-gray-400 m-0 mt-1.5">
            Analisis: disebut di 3 dari 10 pertanyaan.
          </p>
        </div>

        {/* Recommendations */}
        <div className="rounded-md border border-border-light p-3">
          <p className="text-[11px] font-medium text-gray-500 m-0 mb-1">Rekomendasi</p>
          <ul className="text-[12px] leading-[1.5] text-gray-700 m-0 pl-4 list-disc">
            <li>Tambah halaman FAQ yang bisa dibaca AI</li>
            <li>Perbarui jam operasional agar konsisten</li>
          </ul>
        </div>
      </div>

      {/* Footer action */}
      <div className="shrink-0 border-t border-border-light px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Ilustrasi</span>
        <div className="h-7 px-3 rounded-md bg-brand flex items-center text-[11px] font-medium text-white">
          Download PDF
        </div>
      </div>
    </div>
  );
}
