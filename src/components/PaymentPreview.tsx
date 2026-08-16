"use client";

import { IconCircleCheckFilled } from "@tabler/icons-react";

const PAYMENT_METHODS = ["QRIS", "Transfer bank", "Kartu kredit", "Gopay"];

export default function PaymentPreview() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] border border-border-light bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <p className="type-title text-gray-900 m-0">Pembayaran</p>
        <span className="text-[11px] font-medium text-gray-400">
          Sekali bayar
        </span>
      </div>

      <div className="h-px bg-border-light shrink-0" />

      <div className="flex-1 min-h-0 px-4 py-3 flex flex-col gap-3 overflow-hidden">
        {/* Price */}
        <div>
          <p className="text-[28px] font-bold text-gray-900 m-0 leading-none">
            Rp99.000
          </p>
          <p className="text-[12px] text-gray-500 m-0 mt-1">
            Tanpa langganan, tanpa biaya tersembunyi
          </p>
        </div>

        {/* Payment methods */}
        <div className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((method, i) => (
            <div
              key={method}
              className="flex items-center justify-between h-9 px-3 rounded-md border border-border-light bg-white text-[13px] font-medium text-gray-700"
            >
              {method}
              {i === 0 && (
                <IconCircleCheckFilled size={16} className="text-green-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
