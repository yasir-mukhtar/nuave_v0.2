"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import SourceHero from "@/app/audit/SourceHero";
import { customerAuditErrorMessage } from "@/lib/audit/customer-error";
import { SIMULATED_PAYMENT_SUCCESS_EVENT } from "@/lib/audit/payment-boundary";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import type { SourceIdentity } from "@/lib/audit/source-identity";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "@/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "@/lib/audit/variance";
import LandingTileReveal from "./LandingTileReveal";
import styles from "./LandingAuditHero.module.css";

const LANDING_TILE_EXPERIMENT_ENABLED = true;

type LandingStep = "source" | "preview" | "payment" | "success";
type SimulatedPaymentState = "pending" | "succeeded";

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

function IdentityPreview({
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
    <div className={styles.prepaymentShell}>
      <div className={styles.prepaymentIntro}>
        <p className={styles.prepaymentEyebrow}>Pratinjau identitas</p>
        <h1 className={styles.prepaymentHeading}>Pratinjau identitas bisnis</h1>
        <p className={styles.prepaymentLead}>
          Ini hanya pembacaan informasi publik dari sumber yang Anda kirim.
          Belum ada analisis AI atau hasil audit.
        </p>
      </div>

      <section
        className={styles.identityCard}
        aria-labelledby="landing-identity-card-heading"
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
            <h2 id="landing-identity-card-heading">
              {hasConfidentName || "Nama belum dapat dipastikan"}
            </h2>
          </div>
        </div>

        {identity.confidence && identity.description ? (
          <p className={styles.identityDescription}>{identity.description}</p>
        ) : null}
        {!identity.confidence ? (
          <p className={styles.identityWarning}>
            Nama brand belum dapat dipastikan dari sumber ini.
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
            <dt>Tingkat keyakinan identitas</dt>
            <dd>{identity.confidence ? "Terbaca" : "Belum pasti"}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.prepaymentActions}>
        <Button type="button" variant="ghost" onClick={onEditSource}>
          Ubah sumber
        </Button>
        <Button type="button" onClick={onContinue}>
          Lanjut ke simulasi pembayaran
        </Button>
      </div>
    </div>
  );
}

function PaymentSimulation({
  identity,
  source,
  paymentState,
  onBack,
  onSimulate,
  onContinue,
}: {
  identity: SourceIdentity;
  source: string;
  paymentState: SimulatedPaymentState;
  onBack: () => void;
  onSimulate: () => void;
  onContinue: () => void;
}) {
  if (paymentState === "succeeded") {
    return (
      <section
        className={styles.prepaymentShell}
        data-payment-event={SIMULATED_PAYMENT_SUCCESS_EVENT}
        data-payment-state="succeeded"
        aria-labelledby="landing-payment-success-heading"
      >
        <div className={styles.prepaymentIntro}>
          <p className={styles.prepaymentEyebrow}>Pembayaran simulasi</p>
          <h1
            id="landing-payment-success-heading"
            className={styles.prepaymentHeading}
          >
            Pembayaran simulasi selesai
          </h1>
          <p className={styles.paymentSuccess}>
            Pembayaran simulasi selesai. Tidak ada tagihan.
          </p>
          <p className={styles.prepaymentLead}>
            Setelah Anda melanjutkan, sumber ini akan masuk ke alur persiapan
            audit. Analisis AI baru dimulai di sana.
          </p>
        </div>
        <div className={styles.prepaymentActions}>
          <Button type="button" onClick={onContinue}>
            Mulai persiapan audit
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.prepaymentShell}
      data-payment-state="pending"
      aria-labelledby="landing-payment-heading"
    >
      <div className={styles.prepaymentIntro}>
        <p className={styles.prepaymentEyebrow}>Langkah berikutnya</p>
        <h1 id="landing-payment-heading" className={styles.prepaymentHeading}>
          Simulasi pembayaran
        </h1>
        <p className={styles.paymentDisclosure}>
          Simulasi pembayaran — tidak ada tagihan. Tidak ada data pembayaran
          yang diminta atau dikirim.
        </p>
      </div>

      <section className={styles.identityCard} aria-label="Ringkasan sumber">
        <p className={styles.identityLabel}>
          Sumber yang akan diproses setelah simulasi
        </p>
        <strong>
          {identity.confidence && identity.display_name.trim()
            ? identity.display_name
            : "Identitas belum dapat dipastikan"}
        </strong>
        <p className={styles.identityDescription}>
          <code>{source}</code>
        </p>
      </section>

      <div className={styles.prepaymentActions}>
        <Button type="button" variant="ghost" onClick={onBack}>
          Kembali ke pratinjau identitas
        </Button>
        <Button type="button" onClick={onSimulate}>
          Simulasikan pembayaran
        </Button>
      </div>
    </section>
  );
}

export default function LandingAuditHero() {
  const router = useRouter();
  const [step, setStep] = useState<LandingStep>("source");
  const [source, setSource] = useState("");
  const [identity, setIdentity] = useState<SourceIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [paymentState, setPaymentState] =
    useState<SimulatedPaymentState>("pending");
  const [error, setError] = useState("");
  const identityInFlightRef = useRef(false);

  async function startAudit(normalizedUrl: string) {
    if (identityInFlightRef.current) return;
    identityInFlightRef.current = true;
    setIdentityLoading(true);
    setError("");

    try {
      try {
        // A new source replaces any resumable audit only after the user submits
        // a valid source. No completed workflow state is created here.
        window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
        window.sessionStorage.removeItem(AUDIT_WORKFLOW_STORAGE_KEY);
        window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
        window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
      } catch {
        setError(
          "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
        );
        return;
      }

      let failureCode: string | undefined;
      try {
        const response = await fetch(
          `/api/audit/identity?source=${encodeURIComponent(normalizedUrl)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as unknown;
        failureCode = responseCode(payload);
        const parsedIdentity = parseIdentityResponse(payload);
        if (!response.ok || !parsedIdentity) {
          throw new Error("Identity preview failed.");
        }
        setSource(normalizedUrl);
        setIdentity(parsedIdentity);
        setPaymentState("pending");
        setStep("preview");
      } catch {
        setStep("source");
        setIdentity(null);
        setError(customerAuditErrorMessage("extract", failureCode));
      }
    } finally {
      identityInFlightRef.current = false;
      setIdentityLoading(false);
    }
  }

  function editSource() {
    setIdentity(null);
    setSource("");
    setPaymentState("pending");
    setStep("source");
    setError("");
  }

  function openPaymentSimulation() {
    setError("");
    setStep("payment");
  }

  function simulatePayment() {
    if (!source || paymentState === "succeeded") return;
    try {
      // The only cross-route handoff written by simulated success is the
      // normalized source. It is consumed by SourceHero after navigation.
      window.sessionStorage.setItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY, source);
      setError("");
      setPaymentState("succeeded");
      setStep("success");
    } catch {
      setError(
        "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
      );
    }
  }

  function continueAfterPayment() {
    if (paymentState !== "succeeded") return;
    router.push("/audit");
  }

  return (
    <section
      className={`${styles.root} landing-audit-hero`}
      aria-label="Mulai audit visibilitas AI"
    >
      {step === "source" ? (
        <SourceHero
          key="landing-source"
          initialValue=""
          extracting={identityLoading}
          error={error}
          onExtract={startAudit}
          exiting={false}
          showLogo={false}
          autoFocus={false}
          consumeHandoff={false}
          contentClassName="mt-20 md:mt-0"
          backdropClassName={
            LANDING_TILE_EXPERIMENT_ENABLED
              ? styles.experimentalBackdrop
              : styles.legacyBackdrop
          }
          backdropOverlay={
            LANDING_TILE_EXPERIMENT_ENABLED ? <LandingTileReveal /> : null
          }
        />
      ) : null}

      {step === "preview" && identity ? (
        <IdentityPreview
          identity={identity}
          onEditSource={editSource}
          onContinue={openPaymentSimulation}
        />
      ) : null}

      {(step === "payment" || step === "success") && identity ? (
        <PaymentSimulation
          identity={identity}
          source={source}
          paymentState={paymentState}
          onBack={() => {
            setError("");
            setStep("preview");
          }}
          onSimulate={simulatePayment}
          onContinue={continueAfterPayment}
        />
      ) : null}

      {step !== "source" && error ? (
        <p className={styles.prepaymentError} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
