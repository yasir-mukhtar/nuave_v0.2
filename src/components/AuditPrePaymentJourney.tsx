"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import type { SourceIdentity } from "@/lib/audit/source-identity";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "@/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "@/lib/audit/variance";
import styles from "./AuditPrePaymentJourney.module.css";
import SourceHero from "@/app/audit/SourceHero";

type PrePaymentStep =
  | "source"
  | "scan"
  | "preview"
  | "order"
  | "checkout"
  | "processing"
  | "success";

type PaymentOrder = {
  source: string;
  email: string;
};

const SIMULATED_PROCESSING_MS = 500;
const IDENTITY_FAILURE_MESSAGE =
  "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.";

function parseIdentityResponse(value: unknown): SourceIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const sourceType = record.source_type;
  const iconDataUrl = record.icon_data_url;
  if (
    typeof record.display_name !== "string" ||
    typeof record.description !== "string" ||
    typeof record.canonical_url !== "string" ||
    (sourceType !== "website" && sourceType !== "instagram") ||
    (iconDataUrl !== null && typeof iconDataUrl !== "string") ||
    typeof record.confidence !== "boolean"
  ) {
    return null;
  }

  return {
    display_name: record.display_name,
    description: record.description,
    canonical_url: record.canonical_url,
    icon_data_url: iconDataUrl,
    source_type: sourceType,
    confidence: record.confidence,
  };
}

function responseCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const code = (value as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function IdentityScanStep({
  error,
  onRetry,
  onEditSource,
}: {
  error: string;
  onRetry: () => void;
  onEditSource: () => void;
}) {
  return (
    <section
      className={styles.stage}
      aria-labelledby="identity-scan-heading"
      data-stage="identity-scan"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Pembacaan sumber publik</p>
        <h1 id="identity-scan-heading" className={styles.heading}>
          Membaca identitas bisnis
        </h1>
        <p className={styles.lead}>
          Nuave hanya memeriksa informasi identitas dari sumber yang Anda kirim.
          Belum ada pertanyaan audit atau analisis oleh model AI.
        </p>
      </div>
      <div className={styles.scanCard} role="status" aria-live="polite">
        <p className={styles.scanDescription}>
          Proses ini tidak memulai audit dan tidak membuat rekomendasi.
        </p>
        <ol className={styles.scanSteps}>
          <li className={`${styles.scanStep} ${styles.scanStepActive}`}>
            <span className={styles.scanMarker} aria-hidden="true">
              <IconLoader2 className="animate-spin" />
            </span>
            <span>Memeriksa sumber publik</span>
          </li>
          <li className={styles.scanStep}>
            <span className={styles.scanMarker} aria-hidden="true">
              2
            </span>
            <span>Menyiapkan pratinjau identitas</span>
          </li>
        </ol>
        {error ? (
          <p className={styles.scanError} role="alert">
            {error}
          </p>
        ) : null}
        {error ? (
          <div className={styles.scanActions}>
            <Button type="button" variant="ghost" onClick={onEditSource}>
              Ubah sumber
            </Button>
            <Button type="button" onClick={onRetry}>
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function IdentityPreviewStep({
  identity,
  onEditSource,
  onContinue,
}: {
  identity: SourceIdentity;
  onEditSource: () => void;
  onContinue: () => void;
}) {
  const hasConfidentName = identity.confidence && identity.display_name.trim();
  return (
    <section
      className={styles.stage}
      aria-labelledby="identity-preview-heading"
      data-stage="identity-preview"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Pratinjau identitas</p>
        <h1 id="identity-preview-heading" className={styles.heading}>
          Pratinjau identitas bisnis
        </h1>
        <p className={styles.lead}>
          Ini hanya pembacaan informasi publik dari sumber yang Anda kirim.
          Belum ada analisis oleh model AI atau hasil audit.
        </p>
      </div>
      <section
        className={styles.identityCard}
        aria-labelledby="identity-card-heading"
      >
        <div className={styles.identityHeader}>
          {identity.icon_data_url ? (
            <Image
              src={identity.icon_data_url}
              alt=""
              width={48}
              height={48}
              unoptimized
              className={styles.identityIcon}
            />
          ) : (
            <span className={styles.identityIconFallback} aria-hidden="true">
              {identity.display_name.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
          <div>
            <p className={styles.identityLabel}>Nama dari sumber publik</p>
            <h2 id="identity-card-heading">
              {hasConfidentName || "Nama belum dapat dipastikan"}
            </h2>
          </div>
        </div>
        {identity.confidence && identity.description ? (
          <p className={styles.identityDescription}>{identity.description}</p>
        ) : null}
        {!identity.confidence ? (
          <p className={styles.scanError} role="alert">
            Nama brand belum dapat dipastikan dari sumber ini. Anda dapat
            mengonfirmasi atau mengoreksinya setelah simulasi pembayaran.
          </p>
        ) : null}
        <dl className={styles.identityDetails}>
          <div>
            <dt>Sumber kanonis</dt>
            <dd>
              <code>{identity.canonical_url}</code>
            </dd>
          </div>
          <div>
            <dt>Jenis sumber</dt>
            <dd>
              {identity.source_type === "instagram" ? "Instagram" : "Website"}
            </dd>
          </div>
          <div>
            <dt>Status identitas</dt>
            <dd>{identity.confidence ? "Terbaca" : "Belum pasti"}</dd>
          </div>
        </dl>
        <p className={styles.safeNote}>
          Pratinjau ini tidak memuat pengukuran, temuan, rekomendasi, atau hasil
          audit berbayar.
        </p>
      </section>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onEditSource}>
          <IconArrowLeft aria-hidden="true" /> Ubah sumber
        </Button>
        <Button type="button" onClick={onContinue}>
          Lanjut ke ringkasan pesanan
        </Button>
      </div>
    </section>
  );
}

function OrderStep({
  identity,
  email,
  onEmailChange,
  onBack,
  onContinue,
}: {
  identity: SourceIdentity;
  email: string;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onContinue: (email: string) => void;
}) {
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const emailErrorId = "order-email-error";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Masukkan alamat email yang valid.");
      emailRef.current?.focus();
      return;
    }
    setError("");
    onContinue(email.trim());
  }

  return (
    <section
      className={styles.stage}
      aria-labelledby="order-heading"
      data-stage="order"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Order Preview</p>
        <h1 id="order-heading" className={styles.heading}>
          Ringkasan pesanan
        </h1>
        <p className={styles.lead}>
          Periksa cakupan satu AI Visibility Report dan alamat email
          penerimanya.
        </p>
      </div>
      <div className={styles.orderCard}>
        <div className={styles.orderLayout}>
          <dl className={styles.orderSummary}>
            <div>
              <dt>Pesanan</dt>
              <dd className={styles.summaryValue}>Satu AI Visibility Report</dd>
            </div>
            <div>
              <dt>Brand</dt>
              <dd>
                {identity.display_name.trim() ||
                  "Identitas belum dapat dipastikan"}
              </dd>
            </div>
            <div>
              <dt>Sumber</dt>
              <dd>
                <code>{identity.canonical_url}</code>
              </dd>
            </div>
            <div>
              <dt>Cakupan</dt>
              <dd>Sepuluh pertanyaan yang disetujui untuk satu brand</dd>
            </div>
          </dl>
          <div className={styles.total}>
            <span>Total, tanpa biaya tambahan</span>
            <strong>Rp99.000</strong>
          </div>
          <p className={styles.safeNote}>Tidak ada biaya tambahan Nuave.</p>
          <p className={styles.terms}>
            Harga ini berlaku selama 30 hari. Baca{" "}
            <a href="/terms">Syarat dan Ketentuan</a> dan{" "}
            <a href="/privacy">Kebijakan Privasi</a>.
          </p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label htmlFor="order-email">
              Email penerima laporan*
              <Input
                ref={emailRef}
                id="order-email"
                type="email"
                value={email}
                onChange={(event) => {
                  onEmailChange(event.target.value);
                  if (error) setError("");
                }}
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? emailErrorId : undefined}
              />
            </label>
            {error ? (
              <p id={emailErrorId} className={styles.fieldError} role="alert">
                {error}
              </p>
            ) : null}
            <FieldDescription>
              Email ini hanya disimpan di sesi perjalanan contoh dan belum
              digunakan untuk mengirim laporan.
            </FieldDescription>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onBack}>
                <IconArrowLeft aria-hidden="true" /> Kembali ke pratinjau
              </Button>
              <Button type="submit">Lanjut ke pembayaran</Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function CheckoutStep({
  identity,
  email,
  onBack,
  onComplete,
}: {
  identity: SourceIdentity;
  email: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <section
      className={styles.stage}
      aria-labelledby="checkout-heading"
      data-stage="checkout"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Simulasi</p>
        <h1 id="checkout-heading" className={styles.heading}>
          Simulasi pembayaran
        </h1>
        <p className={styles.lead}>
          Tahap ini hanya untuk menjalankan perjalanan V1 secara aman.
        </p>
      </div>
      <section
        className={styles.checkoutCard}
        aria-labelledby="checkout-disclosure"
      >
        <p id="checkout-disclosure" className={styles.checkoutDisclosure}>
          Ini bukan pembayaran nyata. Tidak ada tagihan.
        </p>
        <dl className={styles.orderSummary}>
          <div>
            <dt>Brand</dt>
            <dd>
              {identity.display_name.trim() ||
                "Identitas belum dapat dipastikan"}
            </dd>
          </div>
          <div>
            <dt>Email penerima</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Total simulasi</dt>
            <dd className={styles.summaryValue}>Rp99.000</dd>
          </div>
        </dl>
        <p className={styles.safeNote}>
          Jangan masukkan nomor kartu, kode OTP, rekening, atau data pembayaran
          apa pun. Nuave tidak meminta atau mengirim data tersebut di sini.
        </p>
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onBack}>
            <IconArrowLeft aria-hidden="true" /> Kembali ke ringkasan pesanan
          </Button>
          <Button type="button" onClick={onComplete}>
            Selesaikan simulasi pembayaran
          </Button>
        </div>
      </section>
    </section>
  );
}

function ProcessingStep() {
  return (
    <section
      className={styles.processing}
      aria-labelledby="processing-heading"
      aria-live="polite"
      data-stage="processing"
    >
      <div className={styles.processingContent}>
        <IconLoader2
          className={`${styles.spinner} animate-spin`}
          aria-hidden="true"
        />
        <p className={styles.eyebrow}>Pembayaran simulasi</p>
        <h1 id="processing-heading" className={styles.heading}>
          Memproses simulasi pembayaran
        </h1>
        <p className={styles.lead}>
          Tidak ada transaksi nyata. Nuave sedang menyiapkan perpindahan ke
          persiapan audit.
        </p>
      </div>
    </section>
  );
}

function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <section
      className={styles.stage}
      aria-labelledby="payment-success-heading"
      data-stage="success"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Pembayaran simulasi</p>
        <h1 id="payment-success-heading" className={styles.heading}>
          Pembayaran simulasi selesai
        </h1>
        <p className={styles.lead}>
          Pembayaran simulasi selesai. Tidak ada tagihan.
        </p>
      </div>
      <section
        className={styles.successCard}
        aria-label="Status simulasi pembayaran"
      >
        <p className={styles.safeNote}>
          Sesi persiapan audit sekarang terbuka. Analisis oleh model AI baru
          dimulai setelah Anda melanjutkan.
        </p>
        <div className={styles.actions}>
          <span />
          <Button type="button" onClick={onContinue}>
            Mulai persiapan audit
          </Button>
        </div>
      </section>
    </section>
  );
}

export default function AuditPrePaymentJourney({
  onPaymentComplete,
  ariaLabel = "Mulai audit visibilitas AI",
  sourceHeading = "Cek bisnis Anda di AI",
  sourceSubheading = "Masukkan sumber resmi untuk melihat pratinjau identitas bisnis Anda.",
  sourceSubmitLabel = "Cek bisnis saya di AI",
  rootClassName = "",
  sourceShowLogo = true,
  sourceAutoFocus = true,
  sourceConsumeHandoff = true,
  sourceContentClassName = "",
  sourceBackdropClassName = "",
  sourceBackdropOverlay = null,
}: {
  onPaymentComplete?: (order: PaymentOrder) => void;
  ariaLabel?: string;
  sourceHeading?: string;
  sourceSubheading?: string;
  sourceSubmitLabel?: string;
  rootClassName?: string;
  sourceShowLogo?: boolean;
  sourceAutoFocus?: boolean;
  sourceConsumeHandoff?: boolean;
  sourceContentClassName?: string;
  sourceBackdropClassName?: string;
  sourceBackdropOverlay?: ReactNode;
}) {
  const [step, setStep] = useState<PrePaymentStep>("source");
  const [source, setSource] = useState("");
  const [identity, setIdentity] = useState<SourceIdentity | null>(null);
  const [identityError, setIdentityError] = useState("");
  const [identityLoading, setIdentityLoading] = useState(false);
  const [email, setEmail] = useState("");
  const processingTimer = useRef<number | null>(null);
  const identityInFlight = useRef(false);

  useEffect(() => {
    return () => {
      if (processingTimer.current !== null) {
        window.clearTimeout(processingTimer.current);
      }
    };
  }, []);

  async function readIdentity(normalizedUrl: string) {
    if (identityInFlight.current) return;
    identityInFlight.current = true;
    setSource(normalizedUrl);
    setIdentityError("");
    setIdentityLoading(true);
    setStep("scan");
    let code: string | undefined;
    try {
      try {
        window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
        window.sessionStorage.removeItem(AUDIT_WORKFLOW_STORAGE_KEY);
        window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
        window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
      } catch {
        setIdentityError(
          "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
        );
        return;
      }
      const response = await fetch(
        `/api/audit/identity?source=${encodeURIComponent(normalizedUrl)}`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json()) as unknown;
      code = responseCode(payload);
      const parsedIdentity = parseIdentityResponse(payload);
      if (!response.ok || !parsedIdentity) throw new Error(code || "identity");
      setIdentity(parsedIdentity);
      setStep("preview");
    } catch {
      setIdentity(null);
      setIdentityError(IDENTITY_FAILURE_MESSAGE);
      setStep("scan");
    } finally {
      identityInFlight.current = false;
      setIdentityLoading(false);
    }
  }

  function editSource() {
    setStep("source");
    setSource("");
    setIdentity(null);
    setIdentityError("");
    setEmail("");
  }

  function openOrder() {
    setStep("order");
  }

  function openCheckout(nextEmail: string) {
    setEmail(nextEmail);
    setStep("checkout");
  }

  function completePayment() {
    setStep("processing");
    processingTimer.current = window.setTimeout(() => {
      processingTimer.current = null;
      setStep("success");
    }, SIMULATED_PROCESSING_MS);
  }

  function continueAfterPayment() {
    if (!source.trim()) return;
    try {
      window.sessionStorage.setItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY, source);
    } catch {
      setIdentityError(
        "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
      );
      return;
    }
    onPaymentComplete?.({ source, email });
  }

  return (
    <section
      className={[styles.root, rootClassName].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      lang="id"
    >
      {step === "source" ? (
        <SourceHero
          initialValue={source}
          extracting={identityLoading}
          error={identityError}
          onExtract={(url) => void readIdentity(url)}
          exiting={false}
          showLogo={sourceShowLogo}
          autoFocus={sourceAutoFocus}
          consumeHandoff={sourceConsumeHandoff}
          contentClassName={sourceContentClassName}
          backdropClassName={sourceBackdropClassName}
          backdropOverlay={sourceBackdropOverlay}
          heading={sourceHeading}
          subheading={sourceSubheading}
          submitLabel={sourceSubmitLabel}
        />
      ) : null}
      {step === "scan" ? (
        <IdentityScanStep
          error={identityError}
          onRetry={() => void readIdentity(source)}
          onEditSource={editSource}
        />
      ) : null}
      {step === "preview" && identity ? (
        <IdentityPreviewStep
          identity={identity}
          onEditSource={editSource}
          onContinue={openOrder}
        />
      ) : null}
      {step === "order" && identity ? (
        <OrderStep
          identity={identity}
          email={email}
          onEmailChange={setEmail}
          onBack={() => setStep("preview")}
          onContinue={openCheckout}
        />
      ) : null}
      {step === "checkout" && identity ? (
        <CheckoutStep
          identity={identity}
          email={email}
          onBack={() => setStep("order")}
          onComplete={completePayment}
        />
      ) : null}
      {step === "processing" ? <ProcessingStep /> : null}
      {step === "success" ? (
        <SuccessStep onContinue={continueAfterPayment} />
      ) : null}
    </section>
  );
}

export type { PaymentOrder };
