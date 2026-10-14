"use client";

import type { RefObject } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DELIVERY_PROMISE } from "@/lib/orders/promise";

/**
 * Screens 3 and 3a of the order flow (spec 016). Screen 3 is the FREE brand
 * check: it shows only what the free lookup found, and no AI has run. Screen 3a
 * is the order summary: the business, what the report includes, the price, the
 * delivery promise, the email the report link goes to, and (spec 017) the state
 * of the payment. Wording is the draft that S5 finalizes.
 */

const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

const ORIGIN_TEXT = {
  website: "Dari website Anda",
  owner: "Dari Anda",
} as const;

function brandInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase());
  return letters.join("") || "?";
}

export type FreeBrand = { name: string; origin: "owner" | "website" };

export function FreeBrandScreen({
  headingRef,
  typedName,
  discoveredName,
  source,
  brand,
  editing,
  onToggleEditing,
  onChange,
  error,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  typedName: string;
  discoveredName: string | null;
  source: string;
  brand: FreeBrand;
  editing: boolean;
  onToggleEditing: () => void;
  onChange: (brand: FreeBrand) => void;
  error: string | null;
}) {
  return (
    <section className="grid gap-5" data-intake-screen="brand">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ini brand yang ingin Anda audit?
      </h1>
      <article
        className="flex items-center gap-4 rounded-xl border border-border p-5"
        aria-label="Brand yang ditemukan"
      >
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border border-border type-heading-sm"
          aria-hidden="true"
        >
          {brandInitials(brand.name)}
        </span>
        <div className="min-w-0">
          <h2 className="type-heading-sm m-0 break-words">{brand.name}</h2>
          <p className="type-copy-sm m-0 mt-1 break-all text-muted-foreground">
            {source} · {ORIGIN_TEXT[brand.origin]}
          </p>
        </div>
      </article>
      <div role="radiogroup" aria-label="Nama bisnis" className="grid gap-1">
        <label className="flex min-h-11 items-center gap-3 type-copy">
          <input
            type="radio"
            name="smart-brand-name"
            checked={brand.name === typedName && brand.origin === "owner"}
            onChange={() => onChange({ name: typedName, origin: "owner" })}
          />
          {typedName}{" "}
          <span className="type-copy-sm text-muted-foreground">Dari Anda</span>
        </label>
        {discoveredName && discoveredName !== typedName ? (
          <label className="flex min-h-11 items-center gap-3 type-copy">
            <input
              type="radio"
              name="smart-brand-name"
              checked={
                brand.name === discoveredName && brand.origin === "website"
              }
              onChange={() =>
                onChange({ name: discoveredName, origin: "website" })
              }
            />
            {discoveredName}{" "}
            <span className="type-copy-sm text-muted-foreground">
              Dari website Anda
            </span>
          </label>
        ) : null}
      </div>
      <div>
        <Button variant="link" className="w-fit" onClick={onToggleEditing}>
          Ubah nama
        </Button>
        {editing ? (
          <label className="mt-2 grid gap-2 type-label">
            Nama brand
            <Input
              value={brand.name}
              maxLength={160}
              onChange={(event) =>
                onChange({ name: event.target.value, origin: "owner" })
              }
            />
          </label>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="type-copy text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** What `/api/orders/status` says about the payment (spec 017 R-14). */
export type OrderPayment = {
  state: string;
  order_number?: string;
  redirect_url?: string;
  last_try?: string;
};

const SUPPORT_EMAIL = "support@nuave.ai";

const TRY_MESSAGE: Record<string, string> = {
  denied: "Pembayaran ditolak. Anda bisa mencoba lagi di halaman pembayaran.",
  cancelled:
    "Pembayaran dibatalkan. Anda bisa mencoba lagi di halaman pembayaran.",
  failed: "Pembayaran gagal. Anda bisa mencoba lagi di halaman pembayaran.",
  expired:
    "Waktu pembayaran untuk cara ini habis. Anda bisa memilih cara lain di halaman pembayaran.",
};

function OrderNumber({ number }: { number?: string }) {
  return number ? (
    <p className="type-copy m-0">
      Nomor pesanan: <span className="select-all font-semibold">{number}</span>
    </p>
  ) : null;
}

function Support() {
  return (
    <p className="type-copy m-0">
      Hubungi{" "}
      <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
        {SUPPORT_EMAIL}
      </a>
      .
    </p>
  );
}

/**
 * Spec 017 Experience 5-8: what the customer sees for each payment state. Only
 * the states that replace the pay form have a panel; `unpaid`, `not_required`
 * and an unknown state (null) have none.
 */
function PaymentPanel({
  payment,
  checking,
  onCheckAgain,
  onPayAgain,
}: {
  payment: OrderPayment;
  checking: boolean;
  onCheckAgain: () => void;
  onPayAgain: () => void;
}) {
  const link = payment.redirect_url ? (
    <a
      className={buttonVariants({ className: "min-h-11 w-fit px-4" })}
      href={payment.redirect_url}
    >
      Lihat cara bayar
    </a>
  ) : null;
  const again = (
    <Button
      className="min-h-11 w-fit px-4"
      disabled={checking}
      onClick={onCheckAgain}
    >
      Cek lagi
    </Button>
  );
  const box = (title: string, children: React.ReactNode, urgent = false) => (
    <article
      className="grid gap-3 rounded-xl border border-border p-5"
      data-payment-state={payment.state}
      role={urgent ? "alert" : "status"}
    >
      <h2 className="type-heading-sm m-0">{title}</h2>
      {children}
    </article>
  );
  switch (payment.state) {
    case "paid":
      return box(
        "Pembayaran diterima",
        <>
          <OrderNumber number={payment.order_number} />
          <p className="type-copy m-0">
            Tekan Lanjut untuk mengisi data bisnis Anda.
          </p>
        </>,
      );
    case "waiting":
      return box(
        "Menunggu pembayaran",
        <>
          <p className="type-copy m-0">
            Selesaikan pembayaran di halaman Midtrans. Halaman ini memeriksa
            statusnya sendiri.
          </p>
          {link}
        </>,
      );
    case "try_failed":
      return box(
        "Pembayaran belum berhasil",
        <>
          <p className="type-copy m-0">
            {TRY_MESSAGE[payment.last_try ?? ""] ?? TRY_MESSAGE.failed}
          </p>
          {link}
        </>,
      );
    case "checking":
      return box(
        "Kami sedang memeriksa pembayaran Anda",
        <>
          <p className="type-copy m-0">
            Jangan bayar lagi. Kami memberi tahu hasilnya di halaman ini.
          </p>
          {again}
        </>,
      );
    case "cannot_check":
      return box(
        "Status pembayaran belum dapat diperiksa",
        <>
          <p className="type-copy m-0">
            Jangan bayar lagi. Coba periksa lagi sebentar lagi.
          </p>
          {again}
        </>,
      );
    case "unpaid_final":
      return box(
        "Pembayaran tidak kami terima",
        <>
          <p className="type-copy m-0">
            Pesanan ini tidak dibayar dan sudah berakhir. Isian Anda tetap
            tersimpan.
          </p>
          <Button className="min-h-11 w-fit px-4" onClick={onPayAgain}>
            Coba bayar lagi
          </Button>
        </>,
      );
    case "closed_unknown":
      return box(
        "Pembayaran belum dapat dipastikan",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
          <Button className="min-h-11 w-fit px-4" onClick={onPayAgain}>
            Coba bayar lagi
          </Button>
        </>,
        true,
      );
    case "needs_refund":
      return box(
        "Pembayaran ini tidak dapat dipakai untuk pesanan ini",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
        </>,
        true,
      );
    case "refunded":
      return box(
        "Pembayaran sudah dikembalikan",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
        </>,
        true,
      );
    case "paid_ended":
      return box(
        "Pesanan ini tidak dapat dilanjutkan di sini",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
        </>,
        true,
      );
    default:
      return null;
  }
}

/** True when the payment has a panel that replaces the pay form. */
export function hasPaymentPanel(payment: OrderPayment | null): boolean {
  return (
    payment !== null &&
    payment.state !== "unpaid" &&
    payment.state !== "not_required"
  );
}

export function OrderScreen({
  headingRef,
  businessName,
  website,
  hasOrder,
  email,
  onEmailChange,
  busy,
  notice,
  error,
  live,
  payment,
  checking,
  testPass,
  onCheckAgain,
  onPayAgain,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  businessName: string;
  website: string;
  /** An order for this business and website is already open. */
  hasOrder: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  busy: boolean;
  notice: string | null;
  error: string | null;
  live: boolean;
  /** The saved order's payment, from the server; null until it has answered. */
  payment: OrderPayment | null;
  /** A status check is running. */
  checking: boolean;
  /** This tab holds the founder test code (`/uji`): no payment (R-20). */
  testPass: boolean;
  onCheckAgain: () => void;
  onPayAgain: () => void;
}) {
  const panel = hasPaymentPanel(payment);
  const free = payment?.state === "not_required";
  return (
    <section className="grid gap-5" data-intake-screen="order" aria-busy={busy}>
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ringkasan pesanan
      </h1>
      {notice ? (
        <p role="status" className="type-copy-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      <article
        className="rounded-xl border border-border p-5"
        aria-label="Bisnis yang diaudit"
      >
        <h2 className="type-heading-sm m-0 break-words">{businessName}</h2>
        <p className="type-copy-sm m-0 mt-1 break-all text-muted-foreground">
          {website}
        </p>
      </article>
      {hasOrder && payment && panel ? (
        <PaymentPanel
          payment={payment}
          checking={checking}
          onCheckAgain={onCheckAgain}
          onPayAgain={onPayAgain}
        />
      ) : null}
      <div className="grid gap-2">
        <h2 className="type-heading-sm m-0">Isi laporan</h2>
        <ul className="type-copy m-0 grid list-disc gap-1 pl-5">
          <li>
            Jawaban AI untuk sepuluh pertanyaan konsumen yang Anda setujui.
          </li>
          <li>Ringkasan temuan dan tindakan yang didukung bukti.</li>
          <li>Dikirim ke email Anda lewat link pribadi.</li>
        </ul>
      </div>
      {!panel && !testPass && !free ? (
        <div className="grid gap-3" data-order-price>
          <div className="grid gap-1 rounded-xl border border-border p-5">
            <p className="type-copy-sm m-0 text-muted-foreground">Total</p>
            <p className="type-heading-md m-0">
              Rp99.000{" "}
              <span className="type-copy-sm font-normal text-muted-foreground">
                sekali bayar
              </span>
            </p>
          </div>
          <p className="type-copy m-0">{DELIVERY_PROMISE}</p>
          <p className="type-copy-sm m-0 text-muted-foreground">
            Dengan membayar, Anda menyetujui{" "}
            <a
              className="underline"
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Syarat Penggunaan
            </a>{" "}
            dan{" "}
            <a
              className="underline"
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kebijakan Privasi
            </a>{" "}
            kami.
          </p>
          {!live ? (
            <p className="type-copy-sm m-0 text-muted-foreground">
              Pembayaran simulasi: tidak ada uang yang dibayar dan Midtrans
              tidak dipanggil.
            </p>
          ) : null}
        </div>
      ) : null}
      {testPass && !hasOrder ? (
        <p className="type-copy-sm m-0 text-muted-foreground">
          Mode uji pendiri: pesanan ini tidak memakai pembayaran.
        </p>
      ) : null}
      {hasOrder && !panel ? (
        <p role="status" className="type-copy">
          {payment === null
            ? "Memeriksa status pesanan Anda…"
            : free
              ? "Pesanan Anda sudah dibuat. Tekan Lanjut untuk meneruskan."
              : "Pesanan Anda sudah dibuat. Tekan Bayar Rp99.000 untuk membayar."}
        </p>
      ) : null}
      {!hasOrder ? (
        <label className="grid gap-2 type-label">
          Email untuk link laporan
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            maxLength={254}
            aria-invalid={Boolean(error)}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <span className="type-copy-sm font-normal text-muted-foreground">
            Kami memakai email ini untuk mengirim link laporan.
          </span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="type-copy text-destructive">
          {error}
        </p>
      ) : null}
      {!live ? (
        <p className="type-copy-sm text-muted-foreground">{SYNTHETIC_LABEL}</p>
      ) : null}
    </section>
  );
}
