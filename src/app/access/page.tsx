"use client";

import { useActionState } from "react";
import { verifyAccessCode, type AccessState } from "./actions";

const initialState: AccessState = { error: null };

export default function AccessPage() {
  const [state, formAction, isPending] = useActionState(
    verifyAccessCode,
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-2">
          <img
            src="/nuave-logo.svg"
            alt="Nuave logo"
            width={28}
            height={28}
            className="object-contain"
          />
          <span className="text-[20px] font-semibold text-[#0d0d0d]">
            Nuave
          </span>
        </div>

        <h1 className="text-[28px] font-semibold leading-tight text-[#0d0d0d]">
          Masukkan kode akses
        </h1>
        <p className="mt-2 text-[15px] leading-[1.6] text-[#6B7280]">
          Alat audit ini membutuhkan kode akses. Hubungi tim Nuave jika Anda
          belum memilikinya.
        </p>

        <form action={formAction} className="mt-8">
          <label
            htmlFor="code"
            className="mb-2 block text-[14px] font-medium text-[#111827]"
          >
            Kode akses
          </label>
          <input
            id="code"
            name="code"
            type="password"
            autoComplete="off"
            required
            autoFocus
            className="h-12 w-full rounded-[8px] border border-[rgba(117,115,114,0.35)] px-4 text-[15px] text-[#0d0d0d] outline-none transition-colors focus:border-[#533AFD]"
            placeholder="Masukkan kode akses"
          />

          {state.error && (
            <p
              role="alert"
              className="mt-3 text-[14px] font-medium text-red-600"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-lp-black mt-5 flex h-12 w-full cursor-pointer items-center justify-center rounded-[8px] text-[15px] font-medium text-white no-underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
