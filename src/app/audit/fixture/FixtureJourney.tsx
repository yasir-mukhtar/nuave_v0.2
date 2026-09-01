"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clearFixtureJourneySession,
  freshFixtureJourneyState,
  loadFixtureJourneyState,
  saveFixtureJourneyState,
  type FixtureJourneyState,
  type FixtureJourneyStage,
} from "@/lib/fixture-journey/state";
import {
  HISTORICAL_FIXTURE_NOTICE,
  fixtureJourneyContext,
  provenanceLabelText,
  questionClassExplanations,
} from "@/lib/fixture-journey/adapter";
import {
  FIXTURE_PROCESSING_WORK_STAGE_COUNT,
  fixtureProcessingStages,
  fixtureRunStatusLabelOrder,
  fixtureRunStatusLabels,
  processingStageDurationMs,
} from "@/lib/fixture-journey/processing";
import {
  FixtureJourneyReportError,
  buildFixtureEvidenceExport,
  constructFixtureReport,
} from "@/lib/fixture-journey/report";
import {
  kopiTamanSenjaBrief,
  kopiTamanSenjaObservations,
} from "@/lib/fixture-journey/adapter";
import type { AuditReport } from "@/lib/audit/types";
import FixtureReportView from "./FixtureReportView";
import styles from "./fixture.module.css";

const { business, offer, questions } = fixtureJourneyContext;

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

/**
 * Persistent fixture-preview disclosure. Rendered on every journey screen so
 * the fictional business, simulated processing, and no-payment facts are
 * visible without opening any secondary help (R-04, AC-13).
 */
function PreviewNotice() {
  return (
    <aside
      className={styles.previewNotice}
      aria-label="Pemberitahuan pratinjau fiktif"
    >
      <strong>Pratinjau fiktif.</strong>
      <span>
        {business.name} dan hasilnya fiktif. Proses AI disimulasikan. Tidak ada
        pembayaran yang diproses. Ini bukan audit pelanggan yang dikirimkan.
      </span>
    </aside>
  );
}

/**
 * The same disclosure rendered inside the report article so printed and
 * saved PDF output retains it (R-12, AC-12).
 */
function ReportPreviewNotice() {
  return (
    <div
      className={styles.reportPreviewNotice}
      role="note"
      aria-label="Pemberitahuan pratinjau fiktif"
    >
      <strong>Pratinjau fiktif.</strong>
      <span>
        {business.name} dan hasilnya fiktif. Proses AI disimulasikan. Tidak ada
        pembayaran yang diproses. Ini bukan audit pelanggan yang dikirimkan.
        Laporan contoh ini hanya ada di sesi tab ini.
      </span>
    </div>
  );
}

function ProvenanceTag({ label }: { label: string }) {
  return <span className={styles.provenanceTag}>{label}</span>;
}

/**
 * The explicit run confirmation dialog (R-22: the "Mulai audit sekarang"
 * confirmation opened by "Jalankan audit"). Shared by the questions screen
 * and the defensive run-screen pre-start branch.
 */
function RunStartDialog({
  open,
  onClose,
  onConfirm,
  returnRef,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  returnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(
        () => dialogHeadingRef.current?.focus(),
        0,
      );
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.dialogOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-dialog-heading"
    >
      <div className={styles.dialog}>
        <h2 id="run-dialog-heading" tabIndex={-1} ref={dialogHeadingRef}>
          Mulai audit sekarang?
        </h2>
        <p>
          Nuave akan menjalankan 10 pertanyaan ini satu per satu. Setelah
          dimulai, informasi bisnis dan pertanyaan tidak dapat diubah.
        </p>
        <p className={styles.note}>
          Ini adalah simulasi. Tidak ada penyedia atau layanan yang dihubungkan,
          dan tidak ada audit nyata yang dijalankan.
        </p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => {
              onClose();
              window.setTimeout(() => returnRef.current?.focus(), 0);
            }}
          >
            Kembali periksa
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onConfirm}
          >
            Mulai audit sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 01 — Order Preview (fixture intake + priced offer)
// ---------------------------------------------------------------------------

function PreviewScreen({
  headingRef,
  offerRevealed,
  onRevealOffer,
  onPay,
  offerRef,
}: {
  headingRef: HeadingRef;
  offerRevealed: boolean;
  onRevealOffer: () => void;
  onPay: () => void;
  offerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section aria-labelledby="fixture-preview-heading">
      <p className={styles.eyebrow}>01 Pratinjau pesanan · Langkah 1 dari 6</p>
      <h1
        id="fixture-preview-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Pratinjau pesanan untuk {business.name}
      </h1>
      <p className={styles.lede}>
        Pratinjau ini menampilkan satu pesanan contoh untuk satu AI Visibility
        Report. Tidak ada hasil, temuan, atau skor audit yang ditampilkan
        sebelum pembayaran. Bisnis dan seluruh datanya fiktif.
      </p>

      <section
        className={styles.card}
        aria-labelledby="preview-business-heading"
      >
        <h2 id="preview-business-heading" className={styles.cardTitle}>
          Bisnis yang akan diaudit
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Nama bisnis</dt>
            <dd className={styles.factValue}>{business.name}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Cabang, kota, atau area layanan
            </dt>
            <dd className={styles.factValue}>{business.scope}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Kategori</dt>
            <dd className={styles.factValue}>{business.category}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Deskripsi singkat</dt>
            <dd className={styles.factValue}>{business.shortDescription}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Sumber resmi</dt>
            <dd className={styles.factValue}>
              <ul className={styles.sourceList}>
                {business.officialSources.map((source) => (
                  <li key={source.url}>
                    <code>{source.url}</code>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="preview-scope-heading">
        <h2 id="preview-scope-heading" className={styles.cardTitle}>
          Yang akan diperiksa
        </h2>
        <p className={styles.note}>
          <strong>{HISTORICAL_FIXTURE_NOTICE}</strong> Satu audit menguji 10
          pertanyaan ala calon pelanggan:{" "}
          {questions.counts.tanpa_menyebut_bisnis_anda} Tanpa menyebut bisnis
          Anda dan {questions.counts.menyebut_bisnis_anda} Menyebut bisnis Anda,
          sesuai contoh yang dibekukan.
        </p>
        <p className={styles.note}>
          Pada contoh ini, pertanyaan disusun melalui{" "}
          {questions.generation.system} (model {questions.generation.model}) dan
          diuji melalui OpenAI Responses API dengan model gpt-5.6-luna serta
          pencarian web. Semua nama penyedia dan model tercatat di berkas contoh
          dan tidak dijalankan secara langsung.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="preview-report-heading">
        <h2 id="preview-report-heading" className={styles.cardTitle}>
          Isi laporan
        </h2>
        <p className={styles.note}>
          Satu AI Visibility Report berisi jawaban dan kutipan persis dari
          pengujian, analisis, bisnis lain yang disebut, temuan, saran yang
          dapat dilakukan, dan cara audit bekerja. Laporan dapat disimpan
          sebagai PDF melalui aksi Download PDF.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="preview-limits-heading">
        <h2 id="preview-limits-heading" className={styles.cardTitle}>
          Batasan laporan
        </h2>
        <p className={styles.note}>
          Laporan adalah cuplikan pada waktu tertentu dan dapat berubah
          berdasarkan model, tanggal, lokasi, bahasa, dan percakapan. Laporan
          bukan jaminan hasil. Laporan contoh hanya ada di sesi tab ini dan
          tidak dikirimkan kepada siapa pun.
        </p>
      </section>

      {!offerRevealed ? (
        <div className={styles.actionArea}>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Pratinjau ini memakai satu bisnis contoh fiktif. Tidak ada data
              bisnis nyata yang dimasukkan atau dikumpulkan.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onRevealOffer}
            >
              Cek bisnis saya di AI
            </button>
          </div>
        </div>
      ) : null}

      {offerRevealed ? (
        <div ref={offerRef} className={styles.offerPanel}>
          <h2 className={styles.offerHeading}>Ringkasan pesanan</h2>
          <dl className={styles.factList}>
            <div className={styles.factRow}>
              <dt className={styles.factLabel}>Audit</dt>
              <dd className={styles.factValue}>
                Satu AI Visibility Report untuk {business.name} ·{" "}
                {business.scope}
              </dd>
            </div>
            <div className={styles.factRow}>
              <dt className={styles.factLabel}>Ruang lingkup</dt>
              <dd className={styles.factValue}>
                {offer.scopeLabel} dengan 10 pertanyaan
              </dd>
            </div>
            <div className={styles.factRow}>
              <dt className={styles.factLabel}>Total</dt>
              <dd className={styles.factValue}>
                <strong>{offer.totalLabel}</strong>
                <span className={styles.factSub}>
                  Tidak ada pajak atau biaya tambahan.
                </span>
              </dd>
            </div>
            <div className={styles.factRow}>
              <dt className={styles.factLabel}>Penawaran</dt>
              <dd className={styles.factValue}>
                Berlaku {offer.quoteDays} hari selama belum dibayar.
              </dd>
            </div>
          </dl>
          <div className={styles.actionArea}>
            <div className={styles.actionsRow}>
              <p className={styles.actionHint}>
                Tombol ini membuka simulasi pembayaran. Tidak ada tagihan nyata
                yang dibuat.
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onPay}
              >
                Bayar {offer.totalLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 02 — Payment (simulated)
// ---------------------------------------------------------------------------

function PaymentScreen({
  headingRef,
  simulatedPaid,
  onSimulatePayment,
  onContinue,
  onBack,
}: {
  headingRef: HeadingRef;
  simulatedPaid: boolean;
  onSimulatePayment: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section aria-labelledby="fixture-payment-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Kembali ke pratinjau pesanan
        </button>
      </div>
      <p className={styles.eyebrow}>
        02 Pembayaran (simulasi) · Langkah 2 dari 6
      </p>
      <h1
        id="fixture-payment-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Simulasi pembayaran
      </h1>

      <div
        className={styles.checkoutPanel}
        aria-labelledby="payment-total-heading"
      >
        <h2 id="payment-total-heading" className={styles.checkoutHeading}>
          Pesanan contoh
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Bisnis</dt>
            <dd className={styles.factValue}>
              {business.name} · {business.scope}
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Audit</dt>
            <dd className={styles.factValue}>
              Satu AI Visibility Report dengan 10 pertanyaan
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Total</dt>
            <dd className={styles.factValue}>
              <strong>{offer.totalLabel}</strong>
              <span className={styles.factSub}>
                Tidak ada pajak atau biaya tambahan.
              </span>
            </dd>
          </div>
        </dl>
        <p className={styles.checkoutPhrase}>
          Simulasi pembayaran — tidak ada tagihan
        </p>
        <p className={styles.checkoutExplanation}>
          Tidak ada kartu, e-wallet, transfer bank, atau metode pembayaran lain
          di pratinjau ini. Tidak ada widget penyedia pembayaran, struk, atau
          nomor transaksi.
        </p>
      </div>

      {!simulatedPaid ? (
        <div className={styles.actionArea}>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Menyelesaikan langkah ini hanya menandai pembayaran sebagai
              simulasi di sesi tab ini. Tidak ada yang ditagih dan tidak ada
              yang dibuat.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onSimulatePayment}
            >
              Selesaikan simulasi pembayaran
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.approvedPanel} role="status">
            <strong>Pembayaran simulasi selesai. Tidak ada tagihan.</strong>
            <span>
              Tidak ada biaya, struk, pesanan, atau hak audit yang dibuat.
              Status ini hanya tersimpan di sesi tab ini.
            </span>
          </div>
          <div className={styles.actionArea}>
            <div className={styles.actionsRow}>
              <p className={styles.actionHint}>
                Pembayaran ini tidak memulai audit. Audit hanya dimulai lewat
                aksi Jalankan audit di langkah 4.
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onContinue}
              >
                Lanjut ke fakta bisnis
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 03 — Business Facts (read-only fixture facts, explicit confirmation)
// ---------------------------------------------------------------------------

function FactsScreen({
  headingRef,
  factsConfirmed,
  onContinue,
  onBack,
}: {
  headingRef: HeadingRef;
  factsConfirmed: boolean;
  onContinue: (checked: boolean) => void;
  onBack: () => void;
}) {
  const [checked, setChecked] = useState(factsConfirmed);

  return (
    <section aria-labelledby="fixture-facts-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Kembali ke pembayaran
        </button>
      </div>
      <p className={styles.eyebrow}>03 Fakta bisnis · Langkah 3 dari 6</p>
      <h1
        id="fixture-facts-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Periksa informasi bisnis Anda
      </h1>
      <p className={styles.lede}>
        Kami menyiapkan informasi ini dari sumber publik. Pada pratinjau ini,
        fakta hanya dapat dibaca dan tidak dapat diubah.
      </p>

      <section
        className={styles.card}
        aria-labelledby="fixture-facts-list-heading"
      >
        <h2 id="fixture-facts-list-heading" className={styles.cardTitle}>
          Bisnis yang akan diaudit
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Nama bisnis</dt>
            <dd className={styles.factValue}>
              {business.name}{" "}
              <ProvenanceTag label={provenanceLabelText.found_website} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Cabang, kota, atau area layanan
            </dt>
            <dd className={styles.factValue}>
              {business.scope}{" "}
              <ProvenanceTag label={provenanceLabelText.needs_review} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Kategori bisnis</dt>
            <dd className={styles.factValue}>
              {business.category}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
              <span className={styles.factSub}>
                Saran lain: {business.categorySuggestions.join(", ")}
              </span>
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Deskripsi singkat</dt>
            <dd className={styles.factValue}>
              {business.shortDescription}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Produk atau layanan utama</dt>
            <dd className={styles.factValue}>
              {business.productsServices.map((item) => item.value).join(", ")}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Siapa yang biasanya mencari bisnis Anda?
            </dt>
            <dd className={styles.factValue}>
              {business.customerContext.who}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Apa yang biasanya mereka butuhkan?
            </dt>
            <dd className={styles.factValue}>
              {business.customerContext.needs}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Apa yang biasanya mereka pertimbangkan?
            </dt>
            <dd className={styles.factValue}>
              {business.customerContext.considerations}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>
              Apa yang membuat bisnis Anda berbeda?
            </dt>
            <dd className={styles.factValue}>
              {business.differentiator?.value ?? ""}{" "}
              <ProvenanceTag label={provenanceLabelText.suggestion_nuave} />
            </dd>
          </div>
          {business.comparisonBusiness ? (
            <div className={styles.factRow}>
              <dt className={styles.factLabel}>Bisnis pembanding</dt>
              <dd className={styles.factValue}>
                {business.comparisonBusiness.name} ·{" "}
                {business.comparisonBusiness.category} ·{" "}
                {business.comparisonBusiness.scope}
                <span className={styles.factSub}>
                  {business.comparisonBusiness.reason} Sumber:{" "}
                  <code>{business.comparisonBusiness.source_url}</code>
                </span>
              </dd>
            </div>
          ) : null}
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Sumber resmi</dt>
            <dd className={styles.factValue}>
              <ul className={styles.sourceList}>
                {business.officialSources.map((source) => (
                  <li key={source.url}>
                    <code>{source.url}</code> ·{" "}
                    {source.type === "website"
                      ? "Website"
                      : source.type === "google_maps"
                        ? "Simulasi Google Maps"
                        : "Simulasi Instagram"}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      {business.warnings.length ? (
        <section
          className={styles.warningPanel}
          aria-labelledby="facts-warning-heading"
        >
          <h2 id="facts-warning-heading" className={styles.warningHeading}>
            Kami menemukan informasi yang berbeda
          </h2>
          {business.warnings.map((warning) => (
            <p key={`${warning.kind}-${warning.field}`} className={styles.note}>
              {warning.message}
            </p>
          ))}
        </section>
      ) : null}

      <div className={styles.actionArea}>
        <label className={styles.confirmRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>
            Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan
            dalam pertanyaan audit.
          </span>
        </label>
        <div className={styles.actionsRow}>
          <p className={styles.actionHint}>
            Anda masih dapat memeriksa pertanyaan di langkah berikutnya sebelum
            audit dijalankan. Fakta bersifat hanya-baca pada pratinjau ini.
          </p>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => onContinue(checked)}
          >
            Buat pertanyaan audit
          </button>
        </div>
      </div>
      {factsConfirmed ? (
        <p className={styles.note}>
          ✓ Fakta contoh sudah dikonfirmasi sebelumnya di pratinjau ini.
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 04 — Questions (frozen ten-question pack, explicit approval, run start)
// ---------------------------------------------------------------------------

function QuestionsScreen({
  headingRef,
  questionsApproved,
  onApprove,
  onOpenRunDialog,
  onCloseRunDialog,
  runDialogOpen,
  onConfirmRun,
  onBack,
  dialogReturnRef,
}: {
  headingRef: HeadingRef;
  questionsApproved: boolean;
  onApprove: (checked: boolean) => void;
  onOpenRunDialog: () => void;
  onCloseRunDialog: () => void;
  runDialogOpen: boolean;
  onConfirmRun: () => void;
  onBack: () => void;
  dialogReturnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <section aria-labelledby="fixture-questions-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Kembali ke fakta bisnis
        </button>
      </div>
      <p className={styles.eyebrow}>04 Pertanyaan · Langkah 4 dari 6</p>
      <h1
        id="fixture-questions-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Periksa pertanyaan audit
      </h1>
      <p className={styles.lede}>
        Nuave menyiapkan 10 pertanyaan sebagai titik awal. Pada pratinjau ini,
        pertanyaan hanya dapat dibaca dan tidak dapat diubah.
      </p>
      <p className={styles.lede}>
        <strong>{HISTORICAL_FIXTURE_NOTICE}</strong>
      </p>
      <p className={styles.lede}>
        <strong>Audit belum dimulai.</strong>
      </p>

      <div className={styles.classCards}>
        <section className={styles.classCard}>
          <h2>
            {questionClassExplanations.unbranded.label} ·{" "}
            {questions.counts.tanpa_menyebut_bisnis_anda}
          </h2>
          <p>{questionClassExplanations.unbranded.detail}</p>
        </section>
        <section className={styles.classCard}>
          <h2>
            {questionClassExplanations.branded.label} ·{" "}
            {questions.counts.menyebut_bisnis_anda}
          </h2>
          <p>{questionClassExplanations.branded.detail}</p>
        </section>
      </div>

      <ol className={styles.questionList}>
        {questions.all.map((question) => (
          <li key={question.order} className={styles.questionItem}>
            <span className={styles.questionNumber} aria-hidden="true">
              {question.order}
            </span>
            <div className={styles.questionBody}>
              <p className={styles.questionText}>{question.text}</p>
              <span className={styles.questionChip}>
                {question.final_classification === "menyebut_bisnis_anda"
                  ? "Menyebut bisnis Anda"
                  : "Tanpa menyebut bisnis Anda"}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {!questionsApproved ? (
        <div className={styles.actionArea}>
          <label className={styles.confirmRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>Saya menyetujui sepuluh pertanyaan ini untuk audit.</span>
          </label>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Menyetujui mengunci paket pertanyaan untuk simulasi audit.
              Pertanyaan tetap persis seperti yang ditampilkan di atas.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => onApprove(checked)}
            >
              Setujui pertanyaan
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.runReadyPanel}>
          <strong>10 pertanyaan siap dijalankan</strong>
          <span>
            Setelah audit dimulai, informasi bisnis dan pertanyaan tidak dapat
            diubah.
          </span>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Audit hanya dimulai setelah Anda mengonfirmasi melalui dialog
              Mulai audit sekarang.
            </p>
            <button
              type="button"
              ref={dialogReturnRef}
              className={styles.primaryAction}
              onClick={onOpenRunDialog}
            >
              Jalankan audit
            </button>
          </div>
        </div>
      )}

      {runDialogOpen ? (
        <RunStartDialog
          open={runDialogOpen}
          onClose={onCloseRunDialog}
          onConfirm={onConfirmRun}
          returnRef={dialogReturnRef}
        />
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 05 — Audit Run (explicit run action + deterministic simulated processing)
// ---------------------------------------------------------------------------

function RunScreen({
  headingRef,
  runStarted,
  processingStage,
  interrupted,
  onStartRun,
  onCloseRunDialog,
  runDialogOpen,
  onConfirmRun,
  returnRef,
  onResume,
  onStartOver,
}: {
  headingRef: HeadingRef;
  runStarted: boolean;
  processingStage: number;
  interrupted: boolean;
  onStartRun: () => void;
  onCloseRunDialog: () => void;
  runDialogOpen: boolean;
  onConfirmRun: () => void;
  returnRef: React.RefObject<HTMLButtonElement | null>;
  onResume: () => void;
  onStartOver: () => void;
}) {
  // Defensive pre-start branch: the run screen is normally entered only by
  // the explicit run action (which sets runStarted atomically), but a
  // restored state is validated, so show the explicit run action if it is
  // ever missing.
  if (!runStarted) {
    return (
      <section aria-labelledby="fixture-run-heading">
        <p className={styles.eyebrow}>05 Audit berjalan · Langkah 5 dari 6</p>
        <h1
          id="fixture-run-heading"
          className={styles.heading}
          tabIndex={-1}
          ref={headingRef}
        >
          Audit siap dijalankan
        </h1>
        <div className={styles.simulationNotice} role="status">
          <strong>Ini adalah simulasi.</strong>
          <span>
            Tidak ada penyedia, model, pencarian, atau layanan pembayaran yang
            dihubungkan.
          </span>
        </div>
        <div className={styles.actionArea}>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Jalankan audit hanya dimulai setelah Anda mengonfirmasi dialog
              Mulai audit sekarang.
            </p>
            <button
              type="button"
              ref={returnRef}
              className={styles.primaryAction}
              onClick={onStartRun}
            >
              Jalankan audit
            </button>
          </div>
        </div>
        <RunStartDialog
          open={runDialogOpen}
          onClose={onCloseRunDialog}
          onConfirm={onConfirmRun}
          returnRef={returnRef}
        />
      </section>
    );
  }

  const current = fixtureProcessingStages[processingStage];
  const statusText = interrupted
    ? `Simulasi berhenti pada tahap ${current.label.toLowerCase()}.`
    : `Simulasi berjalan: ${current.label.toLowerCase()}.`;

  return (
    <section aria-labelledby="fixture-run-heading">
      <p className={styles.eyebrow}>05 Audit berjalan · Langkah 5 dari 6</p>
      <h1
        id="fixture-run-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Simulasi audit berjalan
      </h1>
      <div className={styles.simulationNotice} role="status">
        <strong>Ini adalah simulasi.</strong>
        <span>
          Tidak ada penyedia, model, pencarian, atau layanan pembayaran yang
          dihubungi. Seluruh urutan ini disimulasikan di tab ini.
        </span>
      </div>
      {interrupted ? (
        <div className={styles.interruptedNotice} role="status">
          <strong>Simulasi berhenti.</strong>
          <span>
            Simulasi berhenti saat halaman ditutup atau dimuat ulang. Tidak ada
            pekerjaan yang berlanjut di latar belakang. Pilih Lanjutkan simulasi
            untuk meneruskan dari tahap yang ditampilkan, atau mulai ulang.
          </span>
        </div>
      ) : null}
      <p className={styles.lede} aria-live="polite">
        Nuave sedang menjalankan 10 pertanyaan yang Anda setujui. Setiap
        pertanyaan diuji secara terpisah.
      </p>
      <p className={styles.lede} aria-live="polite">
        Status: {statusText}
      </p>

      <ol className={styles.processingList}>
        {fixtureProcessingStages.map((stage, index) => {
          const done = index < processingStage;
          const active = index === processingStage;
          return (
            <li
              key={stage.id}
              className={`${styles.processingItem} ${
                active ? styles.processingItemActive : ""
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className={styles.processingMarker} aria-hidden="true">
                {done ? "✓" : index + 1}
              </span>
              <span className={styles.processingLabel}>{stage.label}</span>
              {active ? (
                <span
                  className={
                    interrupted ? styles.processingPaused : styles.processingNow
                  }
                >
                  {interrupted ? "berhenti" : "berjalan"}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <section className={styles.card} aria-labelledby="run-questions-heading">
        <h2 id="run-questions-heading" className={styles.cardTitle}>
          Sepuluh pertanyaan
        </h2>
        <ol className={styles.runQuestionList}>
          {questions.all.map((question) => (
            <li key={question.order} className={styles.runQuestionRow}>
              <span className={styles.questionNumber} aria-hidden="true">
                {question.order}
              </span>
              <span className={styles.runQuestionText}>{question.text}</span>
              <span className={styles.runStatusChip}>
                {fixtureRunStatusLabels.waiting}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          Label status: {fixtureRunStatusLabelOrder.join(" · ")}. Selama
          simulasi, setiap pertanyaan tetap berlabel Menunggu karena tidak ada
          penyelesaian langsung per pertanyaan yang diklaim. Laporan akhir
          menampilkan status Selesai dari bukti contoh yang sudah dibekukan.
        </p>
      </section>

      {interrupted ? (
        <div className={styles.actionArea}>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Melanjutkan meneruskan simulasi dari tahap yang ditampilkan. Tidak
              ada yang dijalankan saat Anda pergi.
            </p>
            <span className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onResume}
              >
                Lanjutkan simulasi
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={onStartOver}
              >
                Mulai ulang
              </button>
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.note}>
          Simulasi hanya berjalan saat tab ini terbuka. Menutup tab menghentikan
          simulasi dan tidak ada pekerjaan yang berlanjut di latar belakang.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 06 — Report (frozen evidence, Indonesian report view)
// ---------------------------------------------------------------------------

function ReadyScreen({
  headingRef,
  report,
  reportConstructionFailed,
  retryError,
  retryErrorRef,
  onRetryReport,
  onStartOver,
  onDownloadJson,
  onDownloadPdf,
}: {
  headingRef: HeadingRef;
  report: AuditReport | null;
  reportConstructionFailed: boolean;
  retryError: string;
  retryErrorRef: React.RefObject<HTMLParagraphElement | null>;
  onRetryReport: () => void;
  onStartOver: () => void;
  onDownloadJson: () => void;
  onDownloadPdf: () => void;
}) {
  if (reportConstructionFailed) {
    return (
      <section aria-labelledby="fixture-failure-heading">
        <p className={styles.eyebrow}>Laporan contoh · Langkah 6 dari 6</p>
        <h1
          id="fixture-failure-heading"
          className={styles.heading}
          tabIndex={-1}
          ref={headingRef}
        >
          Laporan contoh tidak dapat dibuat
        </h1>
        <div className={styles.terminalError} role="alert">
          <h2>Pembuatan laporan contoh gagal</h2>
          <p>
            Pembuatan laporan lokal gagal, sehingga tidak ada laporan contoh
            yang siap. Tidak ada panggilan audit langsung yang dilakukan, dan
            tidak akan ada sebagai bagian dari pratinjau ini. Anda dapat mencoba
            lagi pembuatan lokal atau mulai ulang.
          </p>
          {retryError ? (
            <p
              id="fixture-retry-error"
              className={styles.retryError}
              role="alert"
              tabIndex={-1}
              ref={retryErrorRef}
            >
              {retryError}
            </p>
          ) : null}
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onRetryReport}
            >
              Coba buat laporan contoh lagi
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={onStartOver}
            >
              Mulai ulang
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="fixture-ready-heading">
      <p className={styles.eyebrow}>06 Laporan · Langkah 6 dari 6</p>
      <h1
        id="fixture-ready-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        AI Visibility Report (contoh fiktif)
      </h1>
      <p className={styles.lede}>
        Laporan ini dibangun dari bukti contoh yang sudah dibekukan untuk
        {business.name}. Laporan ini hanya ada di sesi tab ini, tidak dihosting
        secara privat, dan tidak dikirimkan kepada siapa pun.
      </p>

      {report ? (
        <div className={styles.reportWorkspace}>
          <FixtureReportView
            report={report}
            brief={kopiTamanSenjaBrief}
            observations={kopiTamanSenjaObservations}
            onDownloadJson={onDownloadJson}
            onDownloadPdf={onDownloadPdf}
            previewNotice={<ReportPreviewNotice />}
          />
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Journey shell
// ---------------------------------------------------------------------------

export default function FixtureJourney({
  forceReportFailure = false,
}: {
  /** Server-controlled test configuration; never customer-selectable. */
  forceReportFailure?: boolean;
}) {
  const [journey, setJourney] = useState<FixtureJourneyState>(
    freshFixtureJourneyState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [gateError, setGateError] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [interruptedRestore, setInterruptedRestore] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  // Read once during first render; the subscription below keeps it current.
  // Not rendered into JSX, so the SSR fallback never causes a hydration gap.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [fixtureReport, setFixtureReport] = useState<AuditReport | null>(null);
  const [retryError, setRetryError] = useState("");
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const retryErrorRef = useRef<HTMLParagraphElement | null>(null);
  const offerRef = useRef<HTMLDivElement | null>(null);
  const dialogReturnRef = useRef<HTMLButtonElement | null>(null);

  // Restore the furthest valid fixture state from session storage. Invalid
  // or version-incompatible state (including stored v1/v2 Spec 001 shapes)
  // is cleared and the journey starts over with a visible explanation. A
  // restored mid-run state is paused: the simulation stops when the page
  // closes or refreshes and resumes only after the reviewer explicitly
  // chooses Lanjutkan simulasi. At the ready destination, the example report
  // is reconstructed locally from the same fixture (deterministic except for
  // the generated timestamp).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { state, reset } = loadFixtureJourneyState();
      setJourney(state);
      setResetNotice(reset);
      if (
        state.stage === "run" &&
        state.runStarted &&
        !state.processingCompleted
      ) {
        setInterruptedRestore(true);
      }
      if (state.stage === "ready" && !state.reportConstructionFailed) {
        try {
          setFixtureReport(
            constructFixtureReport(
              forceReportFailure ? { forceFailure: true } : {},
            ),
          );
        } catch (error) {
          if (error instanceof FixtureJourneyReportError) {
            setJourney((current) => ({
              ...current,
              reportConstructionFailed: true,
            }));
          } else {
            throw error;
          }
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [forceReportFailure]);

  // Persist only validated, version-compatible fixture state.
  useEffect(() => {
    if (!hydrated) return;
    saveFixtureJourneyState(journey);
  }, [hydrated, journey]);

  // Move focus to the stage heading and scroll to the top on stage change.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, journey.stage]);

  // Track the reduced-motion preference so the simulated run completes
  // near-immediately while still showing the same meaningful stage text.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Deterministic, bounded simulated processing. Each work stage advances on
  // a fixed timer; the final stage builds the example report locally. The
  // run never calls a provider and never continues after this component
  // unmounts (tab closed or journey reset). A restored mid-run state stays
  // paused until the reviewer explicitly resumes it.
  useEffect(() => {
    if (journey.stage !== "run") return;
    if (!journey.runStarted) return;
    if (interruptedRestore) return;
    const duration = processingStageDurationMs(reducedMotion);
    const timer = window.setTimeout(() => {
      const nextStage = journey.processingStage + 1;
      if (nextStage < FIXTURE_PROCESSING_WORK_STAGE_COUNT) {
        setJourney((current) => ({ ...current, processingStage: nextStage }));
        return;
      }
      try {
        const report = constructFixtureReport(
          forceReportFailure ? { forceFailure: true } : {},
        );
        setFixtureReport(report);
        setJourney((current) => ({
          ...current,
          processingStage: FIXTURE_PROCESSING_WORK_STAGE_COUNT - 1,
          processingCompleted: true,
          stage: "ready",
        }));
      } catch (error) {
        if (error instanceof FixtureJourneyReportError) {
          setJourney((current) => ({
            ...current,
            processingStage: FIXTURE_PROCESSING_WORK_STAGE_COUNT - 1,
            processingCompleted: true,
            reportConstructionFailed: true,
            stage: "ready",
          }));
          return;
        }
        throw error;
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [
    journey.stage,
    journey.runStarted,
    journey.processingStage,
    reducedMotion,
    forceReportFailure,
    interruptedRestore,
  ]);

  function showGateError(message: string) {
    setGateError(message);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  }

  function goToStage(stage: FixtureJourneyStage) {
    setGateError("");
    setConfirmingReset(false);
    setJourney((current) => ({ ...current, stage }));
  }

  function revealOffer() {
    setJourney((current) => ({ ...current, offerRevealed: true }));
    window.setTimeout(
      () =>
        offerRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        }),
      0,
    );
  }

  function simulatePayment() {
    setJourney((current) => ({ ...current, simulatedPaid: true }));
    setGateError("");
  }

  function continueAfterFacts(checked: boolean) {
    if (!checked) {
      showGateError(
        "Periksa fakta bisnis di atas dan konfirmasi sebelum melanjutkan.",
      );
      return;
    }
    setJourney((current) => ({
      ...current,
      stage: "questions",
      factsConfirmed: true,
    }));
    setGateError("");
  }

  function approveQuestionPack(checked: boolean) {
    if (!checked) {
      showGateError("Setujui sepuluh pertanyaan sebelum menjalankan audit.");
      return;
    }
    setJourney((current) => ({
      ...current,
      questionsApproved: true,
    }));
    setGateError("");
  }

  function openRunDialog() {
    setRunDialogOpen(true);
  }

  function closeRunDialog() {
    setRunDialogOpen(false);
    window.setTimeout(() => dialogReturnRef.current?.focus(), 0);
  }

  function confirmRun() {
    setRunDialogOpen(false);
    setJourney((current) => ({
      ...current,
      runStarted: true,
      processingStage: 0,
      stage: "run",
    }));
    setGateError("");
  }

  function retryReportConstruction() {
    try {
      const report = constructFixtureReport(
        forceReportFailure ? { forceFailure: true } : {},
      );
      setFixtureReport(report);
      setRetryError("");
      setJourney((current) => ({
        ...current,
        reportConstructionFailed: false,
      }));
    } catch (error) {
      if (error instanceof FixtureJourneyReportError) {
        // Perceivable feedback: the retry failed and construction is still
        // unavailable; the reviewer can retry again or start over.
        setRetryError(
          "Percobaan ulang gagal: pembuatan lokal masih belum dapat membuat laporan contoh. Anda dapat mencoba lagi atau mulai ulang.",
        );
        window.setTimeout(() => retryErrorRef.current?.focus(), 0);
        return;
      }
      throw error;
    }
  }

  function resumeSimulatedRun() {
    setInterruptedRestore(false);
    setGateError("");
  }

  function downloadExampleEvidenceJson() {
    if (!fixtureReport) return;
    const evidence = buildFixtureEvidenceExport(fixtureReport);
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kopi-taman-senja-nuave-fixture-evidence.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    window.print();
  }

  function beginStartOver() {
    const hasProgress =
      journey.stage !== "preview" ||
      journey.simulatedPaid ||
      journey.factsConfirmed ||
      journey.questionsApproved ||
      journey.runStarted ||
      journey.processingCompleted;
    if (hasProgress) {
      setConfirmingReset(true);
      return;
    }
    startOver();
  }

  function startOver() {
    clearFixtureJourneySession();
    setJourney(freshFixtureJourneyState());
    setFixtureReport(null);
    setRetryError("");
    setGateError("");
    setConfirmingReset(false);
    setResetNotice(false);
    setInterruptedRestore(false);
    setRunDialogOpen(false);
  }

  const stage = journey.stage;

  return (
    <main className={styles.shell} lang="id" data-theme="light">
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            N
          </span>
          Nuave · pratinjau fiktif
        </Link>
        <div className={styles.topActions}>
          {stage === "ready" &&
          fixtureReport &&
          !journey.reportConstructionFailed ? (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={downloadPdf}
            >
              Download PDF
            </button>
          ) : null}
          <button
            type="button"
            className={styles.ghostAction}
            onClick={beginStartOver}
          >
            Mulai ulang
          </button>
        </div>
      </header>

      {confirmingReset ? (
        <div className={styles.confirmBar} role="alert">
          <span>
            Mulai ulang mengembalikan pratinjau ke langkah 01 dan hanya
            menghapus progres pratinjau yang tersimpan di tab ini.
          </span>
          <span className={styles.topActions}>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={startOver}
            >
              Konfirmasi mulai ulang
            </button>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={() => setConfirmingReset(false)}
            >
              Tetap di pratinjau
            </button>
          </span>
        </div>
      ) : null}

      <PreviewNotice />

      {resetNotice ? (
        <div className={styles.resetNotice} role="status">
          <strong>Pratinjau diatur ulang.</strong>
          <span>
            Status yang tersimpan hilang, kedaluwarsa, atau tidak sesuai dengan
            urutan pratinjau saat ini, sehingga dihapus. Anda berada di awal
            pratinjau, yaitu langkah 01.
          </span>
        </div>
      ) : null}

      {gateError ? (
        <div
          id="fixture-gate-error"
          className={styles.gateError}
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {gateError}
        </div>
      ) : null}

      <div className={styles.workspace}>
        {stage === "preview" ? (
          <PreviewScreen
            headingRef={headingRef}
            offerRevealed={journey.offerRevealed}
            onRevealOffer={revealOffer}
            onPay={() => goToStage("payment")}
            offerRef={offerRef}
          />
        ) : null}
        {stage === "payment" ? (
          <PaymentScreen
            headingRef={headingRef}
            simulatedPaid={journey.simulatedPaid}
            onSimulatePayment={simulatePayment}
            onContinue={() => goToStage("facts")}
            onBack={() => goToStage("preview")}
          />
        ) : null}
        {stage === "facts" ? (
          <FactsScreen
            headingRef={headingRef}
            factsConfirmed={journey.factsConfirmed}
            onContinue={continueAfterFacts}
            onBack={() => goToStage("payment")}
          />
        ) : null}
        {stage === "questions" ? (
          <QuestionsScreen
            headingRef={headingRef}
            questionsApproved={journey.questionsApproved}
            onApprove={approveQuestionPack}
            onOpenRunDialog={openRunDialog}
            onCloseRunDialog={closeRunDialog}
            runDialogOpen={runDialogOpen}
            onConfirmRun={confirmRun}
            onBack={() => goToStage("facts")}
            dialogReturnRef={dialogReturnRef}
          />
        ) : null}
        {stage === "run" ? (
          <RunScreen
            headingRef={headingRef}
            runStarted={journey.runStarted}
            processingStage={journey.processingStage}
            interrupted={interruptedRestore}
            onStartRun={openRunDialog}
            onCloseRunDialog={closeRunDialog}
            runDialogOpen={runDialogOpen}
            onConfirmRun={confirmRun}
            returnRef={dialogReturnRef}
            onResume={resumeSimulatedRun}
            onStartOver={beginStartOver}
          />
        ) : null}
        {stage === "ready" ? (
          <ReadyScreen
            headingRef={headingRef}
            report={fixtureReport}
            reportConstructionFailed={journey.reportConstructionFailed}
            retryError={retryError}
            retryErrorRef={retryErrorRef}
            onRetryReport={retryReportConstruction}
            onStartOver={beginStartOver}
            onDownloadJson={downloadExampleEvidenceJson}
            onDownloadPdf={downloadPdf}
          />
        ) : null}
      </div>
    </main>
  );
}
