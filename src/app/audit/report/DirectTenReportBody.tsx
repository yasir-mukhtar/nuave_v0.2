import { buildReportPresentation } from "@/lib/audit/report-presentation";
import type { AuditObservation, AuditReport } from "@/lib/audit/types";
import { ReportSectionHeading } from "@/components/product/ReportToolbar";
import { ReportAnswer, observationTime } from "./ReportAnswer";
import { ReportReferences } from "./ReportReferences";
import styles from "./report-body.module.css";

const owners = {
  business_owner: "Pemilik bisnis",
  admin: "Admin",
  marketing: "Pemasaran",
  web_developer: "Pengembang web",
};
const relationships = {
  client_preferred: "Brand Anda diunggulkan",
  competitor_preferred: "Bisnis lain diunggulkan",
  compared_no_preference: "Dibandingkan tanpa pilihan unggulan",
  mentioned: "Disebut dalam jawaban",
};

export function DirectTenReportBody({
  report,
  observations,
}: {
  report: AuditReport;
  observations: AuditObservation[];
}) {
  const presentation = buildReportPresentation(report, observations);
  if (presentation.status !== "ready")
    return (
      <div className={styles.body} role="alert">
        <h2 className="type-heading-md">Bukti laporan tidak tersedia</h2>
        <p>
          Data pertanyaan, jawaban, dan laporan tersimpan tidak cocok atau tidak
          lengkap. Laporan ini belum dapat ditampilkan dengan benar.
        </p>
        <p>
          Data tersimpan tetap dipertahankan. Tidak ada pengujian atau pembuatan
          laporan ulang secara otomatis.
        </p>
      </div>
    );
  const { answers, references, measures } = presentation;
  return (
    <div className={styles.body} data-direct-ten-report>
      <section className={styles.section} id="summary">
        <ReportSectionHeading number="01" className={styles.sectionHeading}>
          Hasil singkat
        </ReportSectionHeading>
        <p className={styles.count}>
          Bisnis Anda muncul di {measures.overall.appeared} dari{" "}
          {measures.overall.total} pertanyaan
        </p>
        <p className={styles.count}>
          Bisnis Anda direkomendasikan di {measures.recommendation.recommended}{" "}
          dari {measures.recommendation.assessed} pertanyaan
        </p>
        <p className={styles.supporting}>
          {answers.length} dari {measures.overall.total} pertanyaan berhasil
          diuji
        </p>
        <p>{report.conclusion}</p>
        <p className={styles.supporting}>
          Hasil ini terbatas pada sepuluh pertanyaan yang disetujui dan jawaban
          pada waktu pengamatan masing-masing. Model, waktu, lokasi, atau
          percakapan berbeda dapat memberi jawaban berbeda. Disebut bukan
          berarti direkomendasikan.
        </p>
      </section>
      <section className={styles.section} id="detail">
        <ReportSectionHeading number="02" className={styles.sectionHeading}>
          Jawaban model AI
        </ReportSectionHeading>
        <p className={styles.supporting}>
          Pertanyaan dan jawaban lengkap ditampilkan sesuai urutan pengujian.
          Teks jawaban adalah bukti yang diamati, bukan pendapat Nuave.
        </p>
        {answers.map((answer) => (
          <ReportAnswer key={answer.id} answer={answer} />
        ))}
      </section>
      <section className={styles.section} id="findings">
        <ReportSectionHeading number="03" className={styles.sectionHeading}>
          Analisis Nuave
        </ReportSectionHeading>
        <ol className={styles.items}>
          {report.key_findings.map((finding, i) => (
            <li key={i}>
              <h3>{finding.title}</h3>
              <p>{finding.explanation}</p>
              <ReportReferences
                ids={finding.evidence_prompt_ids}
                references={references}
              />
            </li>
          ))}
        </ol>
        {report.observed_competitors.length > 0 && (
          <div className={styles.comparators}>
            <h3>Bisnis lain yang disebut</h3>
            <p className={styles.supporting}>
              Daftar ini terbatas pada catatan terstruktur yang tersimpan, bukan
              seluruh nama dalam jawaban.
            </p>
            {report.observed_competitors.map((competitor, i) => (
              <div key={i}>
                <p>
                  <strong>{competitor.name}</strong> —{" "}
                  {relationships[competitor.relationship]}
                </p>
                <ReportReferences
                  ids={competitor.evidence_prompt_ids}
                  references={references}
                />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className={styles.section} id="priorities">
        <ReportSectionHeading number="04" className={styles.sectionHeading}>
          Yang dapat dilakukan
        </ReportSectionHeading>
        <ol className={styles.items}>
          {[...report.priorities]
            .sort((a, b) => a.order - b.order)
            .map((priority, i) => (
              <li key={i} value={priority.order}>
                <p className={styles.eyebrow}>
                  {priority.timing === "do_first"
                    ? "Kerjakan dulu"
                    : "Kerjakan berikutnya"}
                </p>
                <h3>{priority.action}</h3>
                <dl className={styles.actionDetails}>
                  <div>
                    <dt>Mengapa</dt>
                    <dd>{priority.why}</dd>
                  </div>
                  <div>
                    <dt>Berdasarkan</dt>
                    <dd>{priority.basis}</dd>
                  </div>
                  <div>
                    <dt>Penanggung jawab yang disarankan</dt>
                    <dd>{owners[priority.owner]}</dd>
                  </div>
                  <div>
                    <dt>Selesai ketika</dt>
                    <dd>{priority.done_when}</dd>
                  </div>
                </dl>
                {priority.caveat && (
                  <p className={styles.supporting}>{priority.caveat}</p>
                )}
                <ReportReferences
                  ids={priority.evidence_prompt_ids}
                  references={references}
                />
              </li>
            ))}
        </ol>
      </section>
      <section className={styles.section} id="method">
        <ReportSectionHeading number="05" className={styles.sectionHeading}>
          Tentang audit ini
        </ReportSectionHeading>
        <p>{report.method_summary}</p>
        <p className={styles.supporting}>
          Laporan dibuat:{" "}
          <time dateTime={report.generated_at}>
            {observationTime(report.generated_at)}
          </time>
          . Waktu dan model setiap pengamatan tercantum bersama jawabannya.
        </p>
        <ul className={styles.method}>
          <li>
            Ekspor bukti menyimpan pertanyaan, jawaban lengkap, sumber, waktu,
            model, dan hasil dari laporan yang sama.
          </li>
          <li>
            Jawaban dari API tidak mewakili seluruh aplikasi atau percakapan
            model AI.
          </li>
          <li>
            Laporan ini tidak membuktikan penyebab hasil, kualitas layanan
            bisnis, atau menjamin rekomendasi pada masa depan.
          </li>
        </ul>
      </section>
    </div>
  );
}
