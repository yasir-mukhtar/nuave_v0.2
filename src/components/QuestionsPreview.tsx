"use client";

const WITHOUT_BRAND = [
  "Sepatu lari lokal terbaik untuk pemula",
  "Klinik kecantikan terpercaya di Jakarta",
  "Aplikasi budgeting untuk orang awam",
];

const WITH_BRAND = [
  "Apakah [Brand] lebih baik dari kompetitor lokal?",
  "Apa keunggulan [Brand] dibandingkan merek lain?",
];

export default function QuestionsPreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] border border-border-light bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <p className="type-title text-gray-900 m-0">Review 10 pertanyaan</p>
        <span className="text-[11px] font-medium text-gray-400">
          Bisa diedit
        </span>
      </div>

      <div className="h-px bg-border-light shrink-0" />

      <div className="flex-1 min-h-0 px-4 py-3 flex flex-col gap-4 overflow-y-auto scroll-subtle">
        {/* Without brand */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-gray-500 m-0">
              Tanpa nama brand
            </p>
            <span className="text-[11px] font-medium text-gray-400">5</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {WITHOUT_BRAND.map((q) => (
              <div
                key={q}
                className="h-8 px-3 rounded-md bg-gray-100 flex items-center text-[12px] text-gray-700 truncate"
              >
                {q}
              </div>
            ))}
            <div className="h-8 px-3 rounded-md border border-dashed border-border-light flex items-center text-[12px] text-gray-400">
              +2 pertanyaan lainnya
            </div>
          </div>
        </div>

        {/* With brand */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-gray-500 m-0">
              Dengan nama brand
            </p>
            <span className="text-[11px] font-medium text-gray-400">5</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {WITH_BRAND.map((q) => (
              <div
                key={q}
                className="h-8 px-3 rounded-md bg-[#ECE8FF] flex items-center text-[12px] text-gray-700 truncate"
              >
                {q}
              </div>
            ))}
            <div className="h-8 px-3 rounded-md border border-dashed border-border-light flex items-center text-[12px] text-gray-400">
              +3 pertanyaan lainnya
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
