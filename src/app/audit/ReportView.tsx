"use client";

import Image from "next/image";
import { Alert, Button, Chip, Disclosure, Separator } from "@heroui/react";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import type {
  AuditObservation,
  AuditReport,
  BusinessBrief,
  ReportDetail,
} from "@/lib/audit/types";
import {
  indonesianCountLabel,
  indonesianHeadline,
  INDONESIAN_REPORT_LABELS,
} from "@/lib/audit/report-labels";
import styles from "./audit.module.css";

function resultLabel(detail: ReportDetail) {
  if (detail.run === "failed") return "Belum berhasil diuji";
  if (detail.appearance === "absent") return "Tidak disebut";
  if (detail.comparison === "client_preferred")
    return "Diunggulkan dalam perbandingan ini";
  if (detail.comparison === "competitor_preferred")
    return "Bisnis lain diunggulkan";
  if (detail.comparison === "compared_no_preference")
    return "Dibandingkan tanpa pilihan unggulan";
  if (detail.recommendation === "recommended") return "Direkomendasikan";
  if (detail.information === "conflicting") return "Informasi bertentangan";
  if (detail.information === "incomplete") return "Informasi belum lengkap";
  if (detail.recommendation === "not_assessed")
    return "Disebut, tanpa penilaian rekomendasi";
  return "Disebut, tidak direkomendasikan";
}

const reportCategoryLabels: Record<string, string> = {
  need_discovery: "Kebutuhan pelanggan",
  solution_discovery: "Pilihan layanan",
  comparison: "Perbandingan",
  validation: "Fakta bisnis",
  action: "Langkah berikutnya",
};

const ownerLabels: Record<string, string> = {
  business_owner: "Pemilik bisnis",
  admin: "Admin",
  marketing: "Pemasaran",
  web_developer: "Pengembang web",
};

function testReferences(ids: string[], testNumberById: Map<string, string>) {
  return ids.map((id) => testNumberById.get(id) ?? id).join(", ");
}

/**
 * Eligible-denominator measure label (AC-17): an empty assessed denominator
 * renders "Tidak diuji", never a zero performance claim (R-28).
 */
function measureLabel(
  assessed: number,
  ready: (assessed: number) => string,
): string {
  if (assessed === 0) return INDONESIAN_REPORT_LABELS.not_tested;
  return ready(assessed);
}

function sourceTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function DetailContent({
  detail,
  observation,
}: {
  detail: ReportDetail;
  observation?: AuditObservation;
}) {
  return (
    <div className={styles.detailContent}>
      <div>
        <h4>Yang terjadi</h4>
        <p>{detail.finding}</p>
      </div>
      <div>
        <h4>Pertanyaan</h4>
        <blockquote>{observation?.question}</blockquote>
      </div>
      <div>
        <h4>Jawaban AI</h4>
        <blockquote>
          {detail.answer_excerpt || "Tidak ada jawaban yang tersedia."}
        </blockquote>
      </div>
      <div>
        <h4>Artinya</h4>
        <p className={styles.evidenceNote}>{detail.evidence_note}</p>
      </div>
      {detail.source_urls.length ? (
        <div className={styles.sources}>
          {detail.source_urls.map((url) => (
            <a href={url} key={url} target="_blank" rel="noreferrer">
              {sourceTitle(url)} <IconExternalLink />
            </a>
          ))}
        </div>
      ) : null}
      <small>
        Diperiksa{" "}
        {observation
          ? new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(observation.observed_at))
          : "pada waktu yang tidak diketahui"}
      </small>
    </div>
  );
}

function SectionHeading({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span aria-hidden="true">{number}</span>
      <h2>{children}</h2>
    </div>
  );
}

export default function ReportView({
  report,
  brief,
  observations,
  onDownloadJson,
  previewNotice,
}: {
  report: AuditReport;
  brief: BusinessBrief;
  observations: AuditObservation[];
  onDownloadJson: () => void;
  /**
   * Optional fixture-preview disclosure rendered inside the report article so
   * it appears on screen and in printed output. The live workflow never
   * passes this prop.
   */
  previewNotice?: React.ReactNode;
}) {
  const observationById = new Map(
    observations.map((item) => [item.prompt_id, item]),
  );
  const testNumberById = new Map(
    observations.map((item, index) => [
      item.prompt_id,
      String(index + 1).padStart(2, "0"),
    ]),
  );
  const accuracyLabel =
    report.accuracy_status === "no_clear_issues"
      ? "Tidak ada masalah yang jelas"
      : report.accuracy_status === "needs_confirmation"
        ? "Perlu dikonfirmasi"
        : report.accuracy_status === "needs_correction"
          ? "Perlu diperbaiki"
          : "Tidak dapat dinilai";

  return (
    <div className={styles.reportWrap}>
      <div className={`${styles.reportToolbar} ${styles.noPrint}`}>
        <Button variant="primary" size="sm" onPress={() => window.print()}>
          <IconDownload /> {INDONESIAN_REPORT_LABELS.download_pdf}
        </Button>
        <Button variant="ghost" size="sm" onPress={onDownloadJson}>
          <IconDownload /> Unduh bukti JSON
        </Button>
      </div>
      <article className={styles.report}>
        {previewNotice ? previewNotice : null}
        <header className={styles.reportHero} id="stage-5" tabIndex={-1}>
          <div className={styles.reportTitleBlock}>
            <p className={styles.reportEyebrow}>Laporan visibilitas AI</p>
            <h1>{brief.brand_name}</h1>
            <p className={styles.reportSubtitle}>
              {brief.entity_scope} · {brief.market_context}
            </p>
          </div>
          <div className={styles.reportBrand}>
            {brief.agency_logo_data_url ? (
              <Image
                src={brief.agency_logo_data_url}
                width={96}
                height={54}
                unoptimized
                alt="Agency logo"
              />
            ) : null}
            <div>
              <small>Dibuat oleh</small>
              <strong>{brief.agency_name || "Nuave"}</strong>
            </div>
          </div>
          <Separator className={styles.heroRule} />
          <dl className={styles.scopeGrid}>
            <div>
              <dt>Tanggal audit</dt>
              <dd>
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(report.generated_at))}
              </dd>
            </div>
            <div>
              <dt>Pertanyaan yang diperiksa</dt>
              <dd>{observations.length} pertanyaan independen</dd>
            </div>
          </dl>
          <nav className={styles.reportContents} aria-label="Report contents">
            <span>Isi laporan</span>
            <ol>
              <li>
                <a href="#summary">Hasil utama</a>
              </li>
              <li>
                <a href="#findings">Temuan utama</a>
              </li>
              <li>
                <a href="#priorities">Langkah berikutnya</a>
              </li>
              <li>
                <a href="#detail">Hasil tiap pertanyaan</a>
              </li>
              <li>
                <a href="#method">Cara kerja audit</a>
              </li>
            </ol>
          </nav>
        </header>

        <section className={styles.reportSection} id="summary">
          <SectionHeading number="01">Hasil utama</SectionHeading>
          <div className={styles.resultGrid}>
            <div className={styles.mainResult}>
              <strong>
                {indonesianCountLabel(
                  report.measures.overall.appeared,
                  report.measures.overall.total,
                )}
              </strong>
              <span>
                {indonesianHeadline(report.measures.overall.appeared)}
              </span>
            </div>
            <div>
              <strong>
                {indonesianCountLabel(
                  report.measures.unbranded.appeared,
                  report.measures.unbranded.total,
                )}
              </strong>
              <span>{INDONESIAN_REPORT_LABELS.without_business_name}</span>
            </div>
            <div>
              <strong>
                {indonesianCountLabel(
                  report.measures.branded.appeared,
                  report.measures.branded.total,
                )}
              </strong>
              <span>{INDONESIAN_REPORT_LABELS.with_business_name}</span>
            </div>
            <div>
              <strong>{report.counts.failed}</strong>
              <span>{report.facts.coverage.label}</span>
            </div>
          </div>
          <dl className={styles.dimensionList}>
            <div>
              <dt>Rekomendasi</dt>
              <dd>
                {measureLabel(
                  report.measures.recommendation.assessed,
                  () =>
                    `Direkomendasikan di ${report.measures.recommendation.recommended} dari ${report.measures.recommendation.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Perbandingan</dt>
              <dd>
                {measureLabel(
                  report.measures.comparison.assessed,
                  () =>
                    `Diunggulkan di ${report.measures.comparison.client_preferred} dari ${report.measures.comparison.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Informasi publik</dt>
              <dd>
                {measureLabel(
                  report.measures.information.assessed,
                  () =>
                    `${report.measures.information.confirmed} terkonfirmasi, ${report.measures.information.incomplete} belum lengkap, ${report.measures.information.conflicting} bertentangan dari ${report.measures.information.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
          </dl>
          <div className={styles.executiveTakeaway}>
            <p>Artinya</p>
            <div>
              <p className={styles.conclusion}>{report.conclusion}</p>
              <Chip
                color={
                  report.accuracy_status === "no_clear_issues"
                    ? "success"
                    : "warning"
                }
                variant="soft"
              >
                Informasi publik: {accuracyLabel}
              </Chip>
            </div>
          </div>
          <Alert
            status="warning"
            className={`${styles.snapshotAlert} ${styles.editorialAlert}`}
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Hasil ini dapat berubah</Alert.Title>
              <Alert.Description>
                Laporan ini menunjukkan sepuluh jawaban AI pada tanggal di atas.
                Model, tanggal, lokasi, atau percakapan berbeda dapat memberi
                jawaban berbeda.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <section className={styles.reportSection} id="findings">
          <SectionHeading number="02">Temuan utama</SectionHeading>
          <ol className={styles.findings}>
            {report.key_findings.map((finding, index) => (
              <li key={finding.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.explanation}</p>
                </div>
                <small>
                  Berdasarkan pertanyaan:{" "}
                  {testReferences(finding.evidence_prompt_ids, testNumberById)}
                </small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.reportSection} id="priorities">
          <SectionHeading number="03">Langkah berikutnya</SectionHeading>
          <ol className={styles.priorities}>
            {[...report.priorities]
              .sort((a, b) => a.order - b.order)
              .map((priority) => (
                <li
                  key={`${priority.order}-${priority.action}`}
                  className={styles.priorityItem}
                >
                  <div className={styles.priorityTop}>
                    <span className={styles.priorityNumber}>
                      {String(priority.order).padStart(2, "0")}
                    </span>
                    <Chip
                      color={
                        priority.timing === "do_first" ? "accent" : "default"
                      }
                      variant="soft"
                    >
                      {priority.timing === "do_first"
                        ? "Kerjakan dulu"
                        : "Kerjakan berikutnya"}
                    </Chip>
                  </div>
                  <h3>{priority.action}</h3>
                  <dl>
                    <div>
                      <dt>Mengapa</dt>
                      <dd>{priority.why}</dd>
                    </div>
                    <div>
                      <dt>Berdasarkan</dt>
                      <dd>
                        {priority.basis} Pertanyaan{" "}
                        {testReferences(
                          priority.evidence_prompt_ids,
                          testNumberById,
                        )}
                        .
                      </dd>
                    </div>
                    <div>
                      <dt>Penanggung jawab</dt>
                      <dd>{ownerLabels[priority.owner]}</dd>
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

        <section className={styles.reportSection} id="detail">
          <SectionHeading number="04">Hasil tiap pertanyaan</SectionHeading>
          <p className={styles.sectionLead}>
            Buka satu pertanyaan untuk melihat pertanyaan, kutipan jawaban,
            sumber, dan waktu pemeriksaan.
          </p>
          <div className={`${styles.detailsScreen} ${styles.noPrint}`}>
            {report.details.map((detail, index) => {
              const observation = observationById.get(detail.prompt_id);
              return (
                <Disclosure
                  key={detail.prompt_id}
                  className={styles.detailDisclosure}
                >
                  <Disclosure.Heading>
                    <Disclosure.Trigger>
                      <span className={styles.detailIndex}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.detailTitle}>
                        <small>
                          {observation
                            ? reportCategoryLabels[observation.category]
                            : "Pertanyaan"}
                        </small>
                        <strong>{resultLabel(detail)}</strong>
                      </span>
                      <code>{detail.prompt_id}</code>
                      <Disclosure.Indicator />
                    </Disclosure.Trigger>
                  </Disclosure.Heading>
                  <Disclosure.Content>
                    <Disclosure.Body>
                      <DetailContent
                        detail={detail}
                        observation={observation}
                      />
                    </Disclosure.Body>
                  </Disclosure.Content>
                </Disclosure>
              );
            })}
          </div>
          <div className={styles.detailsPrint} aria-hidden="true">
            {report.details.map((detail, index) => {
              const observation = observationById.get(detail.prompt_id);
              return (
                <section key={detail.prompt_id} className={styles.printDetail}>
                  <div className={styles.printDetailTitle}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <small>
                        {observation
                          ? reportCategoryLabels[observation.category]
                          : "Pertanyaan"}
                      </small>
                      <h3>{resultLabel(detail)}</h3>
                    </div>
                    <code>{detail.prompt_id}</code>
                  </div>
                  <DetailContent detail={detail} observation={observation} />
                </section>
              );
            })}
          </div>
        </section>

        <section className={styles.reportSection} id="method">
          <SectionHeading number="05">Cara kerja audit</SectionHeading>
          <div className={styles.methodGrid}>
            <p>{report.method_summary}</p>
            <ul className={styles.methodList}>
              <li>
                Ekspor bukti menyimpan setiap pertanyaan, jawaban lengkap,
                sumber, waktu, model, dan hasil.
              </li>
              <li>
                API ini bukan aplikasi ChatGPT konsumen. Jawaban dapat berubah
                menurut model, waktu, lokasi, dan percakapan.
              </li>
              <li>
                Disebut bukan berarti direkomendasikan. Pertanyaan yang gagal
                diuji bukan hasil negatif.
              </li>
              <li>
                Laporan ini menunjukkan hasil pengujian ini. Laporan ini tidak
                membuktikan sebab atau menjamin rekomendasi di masa depan.
              </li>
            </ul>
          </div>
          <Alert status="accent" className={styles.editorialAlert}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                Gunakan laporan ini untuk memilih satu langkah
              </Alert.Title>
              <Alert.Description>
                Periksa informasi publik terlebih dahulu. Buat satu perubahan
                yang berguna, lalu ulangi pengujian yang sama.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <footer className={styles.reportFooter}>
          <span>{brief.brand_name}</span>
          <span>Audit visibilitas AI Nuave</span>
          <span>
            {new Intl.DateTimeFormat("id-ID", { year: "numeric" }).format(
              new Date(report.generated_at),
            )}
          </span>
        </footer>
      </article>
    </div>
  );
}
