"use client";

import { IconExternalLink } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  ReportSectionHeading,
  ReportToolbar,
} from "@/components/product/ReportToolbar";
import type {
  AuditObservation,
  AuditReport,
  BusinessBrief,
} from "@/lib/audit/types";
import {
  fixtureObservationCompositionLabel,
  fixtureObservationResultLabel,
  kopiTamanSenjaMeasures,
  kopiTamanSenjaMethod,
} from "@/lib/fixture-journey/adapter";
import {
  INDONESIAN_REPORT_LABELS,
  indonesianCountLabel,
  indonesianHeadline,
  indonesianMeasureLabel,
} from "@/lib/audit/report-labels";
import styles from "./fixture.module.css";

function formatDateWib(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function formatTimeWib(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const ownerLabels: Record<string, string> = {
  business_owner: "Pemilik bisnis",
  admin: "Admin",
  marketing: "Marketing",
  web_developer: "Pengembang web",
};

function SectionHeading({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <ReportSectionHeading
      number={number}
      className={styles.reportSectionHeading}
    >
      {children}
    </ReportSectionHeading>
  );
}

function testReferences(
  ids: string[],
  testNumberById: Map<string, string>,
): string {
  const numbers = ids.map((id) => testNumberById.get(id) ?? id);
  return numbers.join(", ");
}

/**
 * Indonesian report view for the fixture journey (Spec 002 R-11/R-12/R-40,
 * AC-11/AC-12/AC-21/AC-22/AC-26). Renders the same report and observation
 * objects that are printed and exported; exact evidence stays verbatim.
 */
export default function FixtureReportView({
  report,
  observations,
  brief,
  previewNotice,
  onDownloadJson,
  onDownloadPdf,
}: {
  report: AuditReport;
  brief: BusinessBrief;
  observations: AuditObservation[];
  previewNotice?: React.ReactNode;
  onDownloadJson: () => void;
  onDownloadPdf: () => void;
}) {
  const testNumberById = new Map(
    observations.map((item, index) => [
      item.prompt_id,
      String(index + 1).padStart(2, "0"),
    ]),
  );
  const observationById = new Map(
    observations.map((item) => [item.prompt_id, item]),
  );
  const runDate = formatDateWib(kopiTamanSenjaMethod.runCompletedAt);
  const runWindow = `${formatTimeWib(
    kopiTamanSenjaMethod.runStartedAt,
  )}–${formatTimeWib(kopiTamanSenjaMethod.runCompletedAt)} WIB`;
  const measures = kopiTamanSenjaMeasures;
  const accuracyLabel =
    report.accuracy_status === "no_clear_issues"
      ? "Tidak ada masalah yang jelas"
      : report.accuracy_status === "needs_confirmation"
        ? "Perlu konfirmasi"
        : report.accuracy_status === "needs_correction"
          ? "Perlu koreksi"
          : "Tidak dapat dinilai";

  return (
    <div className={styles.reportWrap}>
      <ReportToolbar
        className={`${styles.reportToolbar} ${styles.noPrint}`}
        onDownloadPdf={onDownloadPdf}
        onDownloadJson={onDownloadJson}
        pdfLabel="Download PDF"
        jsonLabel="Unduh JSON"
      />
      <article className={styles.report}>
        {previewNotice ? previewNotice : null}
        <header className={styles.reportHero} tabIndex={-1}>
          <div className={styles.reportTitleBlock}>
            <p className={styles.reportEyebrow}>AI Visibility Report</p>
            <h1>{brief.brand_name}</h1>
            <p className={styles.reportSubtitle}>{brief.entity_scope}</p>
            <span className={styles.reportFictionalBadge}>
              Contoh fiktif, bukan hasil audit pelanggan
            </span>
          </div>
          <dl className={styles.reportScopeGrid}>
            <div>
              <dt>Tanggal audit</dt>
              <dd>{runDate}</dd>
            </div>
            <div>
              <dt>Pertanyaan yang diperiksa</dt>
              <dd>{observations.length} pertanyaan independen</dd>
            </div>
            <div>
              <dt>Status pengujian</dt>
              <dd>10 dari 10 selesai</dd>
            </div>
          </dl>
          <nav className={styles.reportContents} aria-label="Isi laporan">
            <span>Di dalam laporan ini</span>
            <ol>
              <li>
                <a href="#fixture-summary">Hasil utama</a>
              </li>
              <li>
                <a href="#fixture-findings">Temuan</a>
              </li>
              <li>
                <a href="#fixture-actions">Yang dapat dilakukan</a>
              </li>
              <li>
                <a href="#fixture-detail">Hasil tes per pertanyaan</a>
              </li>
              <li>
                <a href="#fixture-method">Cara audit ini bekerja</a>
              </li>
            </ol>
          </nav>
        </header>

        <section className={styles.reportSection} id="fixture-summary">
          <SectionHeading number="01">Hasil Utama</SectionHeading>
          <div className={styles.resultGrid}>
            <div className={styles.mainResult}>
              <strong>
                {indonesianCountLabel(
                  measures.overall.appeared,
                  measures.overall.total,
                )}
              </strong>
              <h3>{indonesianHeadline(measures.overall.appeared)}</h3>
              <p className={styles.resultNote}>
                Jumlah ini mencakup pertanyaan yang menyebut nama brand Anda.
                Dua ukuran di bawah menampilkan kemunculan spontan dan
                pengenalan saat nama disebut secara terpisah.
              </p>
            </div>
            <div className={styles.compositionGrid}>
              <div className={styles.compositionCard}>
                <strong>
                  {indonesianCountLabel(
                    measures.unbranded.appeared,
                    measures.unbranded.total,
                  )}
                </strong>
                <span>{INDONESIAN_REPORT_LABELS.without_business_name}</span>
                <p className={styles.resultNote}>
                  Bisnis muncul dalam jawaban tanpa nama disebut pada
                  pertanyaan.
                </p>
              </div>
              <div className={styles.compositionCard}>
                <strong>
                  {indonesianCountLabel(
                    measures.branded.appeared,
                    measures.branded.total,
                  )}
                </strong>
                <span>{INDONESIAN_REPORT_LABELS.with_business_name}</span>
                <p className={styles.resultNote}>
                  Bisnis dikenali saat pertanyaan menyebut namanya.
                </p>
              </div>
            </div>
          </div>
          <dl className={styles.dimensionList}>
            <div>
              <dt>Rekomendasi</dt>
              <dd>
                {indonesianMeasureLabel(
                  measures.recommendation.assessed,
                  () =>
                    `Direkomendasikan di ${measures.recommendation.recommended} dari ${measures.recommendation.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Perbandingan</dt>
              <dd>
                {indonesianMeasureLabel(
                  measures.comparison.assessed,
                  () =>
                    `Diunggulkan di ${measures.comparison.clientPreferred} dari ${measures.comparison.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Informasi publik</dt>
              <dd>
                {indonesianMeasureLabel(
                  measures.information.assessed,
                  () =>
                    `${measures.information.confirmed} terkonfirmasi, ${measures.information.incomplete} belum lengkap, ${measures.information.conflicting} bertentangan dari ${measures.information.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
          </dl>
          <div className={styles.executiveTakeaway}>
            <p>Kesimpulan</p>
            <div>
              <p className={styles.conclusion}>{report.conclusion}</p>
              <Badge variant="secondary" className={styles.accuracyChip}>
                Informasi publik: {accuracyLabel}
              </Badge>
            </div>
          </div>
          <div className={styles.snapshotAlert} role="note">
            <strong>Hasil ini dapat berubah</strong>
            <p>
              Laporan ini mencatat sepuluh jawaban model AI pada {runDate}.
              Model, tanggal, lokasi, bahasa, atau percakapan yang berbeda dapat
              menghasilkan jawaban yang berbeda.
            </p>
          </div>
        </section>

        <section className={styles.reportSection} id="fixture-findings">
          <SectionHeading number="02">Temuan</SectionHeading>
          <ol className={styles.findings}>
            {report.key_findings.map((finding, index) => (
              <li key={finding.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.explanation}</p>
                </div>
                <small>
                  Bukti: tes{" "}
                  {testReferences(finding.evidence_prompt_ids, testNumberById)}
                </small>
              </li>
            ))}
          </ol>
          {report.observed_competitors.length ? (
            <div className={styles.otherBusinesses}>
              <h3>Bisnis lain yang disebut</h3>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Bisnis lain</th>
                    <th scope="col">Yang diamati</th>
                    <th scope="col">Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {report.observed_competitors.map((competitor) => (
                    <tr key={competitor.name}>
                      <td>{competitor.name}</td>
                      <td>
                        {competitor.relationship === "client_preferred"
                          ? "Diunggulkan dalam satu perbandingan"
                          : competitor.relationship === "competitor_preferred"
                            ? "Diunggulkan oleh jawaban dalam satu perbandingan"
                            : competitor.relationship ===
                                "compared_no_preference"
                              ? "Dibandingkan tanpa pilihan yang jelas"
                              : "Disebut dalam jawaban yang disimpan"}
                      </td>
                      <td>
                        Tes{" "}
                        {testReferences(
                          competitor.evidence_prompt_ids,
                          testNumberById,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.resultNote}>
                Jumlah ini hanya mencakup sepuluh jawaban yang diuji dan tidak
                menetapkan posisi pasar, kualitas layanan, atau peringkat yang
                stabil.
              </p>
            </div>
          ) : null}
        </section>

        <section className={styles.reportSection} id="fixture-actions">
          <SectionHeading number="03">Yang Dapat Dilakukan</SectionHeading>
          <ol className={styles.priorities}>
            {[...report.priorities]
              .sort((a, b) => a.order - b.order)
              .map((priority) => (
                <li key={`${priority.order}-${priority.action}`}>
                  <div className={styles.priorityTop}>
                    <span className={styles.priorityNumber}>
                      {String(priority.order).padStart(2, "0")}
                    </span>
                    <span className={styles.priorityTiming}>
                      {priority.timing === "do_first"
                        ? "Lakukan lebih dulu"
                        : "Lakukan berikutnya"}
                    </span>
                  </div>
                  <h3>{priority.action}</h3>
                  <dl className={styles.priorityDetails}>
                    <div>
                      <dt>Lakukan</dt>
                      <dd>{priority.action}</dd>
                    </div>
                    <div>
                      <dt>Mengapa</dt>
                      <dd>{priority.why}</dd>
                    </div>
                    <div>
                      <dt>Berdasarkan</dt>
                      <dd>
                        {priority.basis} Tes{" "}
                        {testReferences(
                          priority.evidence_prompt_ids,
                          testNumberById,
                        )}
                        .
                      </dd>
                    </div>
                    <div>
                      <dt>Pemilik</dt>
                      <dd>{ownerLabels[priority.owner] ?? priority.owner}</dd>
                    </div>
                    <div>
                      <dt>Selesai ketika</dt>
                      <dd>{priority.done_when}</dd>
                    </div>
                  </dl>
                  {priority.caveat ? (
                    <p className={styles.caveat}>{priority.caveat}</p>
                  ) : null}
                </li>
              ))}
          </ol>
        </section>

        <section className={styles.reportSection} id="fixture-detail">
          <SectionHeading number="04">Hasil Tes per Pertanyaan</SectionHeading>
          <p className={styles.sectionLead}>
            Sepuluh pertanyaan dalam urutan yang disetujui. Kutipan jawaban
            persis seperti yang disimpan, tanpa diterjemahkan.
          </p>
          <ol className={styles.testList}>
            {report.details.map((detail, index) => {
              const observation = observationById.get(detail.prompt_id);
              const order = index + 1;
              return (
                <li key={detail.prompt_id} className={styles.testRow}>
                  <div className={styles.testRowTitle}>
                    <span className={styles.testNumber}>
                      {String(order).padStart(2, "0")}
                    </span>
                    <span className={styles.testComposition}>
                      {fixtureObservationCompositionLabel(order)}
                    </span>
                    <span className={styles.testStatus}>
                      {fixtureObservationResultLabel(order)}
                    </span>
                  </div>
                  <div className={styles.testRowBody}>
                    <div>
                      <h4>Pertanyaan</h4>
                      <blockquote>{observation?.question}</blockquote>
                    </div>
                    <div>
                      <h4>Kutipan jawaban</h4>
                      <blockquote>
                        {detail.answer_excerpt || "Tidak ada jawaban."}
                      </blockquote>
                    </div>
                    <div>
                      <h4>Artinya</h4>
                      <p className={styles.evidenceNote}>
                        {detail.evidence_note}
                      </p>
                    </div>
                    {detail.source_urls.length ? (
                      <div className={styles.sources}>
                        {detail.source_urls.map((url) => (
                          <a
                            href={url}
                            key={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {sourceHostname(url)} <IconExternalLink />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <small>
                      Diperiksa{" "}
                      {observation
                        ? `${formatDateWib(observation.observed_at)} pukul ${formatTimeWib(observation.observed_at)} WIB`
                        : "pada waktu yang tidak tercatat"}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={styles.reportSection} id="fixture-method">
          <SectionHeading number="05">Cara Audit Ini Bekerja</SectionHeading>
          <div className={styles.methodGrid}>
            <p>
              Nuave menguji sepuluh pertanyaan yang disetujui secara terpisah
              dengan pencarian web pada {runDate} pukul {runWindow} dari{" "}
              {kopiTamanSenjaMethod.location.city},{" "}
              {kopiTamanSenjaMethod.location.country}. Pertanyaan disusun
              melalui {kopiTamanSenjaMethod.questionGeneration.system} dengan
              model {kopiTamanSenjaMethod.questionGeneration.model}. Pengujian
              dijalankan melalui {kopiTamanSenjaMethod.system} dengan model{" "}
              {kopiTamanSenjaMethod.returnedModel} dalam bahasa Indonesia.
              Sepuluh dari sepuluh pertanyaan berhasil diuji dan tidak ada
              percobaan ulang. Versi metode:{" "}
              {kopiTamanSenjaMethod.methodVersion}.
            </p>
            <ul className={styles.methodList}>
              <li>
                Laporan ini menghitung kemunculan yang terlihat dalam jawaban
                yang disimpan. Tautan sumber saja tidak dihitung sebagai
                kemunculan.
              </li>
              <li>
                Ukuran rekomendasi, perbandingan, dan informasi publik hanya
                memakai pertanyaan yang dinilai pada dimensi tersebut. Tanpa
                pertanyaan yang memenuhi syarat, ukuran ditulis Tidak diuji.
              </li>
              <li>
                API yang diuji bukan aplikasi ChatGPT milik pelanggan. Jawaban
                dapat berubah berdasarkan model, waktu, lokasi, dan percakapan.
              </li>
              <li>
                Penyebutan bukan rekomendasi. Laporan ini mencatat apa yang
                terjadi pada pengujian ini dan tidak membuktikan sebab akibat
                atau menjamin rekomendasi di masa depan.
              </li>
            </ul>
          </div>
          <div className={styles.snapshotAlert} role="note">
            <strong>Penting untuk diketahui</strong>
            <p>
              Laporan contoh ini hanya ada di sesi tab ini. Laporan ini tidak
              disimpan di server, tidak dihosting secara privat, dan tidak
              dikirimkan kepada siapa pun. Tutup tab untuk menghapusnya.
            </p>
          </div>
        </section>

        <footer className={styles.reportFooter}>
          <span>{brief.brand_name}</span>
          <span>Nuave · AI Visibility Report (contoh fiktif)</span>
          <span>{new Date().getFullYear()}</span>
        </footer>
      </article>
    </div>
  );
}
