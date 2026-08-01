"use client";

import Image from "next/image";
import { Alert, Chip, Disclosure, Separator } from "@heroui/react";
import { IconExternalLink } from "@tabler/icons-react";
import type {
  AuditObservation,
  AuditReport,
  BusinessBrief,
  ReportDetail,
} from "@/lib/audit/types";
import { categoryLabels } from "./AuditStages";
import styles from "./audit.module.css";

const statusLabels: Record<string, string> = {
  appeared_as_recommendation: "Muncul sebagai rekomendasi",
  mentioned_not_recommended: "Disebut, tetapi tidak direkomendasikan",
  did_not_appear: "Tidak muncul",
  incomplete_information: "Informasi tidak lengkap",
  conflicting_information: "Informasi bertentangan",
  could_not_be_tested: "Tidak dapat diuji",
};

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
        <h4>Temuan</h4>
        <p>{detail.finding}</p>
      </div>
      <div>
        <h4>Pertanyaan yang diuji</h4>
        <blockquote>{observation?.question}</blockquote>
      </div>
      <div>
        <h4>Jawaban API — kutipan relevan</h4>
        <blockquote>
          {detail.answer_excerpt || "Tidak ada jawaban yang dapat dikutip."}
        </blockquote>
      </div>
      <p className={styles.evidenceNote}>{detail.evidence_note}</p>
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
        {observation
          ? new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(observation.observed_at))
          : "Waktu observasi tidak tersedia"}
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
}: {
  report: AuditReport;
  brief: BusinessBrief;
  observations: AuditObservation[];
}) {
  const observationById = new Map(
    observations.map((item) => [item.prompt_id, item]),
  );
  const accuracyLabel =
    report.accuracy_status === "baik"
      ? "Baik"
      : report.accuracy_status === "perlu_diperbaiki"
        ? "Perlu diperbaiki"
        : "Tidak dapat dinilai";

  return (
    <div className={styles.reportWrap}>
      <article className={styles.report}>
        <header className={styles.reportHero} id="stage-5" tabIndex={-1}>
          <div className={styles.reportTitleBlock}>
            <p className={styles.reportEyebrow}>Laporan Audit Visibilitas AI</p>
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
                alt="Logo agency"
              />
            ) : null}
            <div>
              <small>Disiapkan oleh</small>
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
              <dt>Sistem diuji</dt>
              <dd>{report.system_label}</dd>
            </div>
          </dl>
          <nav className={styles.reportContents} aria-label="Isi laporan">
            <span>Isi laporan</span>
            <ol>
              <li>
                <a href="#summary">Ringkasan audit</a>
              </li>
              <li>
                <a href="#findings">Temuan utama</a>
              </li>
              <li>
                <a href="#priorities">Prioritas perbaikan</a>
              </li>
              <li>
                <a href="#detail">Temuan detail</a>
              </li>
              <li>
                <a href="#method">Metode &amp; batasan</a>
              </li>
            </ol>
          </nav>
        </header>

        <section className={styles.reportSection} id="summary">
          <SectionHeading number="01">Ringkasan Audit</SectionHeading>
          <div className={styles.resultGrid}>
            <div className={styles.mainResult}>
              <strong>{report.counts.unbranded_recommended}</strong>
              <span>
                dari {report.counts.unbranded_total} pertanyaan tanpa brand
                menghasilkan rekomendasi
              </span>
            </div>
            <div>
              <strong>{report.counts.unbranded_mentioned}</strong>
              <span>disebut tanpa direkomendasikan</span>
            </div>
            <div>
              <strong>
                {report.counts.branded_recognized}/{report.counts.branded_total}
              </strong>
              <span>pertanyaan branded dikenali</span>
            </div>
            <div>
              <strong>{report.counts.failed}</strong>
              <span>pengujian gagal</span>
            </div>
          </div>
          <div className={styles.executiveTakeaway}>
            <p>Kesimpulan eksekutif</p>
            <div>
              <p className={styles.conclusion}>{report.conclusion}</p>
              <Chip
                color={
                  report.accuracy_status === "baik" ? "success" : "warning"
                }
                variant="soft"
              >
                Ketepatan informasi: {accuracyLabel}
              </Chip>
            </div>
          </div>
          <Alert
            status="warning"
            className={`${styles.snapshotAlert} ${styles.editorialAlert}`}
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Snapshot, bukan peringkat permanen</Alert.Title>
              <Alert.Description>
                Hasil menggambarkan sepuluh pengujian pada waktu yang tercantum
                dan bukan representasi setiap kemungkinan respons ChatGPT.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <section className={styles.reportSection} id="findings">
          <SectionHeading number="02">Temuan Utama</SectionHeading>
          <ol className={styles.findings}>
            {report.key_findings.map((finding, index) => (
              <li key={finding.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.explanation}</p>
                </div>
                <small>Dasar: {finding.evidence_prompt_ids.join(", ")}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.reportSection} id="priorities">
          <SectionHeading number="03">Prioritas Perbaikan</SectionHeading>
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
                        priority.timing === "kerjakan_lebih_dulu"
                          ? "accent"
                          : "default"
                      }
                      variant="soft"
                    >
                      {priority.timing === "kerjakan_lebih_dulu"
                        ? "Kerjakan lebih dulu"
                        : "Kerjakan berikutnya"}
                    </Chip>
                  </div>
                  <h3>{priority.action}</h3>
                  <dl>
                    <div>
                      <dt>Mengapa penting</dt>
                      <dd>{priority.why}</dd>
                    </div>
                    <div>
                      <dt>Dasar rekomendasi</dt>
                      <dd>
                        {priority.basis} (
                        {priority.evidence_prompt_ids.join(", ")})
                      </dd>
                    </div>
                    <div>
                      <dt>Penanggung jawab</dt>
                      <dd>{priority.owner.replaceAll("_", " ")}</dd>
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
          <SectionHeading number="04">Temuan Detail</SectionHeading>
          <p className={styles.sectionLead}>
            Buka setiap temuan untuk melihat pertanyaan, kutipan jawaban,
            sumber, dan waktu observasi.
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
                            ? categoryLabels[observation.category]
                            : "Pengujian"}
                        </small>
                        <strong>{statusLabels[detail.status]}</strong>
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
                          ? categoryLabels[observation.category]
                          : "Pengujian"}
                      </small>
                      <h3>{statusLabels[detail.status]}</h3>
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
          <SectionHeading number="05">Metode dan Batasan</SectionHeading>
          <div className={styles.methodGrid}>
            <p>{report.methodology_note}</p>
            <ul className={styles.methodList}>
              <li>
                Sepuluh pertanyaan diuji secara independen melalui OpenAI
                Responses API dengan live web search.
              </li>
              <li>
                Lima pertanyaan tidak menyebut brand dan lima menguji pengenalan
                serta informasi brand.
              </li>
              <li>
                Ekspor bukti menyimpan pertanyaan, jawaban mentah, waktu, model
                yang dikembalikan, status, dan sumber.
              </li>
              <li>
                Pengujian API bukan reproduksi persis pengalaman ChatGPT
                konsumen; hasil dapat berubah karena model, waktu, lokasi,
                personalisasi, dan konteks.
              </li>
              <li>
                Rekomendasi laporan tidak menjamin perubahan akan membuat brand
                direkomendasikan.
              </li>
            </ul>
          </div>
          <Alert status="accent" className={styles.editorialAlert}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Cara menggunakan laporan</Alert.Title>
              <Alert.Description>
                Gunakan temuan untuk memprioritaskan perbaikan, verifikasi
                kembali informasi bisnis, lalu ulangi pengujian setelah
                perubahan penting.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <footer className={styles.reportFooter}>
          <span>{brief.brand_name}</span>
          <span>Nuave AI Visibility Audit</span>
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
