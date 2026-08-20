"use client";

export default function ExampleReportPreview() {
  return (
    <div
      id="contoh-laporan"
      className="max-w-[640px] mx-auto rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
        <p className="type-title text-gray-900 m-0">Contoh laporan</p>
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
          Ilustrasi
        </span>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Direct count — ink, with denominator, no band or percentage */}
        <div className="rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
          <p className="text-[12px] font-medium text-gray-500 m-0">
            Hasil langsung
          </p>
          <p className="text-[14px] font-semibold text-[#111827] m-0 mt-1">
            Bisnis Anda muncul di 4 dari 10 pertanyaan
          </p>
          <p className="text-[28px] font-bold tracking-[-1px] text-[#111827] m-0 leading-none mt-1">
            4/10
          </p>
          <p className="text-[12px] text-gray-500 m-0 mt-1">
            Tanpa menyebut bisnis Anda: 1/5 · Menyebut bisnis Anda: 3/5
          </p>
        </div>

        {/* ChatGPT answer quote — fictional-only product names */}
        <div>
          <p className="text-[12px] font-medium text-gray-500 m-0 mb-2">
            Jawaban ChatGPT
          </p>
          <div className="rounded-[8px] border border-[#E5E7EB] p-4">
            <p className="text-[13px] leading-[1.6] text-gray-900 m-0">
              <span className="font-bold">1.</span> Toko Sepatu Jaya, salah satu
              brand lokal untuk sepatu lari dan futsal. Contoh model: Seri Ceria
              (daily trainer), Lincah Ringan (ringan).
            </p>
            <p className="text-[12px] text-gray-400 m-0 mt-2">
              Sumber:{" "}
              <span className="text-brand underline underline-offset-2">
                tokosepatujaya.example
              </span>
            </p>
          </div>
        </div>

        {/* Findings */}
        <div>
          <p className="text-[12px] font-medium text-gray-500 m-0 mb-2">
            Temuan dan rekomendasi
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5 rounded-[8px] bg-amber-50 border border-amber-200/60 px-3 py-2.5 text-[13px] leading-[1.5] text-gray-700">
              <span className="shrink-0 mt-[1px]">•</span>
              Jam operasional tidak konsisten di 2 situs. Perbarui agar AI
              mengutip informasi yang sama.
            </div>
            <div className="flex items-start gap-2.5 rounded-[8px] bg-red-50 border border-red-200/60 px-3 py-2.5 text-[13px] leading-[1.5] text-gray-700">
              <span className="shrink-0 mt-[1px]">•</span>
              Belum ada halaman FAQ. Buat halaman tanya jawab agar AI punya
              struktur yang mudah dikutip.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
