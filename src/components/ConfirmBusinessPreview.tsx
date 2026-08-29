"use client";

export default function ConfirmBusinessPreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] border border-border-light bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <p className="type-label text-gray-900 m-0">Konfirmasi bisnis</p>
        <span className="w-2 h-2 rounded-full bg-green-500" />
      </div>

      <div className="h-px bg-border-light shrink-0" />

      {/* Form mock */}
      <div className="flex-1 min-h-0 px-4 py-3 flex flex-col gap-3 overflow-hidden">
        <div className="space-y-1.5">
          <p className="type-label-sm text-gray-500 m-0">Nama bisnis</p>
          <div className="type-copy-sm h-9 rounded-md border border-border-light bg-gray-50 px-3 flex items-center text-gray-900">
            Toko Sepatu Jaya
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="type-label-sm text-gray-500 m-0">Website</p>
          <div className="type-copy-sm h-9 rounded-md border border-border-light bg-gray-50 px-3 flex items-center text-gray-400">
            tokosepatujaya.com
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="type-label-sm text-gray-500 m-0">
            Penjelasan singkat
          </p>
          <div className="type-copy-sm h-16 rounded-md border border-border-light bg-gray-50 px-3 py-2 text-gray-400">
            Sepatu lari dan futsal lokal untuk pasar Indonesia, dijual di
            marketplace dan toko fisik.
          </div>
        </div>
        <div className="mt-auto">
          <div className="type-label-sm h-9 rounded-md bg-brand flex items-center justify-center text-white">
            Lanjut
          </div>
        </div>
      </div>
    </div>
  );
}
