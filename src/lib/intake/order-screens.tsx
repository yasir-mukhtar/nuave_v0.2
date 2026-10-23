"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconCircleCheck,
  IconClockHour4,
  IconInfoCircle,
  IconLoader2,
  IconQrcode,
  IconWallet,
} from "@tabler/icons-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { FloatingField } from "@/components/product/journey/FloatingField";
import {
  KeyboardAccessory,
  useCoarsePointer,
} from "@/components/product/journey/KeyboardAccessory";
import { DELIVERY_PROMISE } from "@/lib/orders/promise";
import { cn } from "@/lib/utils";
import { emailCompletions, emailTypoSuggestion } from "./email-assist";
import { BusinessMark } from "./step-one-screens";

/**
 * Screen 3a of the order flow (spec 016), drawn as the v2 checkout (J07/J08):
 * what is bought, who receives it and how to pay, with (spec 017) the state of
 * the payment. Wording of the price lines follows docs/VOICE.md §4 and the
 * delivery promise is the approved Q5 line, word for word.
 */

const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

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
    <p className="type-copy m-0 text-ink-700">
      Nomor pesanan:{" "}
      <span className="select-all font-semibold text-ink-900">{number}</span>
    </p>
  ) : null;
}

function Support() {
  return (
    <p className="type-copy m-0 text-ink-700">
      Hubungi{" "}
      <a
        className="font-semibold text-ink-900 underline decoration-1 underline-offset-4"
        href={`mailto:${SUPPORT_EMAIL}`}
      >
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
  onNewOrder,
}: {
  payment: OrderPayment;
  checking: boolean;
  onCheckAgain: () => void;
  onPayAgain: () => void;
  onNewOrder: () => void;
}) {
  const animate = useMotionAllowed();
  const link = payment.redirect_url ? (
    <a
      className={buttonVariants({
        variant: "ink",
        size: "touch",
        className: "w-fit no-underline",
      })}
      href={payment.redirect_url}
    >
      Lihat cara bayar
    </a>
  ) : null;
  const again = (
    <Button
      variant="inkOutline"
      size="touch"
      className="w-fit"
      disabled={checking}
      onClick={onCheckAgain}
    >
      {checking ? (
        <IconLoader2 className="animate-spin" aria-hidden="true" />
      ) : null}
      Cek lagi
    </Button>
  );
  const box = (
    title: string,
    children: ReactNode,
    tone: "calm" | "good" | "attention" = "calm",
  ) => (
    <motion.article
      className={cn(
        "grid gap-3 rounded-card p-5",
        tone === "good" && "bg-stone-50",
        tone === "calm" && "border border-line-200 bg-white",
        tone === "attention" && "bg-error-light",
      )}
      data-payment-state={payment.state}
      role={tone === "attention" ? "alert" : "status"}
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SETTLE}
    >
      <h2 className="type-title m-0 flex items-center gap-2 text-ink-900">
        {tone === "good" ? (
          <IconCircleCheck size={22} stroke={1.75} aria-hidden="true" />
        ) : tone === "attention" ? (
          <IconAlertTriangle
            size={22}
            stroke={1.75}
            className="text-error-edge"
            aria-hidden="true"
          />
        ) : (
          <IconClockHour4 size={22} stroke={1.75} aria-hidden="true" />
        )}
        {title}
      </h2>
      {children}
    </motion.article>
  );
  switch (payment.state) {
    case "paid":
      return box(
        "Pembayaran diterima",
        <>
          <OrderNumber number={payment.order_number} />
          <p className="type-copy m-0 text-ink-700">
            Tekan Lanjut untuk mengisi data bisnis Anda.
          </p>
        </>,
        "good",
      );
    case "waiting":
      return box(
        "Menunggu pembayaran",
        <>
          <p className="type-copy m-0 text-ink-700">
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
          <p className="type-copy m-0 text-ink-700">
            {TRY_MESSAGE[payment.last_try ?? ""] ?? TRY_MESSAGE.failed}
          </p>
          {link}
        </>,
      );
    case "checking":
      return box(
        "Kami sedang memeriksa pembayaran Anda",
        <>
          <p className="type-copy m-0 text-ink-700">
            Jangan bayar lagi. Kami memberi tahu hasilnya di halaman ini.
          </p>
          {again}
        </>,
      );
    case "cannot_check":
      return box(
        "Status pembayaran belum dapat diperiksa",
        <>
          <p className="type-copy m-0 text-ink-700">
            Jangan bayar lagi. Coba periksa lagi sebentar lagi.
          </p>
          {again}
        </>,
      );
    case "unpaid_final":
      return box(
        "Pembayaran tidak kami terima",
        <>
          <p className="type-copy m-0 text-ink-700">
            Pesanan ini tidak dibayar dan sudah berakhir. Isian Anda tetap
            tersimpan.
          </p>
          <Button
            variant="ink"
            size="touch"
            className="w-fit"
            onClick={onPayAgain}
          >
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
        </>,
        "attention",
      );
    case "needs_refund":
      return box(
        "Pembayaran ini tidak dapat dipakai untuk pesanan ini",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
        </>,
        "attention",
      );
    case "refunded":
      return box(
        "Pembayaran sudah dikembalikan",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
          {/* Q17: a fresh start; the refunded order stays ended on the server. */}
          <Button
            variant="ink"
            size="touch"
            className="w-fit"
            onClick={onNewOrder}
          >
            Mulai pesanan baru
          </Button>
        </>,
        "attention",
      );
    case "paid_ended":
      return box(
        "Pesanan ini tidak dapat dilanjutkan di sini",
        <>
          <OrderNumber number={payment.order_number} />
          <Support />
        </>,
        "attention",
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

/** The ways Midtrans takes the payment (Snap shows exactly these four). */
const PAYMENT_METHODS = [
  { label: "QRIS", Icon: IconQrcode },
  { label: "Transfer bank", Icon: IconBuildingBank },
  { label: "GoPay", Icon: IconWallet },
  { label: "DANA", Icon: IconWallet },
] as const;

function PaymentMethods() {
  return (
    <section className="grid gap-3" aria-labelledby="pay-with-heading">
      <h2 id="pay-with-heading" className="type-title m-0 text-ink-900">
        Bayar dengan
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
        {PAYMENT_METHODS.map(({ label, Icon }) => (
          <li
            key={label}
            className="flex h-[92px] flex-col justify-between rounded-tile border border-line-300 bg-white p-4"
          >
            <Icon size={28} stroke={1.5} aria-hidden="true" />
            <span className="type-label-lg text-ink-900">{label}</span>
          </li>
        ))}
      </ul>
      <p className="type-copy-sm m-0 text-ink-500">
        Pilih salah satu di halaman pembayaran Midtrans.
      </p>
    </section>
  );
}

function OrderCard({
  businessName,
  iconDataUrl,
  priced,
}: {
  businessName: string;
  iconDataUrl?: string | null;
  priced: boolean;
}) {
  return (
    <article
      className="grid rounded-card border border-line-200 bg-white p-5"
      aria-label="Ringkasan pesanan"
    >
      <div className="flex items-center gap-3.5">
        <BusinessMark name={businessName} iconDataUrl={iconDataUrl} size="sm" />
        <div className="grid min-w-0 gap-0.5">
          <p className="type-title-sm m-0 text-ink-900">AI Visibility Report</p>
          <p className="type-copy-sm m-0 break-words text-ink-600">
            {businessName} · 10 pertanyaan
          </p>
        </div>
      </div>
      {priced ? (
        <div
          className="mt-4 grid border-t border-line-200 pt-4"
          data-order-price
        >
          <p className="type-title m-0 flex items-center justify-between text-ink-900">
            <span>Total</span>
            <span>Rp99.000</span>
          </p>
          <p className="type-copy-sm m-0 mt-1.5 text-ink-600">
            Sekali bayar. Tanpa pajak atau biaya tambahan dari Nuave. Ringkasan
            ini berlaku 30 hari.
          </p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2.5">
        <p className="type-copy-sm m-0 flex items-start gap-2.5 text-ink-600">
          <IconInfoCircle
            size={18}
            stroke={1.75}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
          Pembayaran belum menjalankan audit. Anda masih memeriksa informasi
          bisnis dan menyetujui pertanyaan dulu.
        </p>
        <p className="type-copy-sm m-0 flex items-start gap-2.5 text-ink-600">
          <IconClockHour4
            size={18}
            stroke={1.75}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
          {DELIVERY_PROMISE}
        </p>
      </div>
    </article>
  );
}

export function OrderScreen({
  headingRef,
  businessName,
  iconDataUrl,
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
  onNewOrder,
  onSubmit,
  submitLabel,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  businessName: string;
  iconDataUrl?: string | null;
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
  onNewOrder: () => void;
  /** The main action (also offered on the keyboard bar while typing). */
  onSubmit: () => void;
  submitLabel: string | null;
}) {
  const animate = useMotionAllowed();
  const coarse = useCoarsePointer();
  const [typing, setTyping] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const panel = hasPaymentPanel(payment);
  const free = payment?.state === "not_required";
  const priced = !panel && !testPass && !free;
  // J08: on a phone, typing the email clears the page down to the question.
  const focusMode = typing && coarse && !hasOrder;
  const typo = emailTypoSuggestion(email);
  const completions = emailCompletions(email);
  return (
    <section
      className="grid gap-7"
      data-intake-screen="order"
      data-order-focus={focusMode ? "email" : undefined}
      aria-busy={busy}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {focusMode ? (
          <motion.header
            key="email-question"
            className="grid gap-2.5"
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRING_SETTLE}
          >
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="type-heading-lg m-0 text-ink-900 outline-none"
            >
              Ke mana laporan dikirim?
            </h1>
            <p className="type-copy m-0 text-ink-600">
              Link laporan pribadi dikirim ke email ini.
            </p>
          </motion.header>
        ) : (
          <motion.div
            key="summary"
            className="grid gap-7"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <h1 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
              Konfirmasi dan bayar
            </h1>
            {notice ? (
              <p
                role="status"
                className="type-copy-sm m-0 rounded-tile bg-stone-50 px-4 py-3 text-ink-600"
              >
                {notice}
              </p>
            ) : null}
            {hasOrder && payment && panel ? (
              <PaymentPanel
                payment={payment}
                checking={checking}
                onCheckAgain={onCheckAgain}
                onPayAgain={onPayAgain}
                onNewOrder={onNewOrder}
              />
            ) : null}
            <OrderCard
              businessName={businessName}
              iconDataUrl={iconDataUrl}
              priced={priced}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {testPass && !hasOrder ? (
        <p className="type-copy-sm m-0 text-ink-600">
          Mode uji pendiri: pesanan ini tidak memakai pembayaran.
        </p>
      ) : null}
      {hasOrder && !panel ? (
        <p role="status" className="type-copy m-0 text-ink-700">
          {payment === null
            ? "Memeriksa status pesanan Anda…"
            : free
              ? "Pesanan Anda sudah dibuat. Tekan Lanjut untuk meneruskan."
              : "Pesanan Anda sudah dibuat. Tekan Bayar Rp99.000 untuk membayar."}
        </p>
      ) : null}
      {!hasOrder ? (
        <div className="grid gap-3">
          <FloatingField
            ref={emailRef}
            label="Email penerima laporan"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="nama@email.com"
            value={email}
            maxLength={254}
            error={error}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && submitLabel && !busy) {
                event.preventDefault();
                onSubmit();
              }
            }}
            hint={
              focusMode
                ? undefined
                : "Untuk pembayaran, akses laporan, dan info pesanan."
            }
          />
          {typo ? (
            <p className="type-copy-sm m-0 flex flex-wrap items-center gap-x-1.5 text-ink-600">
              Maksud Anda
              <button
                type="button"
                className="type-label-strong min-h-11 text-ink-900 underline decoration-1 underline-offset-4 sm:min-h-0"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  onEmailChange(typo);
                  emailRef.current?.focus();
                }}
              >
                {typo}?
              </button>
            </p>
          ) : null}
          <KeyboardAccessory open={typing} label="Bantuan mengetik email">
            {completions.map((completion) => (
              <button
                key={completion.value}
                type="button"
                className="type-label-lg h-10 shrink-0 rounded-chip border border-line-300 bg-white px-[18px] text-ink-900 transition-transform active:scale-[0.96]"
                onClick={() => {
                  onEmailChange(completion.value);
                  emailRef.current?.focus();
                }}
              >
                {completion.label}
              </button>
            ))}
            <span className="flex-1" />
            {coarse && submitLabel ? (
              <Button
                variant={submitLabel === "Lanjut" ? "ink" : "commit"}
                size="touch"
                disabled={busy}
                onClick={onSubmit}
              >
                {submitLabel === "Lanjut" ? "Lanjut" : "Bayar"}
              </Button>
            ) : null}
          </KeyboardAccessory>
        </div>
      ) : error ? (
        <p role="alert" className="type-copy-sm m-0 text-error">
          {error}
        </p>
      ) : null}
      {!focusMode && priced ? <PaymentMethods /> : null}
      {!live ? (
        <div className="grid gap-1">
          {priced ? (
            <p className="type-copy-sm m-0 text-ink-500">
              Pembayaran simulasi: tidak ada uang yang dibayar dan Midtrans
              tidak dipanggil.
            </p>
          ) : null}
          <p className="type-copy-sm m-0 text-ink-500">{SYNTHETIC_LABEL}</p>
        </div>
      ) : null}
    </section>
  );
}

/** The consent line under the pay button (J07). */
export function PayConsent() {
  return (
    <>
      Dengan membayar, Anda menyetujui{" "}
      <a
        className="underline decoration-1 underline-offset-2"
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        Syarat Penggunaan
      </a>{" "}
      dan{" "}
      <a
        className="underline decoration-1 underline-offset-2"
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Kebijakan Privasi
      </a>
      .
    </>
  );
}
