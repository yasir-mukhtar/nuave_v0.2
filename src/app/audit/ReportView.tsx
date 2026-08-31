"use client";

import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IconExternalLink } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import {
  ReportSectionHeading,
  ReportToolbar,
} from "@/components/product/ReportToolbar";
import type {
  AuditObservation,
  AuditReport,
  BusinessBrief,
  ReportDetail,
} from "@/lib/audit/types";
import {
  indonesianCountLabel,
  indonesianHeadline,
  indonesianMeasureLabel,
  INDONESIAN_REPORT_LABELS,
} from "@/lib/audit/report-labels";
import { measurementSlotForPromptId } from "@/lib/audit/measurement-matrix";
import styles from "./audit.module.css";

function measurementLabel(promptId: string) {
  return (
    measurementSlotForPromptId(promptId)?.customerFacingLabel ?? "Pertanyaan"
  );
}

function resultLabel(detail: ReportDetail) {
  if (detail.run === "failed") return "Belum berhasil diuji";
  if (detail.appearance === "absent") return "Tidak disebut";
  const assessmentClass = measurementSlotForPromptId(
    detail.prompt_id,
  )?.reportAssessmentClass;
  switch (assessmentClass) {
    case "comparison":
      if (detail.comparison === "client_preferred")
        return "Diunggulkan dalam perbandingan ini";
      if (detail.comparison === "competitor_preferred")
        return "Bisnis lain diunggulkan";
      if (detail.comparison === "compared_no_preference")
        return "Dibandingkan tanpa pilihan unggulan";
      return "Disebut, tanpa penilaian perbandingan";
    case "information":
      if (detail.information === "conflicting") return "Informasi bertentangan";
      if (detail.information === "incomplete") return "Informasi belum lengkap";
      if (detail.information === "confirmed") return "Informasi terkonfirmasi";
      return "Disebut, tanpa penilaian informasi";
    case "recommendation":
      if (detail.recommendation === "recommended") return "Direkomendasikan";
      if (detail.recommendation === "not_recommended")
        return "Disebut, tidak direkomendasikan";
      return "Disebut, tanpa penilaian rekomendasi";
    case "none":
      return "Disebut";
    default:
      return "Hasil belum memiliki jalur penilaian";
  }
}

const ownerLabels: Record<string, string> = {
  business_owner: "Pemilik bisnis",
  admin: "Admin",
  marketing: "Pemasaran",
  web_developer: "Pengembang web",
};

const competitorRelationshipLabels: Record<string, string> = {
  client_preferred: "Bisnis Anda diunggulkan",
  competitor_preferred: "Bisnis lain diunggulkan",
  compared_no_preference: "Dibandingkan tanpa pilihan unggulan",
  mentioned: "Disebut dalam jawaban",
};

function testReferences(ids: string[], testNumberById: Map<string, string>) {
  return ids.map((id) => testNumberById.get(id) ?? id).join(", ");
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
        <h4>Yang ditemukan</h4>
        <p>{detail.finding}</p>
      </div>
      <div>
        <h4>Pertanyaan</h4>
        <blockquote>{observation?.question}</blockquote>
      </div>
      <div>
        <h4>Kutipan jawaban</h4>
        <blockquote>
          {detail.answer_excerpt || "Tidak ada jawaban yang tersedia."}
        </blockquote>
      </div>
      <div>
        <h4>Artinya bagi Anda</h4>
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
    <ReportSectionHeading number={number} className={styles.sectionHeading}>
      {children}
    </ReportSectionHeading>
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
  previewNotice?: React.ReactNode;
}) {
  const observationById = new Map(
    observations.map((item) => [item.prompt_id, item]),
  );
  const detailById = new Map(
    report.details.map((item) => [item.prompt_id, item]),
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
      <ReportToolbar
        className={`${styles.reportToolbar} ${styles.noPrint}`}
        onDownloadPdf={() => window.print()}
        onDownloadJson={onDownloadJson}
      />
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
              <strong>
                {report.measures.overall.total - report.counts.failed}
              </strong>
              <span>
                dari {report.measures.overall.total} pertanyaan berhasil diuji
              </span>
            </div>
          </div>
          <dl className={styles.dimensionList}>
            <div>
              <dt>Rekomendasi</dt>
              <dd>
                {indonesianMeasureLabel(
                  report.measures.recommendation.assessed,
                  () =>
                    `Direkomendasikan di ${report.measures.recommendation.recommended} dari ${report.measures.recommendation.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Perbandingan</dt>
              <dd>
                {indonesianMeasureLabel(
                  report.measures.comparison.assessed,
                  () =>
                    `Diunggulkan di ${report.measures.comparison.client_preferred} dari ${report.measures.comparison.assessed} pertanyaan yang dinilai`,
                )}
              </dd>
            </div>
            <div>
              <dt>Informasi publik</dt>
              <dd>
                {indonesianMeasureLabel(
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
              <Badge
                variant={
                  report.accuracy_status === "no_clear_issues"
                    ? "default"
                    : "secondary"
                }
                className={
                  report.accuracy_status === "no_clear_issues"
                    ? "border-[var(--green)] bg-[var(--green-light)] text-[var(--green)]"
                    : "border-[var(--amber)] bg-[var(--amber-light)] text-[var(--amber)]"
                }
              >
                Informasi publik: {accuracyLabel}
              </Badge>
            </div>
          </div>
          {report.observed_competitors.length ? (
            <div className={styles.executiveTakeaway}>
              <p>Bisnis lain yang teramati</p>
              <div>
                {report.observed_competitors.map((competitor) => (
                  <p
                    key={`${competitor.name}-${competitor.evidence_prompt_ids.join("-")}`}
                  >
                    <strong>{competitor.name}</strong> —{" "}
                    {competitorRelationshipLabels[competitor.relationship]}.
                    Berdasarkan pertanyaan{" "}
                    {testReferences(
                      competitor.evidence_prompt_ids,
                      testNumberById,
                    )}
                    .
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <AuditNotice
            tone="warning"
            title="Hasil ini dapat berubah"
            className={`${styles.snapshotAlert} ${styles.editorialAlert}`}
          >
            Laporan ini menunjukkan sepuluh jawaban AI pada tanggal di atas.
            Model, tanggal, lokasi, atau percakapan berbeda dapat memberi
            jawaban berbeda.
          </AuditNotice>
        </section>

        <section className={styles.reportSection} id="findings">
          <SectionHeading number="02">Temuan utama</SectionHeading>
          <ol className={styles.findings}>
            {report.key_findings.map((finding, index) => {
              const evidence = finding.evidence_prompt_ids
                .map((id) => detailById.get(id))
                .find((detail) => Boolean(detail?.answer_excerpt));
              const action = report.priorities.find((priority) =>
                priority.evidence_prompt_ids.some((id) =>
                  finding.evidence_prompt_ids.includes(id),
                ),
              );
              return (
                <li key={finding.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{finding.title}</h3>
                    {evidence ? (
                      <>
                        <h4>Yang ditemukan</h4>
                        <blockquote>{evidence.answer_excerpt}</blockquote>
                      </>
                    ) : null}
                    <h4>Artinya bagi Anda</h4>
                    <p>{finding.explanation}</p>
                    {action ? (
                      <>
                        <h4>Yang dapat dilakukan</h4>
                        <p>{action.action}</p>
                      </>
                    ) : null}
                  </div>
                  <small>
                    Berdasarkan pertanyaan:{" "}
                    {testReferences(
                      finding.evidence_prompt_ids,
                      testNumberById,
                    )}
                  </small>
                </li>
              );
            })}
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
                    <Badge
                      variant={
                        priority.timing === "do_first" ? "default" : "secondary"
                      }
                    >
                      {priority.timing === "do_first"
                        ? "Kerjakan dulu"
                        : "Kerjakan berikutnya"}
                    </Badge>
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
                <Accordion
                  key={detail.prompt_id}
                  className={styles.detailDisclosure}
                >
                  <AccordionItem value={detail.prompt_id} className="border-0">
                    <AccordionTrigger className={styles.detailTrigger}>
                      <span className={styles.detailIndex}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.detailTitle}>
                        <small>
                          {observation
                            ? measurementLabel(observation.prompt_id)
                            : "Pertanyaan"}
                        </small>
                        <strong>{resultLabel(detail)}</strong>
                      </span>
                      <code>{detail.prompt_id}</code>
                    </AccordionTrigger>
                    <AccordionContent className={styles.detailBody}>
                      <DetailContent
                        detail={detail}
                        observation={observation}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                          ? measurementLabel(observation.prompt_id)
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
          <AuditNotice
            tone="info"
            title="Gunakan laporan ini untuk memilih satu langkah"
            className={styles.editorialAlert}
          >
            Periksa informasi publik terlebih dahulu. Buat satu perubahan yang
            berguna, lalu ulangi pengujian yang sama.
          </AuditNotice>
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
