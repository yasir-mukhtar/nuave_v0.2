"use client";

import { IconX, IconCircleCheckFilled } from "@tabler/icons-react";

export default function PromptResultPreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] border border-border-light bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <p className="type-title text-gray-900 m-0">Hasil Uji Pertanyaan</p>
        <span className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
          <IconX size={18} stroke={2} />
        </span>
      </div>

      <div className="h-px bg-border-light shrink-0" />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scroll-subtle">
        {/* Prompt bubble */}
        <div className="flex justify-start">
          <div className="rounded-xl bg-brand px-4 py-2.5 max-w-[85%]">
            <p className="text-[13px] leading-[1.5] text-white m-0">
              Apa sepatu lari lokal terbaik untuk pemula?
            </p>
          </div>
        </div>

        {/* Mentioned badge */}
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-medium text-gray-700">
            <IconCircleCheckFilled size={16} className="text-green-600" />
            Ortuseight disebut
          </span>
        </div>

        {/* AI answer */}
        <div className="space-y-1.5">
          <p className="text-[13px] leading-[1.6] text-gray-900 m-0">
            <span className="font-bold">1.</span>{" "}
            <span className="font-bold text-brand underline decoration-brand/30 underline-offset-2">Ortuseight</span>
          </p>
          <p className="text-[13px] leading-[1.6] text-gray-600 m-0">
            Salah satu brand lokal paling serius yang mengembangkan sepatu lari.
          </p>
          <p className="text-[13px] leading-[1.6] text-gray-600 m-0">Contoh model:</p>
          <ul className="text-[13px] leading-[1.6] text-gray-600 m-0 pl-4 list-disc">
            <li>Hyperfuse, sepatu harian yang ringan</li>
            <li>Radiance, bantalan responsif</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
