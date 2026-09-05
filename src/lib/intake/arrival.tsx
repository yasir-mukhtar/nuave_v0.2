"use client";

/**
 * Preview-only arrival ramp (Gate 1 feel aid, NOT rebuilt product).
 *
 * Renders clearly-labeled staging versions of the OUT-OF-SCOPE pre-payment
 * chain (landing URL input → scan → blurred preview → payment simulation →
 * success) so the founder can feel arriving from the landing page into the
 * new intake. Every screen carries a scope badge; nothing here is product
 * UI, it never touches legacy renderers, and it ships only behind the
 * preview gate. Real pre-payment surfaces stay frozen on the legacy journey.
 */
import { useEffect, useState } from "react";

function ScopeBadge() {
  return (
    <p
      style={{
        display: "inline-block",
        margin: "0 0 12px",
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: 600,
        borderRadius: "999px",
        border: "1px dashed var(--border-strong, #d1d5db)",
        color: "var(--text-muted, #52525b)",
      }}
    >
      DI LUAR SKOP — layar yang sudah ada, tidak dibangun ulang
    </p>
  );
}

function StageButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: "48px",
        padding: "0 24px",
        fontSize: "16px",
        fontWeight: 600,
        borderRadius: "12px",
        border: "none",
        cursor: "pointer",
        background: "var(--action, #18181b)",
        color: "var(--action-foreground, #ffffff)",
      }}
    >
      {children}
    </button>
  );
}

type ArrivalStep = "p-landing" | "p-scan" | "p-reveal" | "p-pay" | "p-success";

export default function ArrivalFlow({ onArrived }: { onArrived: () => void }) {
  const [step, setStep] = useState<ArrivalStep>("p-landing");

  useEffect(() => {
    if (step !== "p-scan") return;
    const timer = setTimeout(() => setStep("p-reveal"), 2200);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <main
      data-new-intake-arrival={step}
      lang="id"
      style={{
        maxWidth: "560px",
        margin: "0 auto",
        padding: "20px 16px 112px",
        fontFamily: "var(--font-ui, inherit)",
        color: "var(--text-body, #3f3f46)",
        display: "grid",
        gap: "16px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "17px",
          fontWeight: 700,
          color: "var(--text-heading, #18181b)",
        }}
      >
        nuave
      </p>
      <div>
        <ScopeBadge />
        {step === "p-landing" ? (
          <section style={{ display: "grid", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                color: "var(--text-heading, #18181b)",
              }}
            >
              Cek bisnis saya di AI
            </h1>
            <input
              type="text"
              defaultValue="https://kopisudut.id"
              aria-label="Situs atau Instagram bisnis"
              style={{
                minHeight: "48px",
                padding: "8px 16px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid var(--border-default, #e5e7eb)",
              }}
            />
            <StageButton onClick={() => setStep("p-scan")}>Cek</StageButton>
          </section>
        ) : null}
        {step === "p-scan" ? (
          <section
            role="status"
            aria-live="polite"
            style={{ display: "grid", gap: "12px" }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                color: "var(--text-heading, #18181b)",
              }}
            >
              Sebentar, Nuave sedang membaca
            </h1>
            <p style={{ margin: 0 }}>Membaca kopisudut.id…</p>
            <p style={{ margin: 0 }}>Menemukan produk dan lokasi…</p>
          </section>
        ) : null}
        {step === "p-reveal" ? (
          <section style={{ display: "grid", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                color: "var(--text-heading, #18181b)",
              }}
            >
              Nuave menemukan brand ini
            </h1>
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--border-default, #e5e7eb)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--text-heading, #18181b)",
                }}
              >
                Kopi Sudut
              </p>
              <p style={{ margin: "4px 0 0" }}>
                Struktur audit: 10 pertanyaan atas 6 + 4 slot. Skor dan temuan
                diburamkan — belum ada audit sebelum pembayaran.
              </p>
            </div>
            <p style={{ margin: 0, fontWeight: 600 }}>Rp99.000 total</p>
            <StageButton onClick={() => setStep("p-pay")}>Bayar</StageButton>
          </section>
        ) : null}
        {step === "p-pay" ? (
          <section style={{ display: "grid", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                color: "var(--text-heading, #18181b)",
              }}
            >
              Pembayaran (simulasi)
            </h1>
            <p style={{ margin: 0 }}>
              QRIS · Transfer VA · E-wallet — Rp99.000. Ini simulasi untuk
              pratinjau; tidak ada tagihan sungguhan.
            </p>
            <StageButton onClick={() => setStep("p-success")}>
              Simulasikan pembayaran berhasil
            </StageButton>
          </section>
        ) : null}
        {step === "p-success" ? (
          <section style={{ display: "grid", gap: "12px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                color: "var(--text-heading, #18181b)",
              }}
            >
              Pembayaran berhasil (simulasi)
            </h1>
            <p style={{ margin: 0 }}>
              Selanjutnya: perjalanan intake baru — yang sedang Anda nilai di
              Gate 1.
            </p>
            <StageButton onClick={onArrived}>Masuk ke intake baru</StageButton>
          </section>
        ) : null}
      </div>
    </main>
  );
}
