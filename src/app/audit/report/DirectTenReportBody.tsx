import {
  IconCircleCheck,
  IconClock,
  IconInfoCircle,
} from "@tabler/icons-react";
import { buildReportPresentation } from "@/lib/audit/report-presentation";
import type { AuditObservation, AuditReport } from "@/lib/audit/types";
import { ReportSectionHeading } from "@/components/product/ReportToolbar";
import {
  TenBeads,
  questionList,
  type BeadMark,
} from "@/components/product/report/TenBeads";
import { ReportAnswer, observationTime } from "./ReportAnswer";
import { ReportReferences } from "./ReportReferences";
import { TwoSourceReportBody } from "./TwoSourceReport";
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
  names = [],
}: {
  report: AuditReport;
  observations: AuditObservation[];
  /** The business's name and other names, marked inside the answers. */
  names?: readonly string[];
}) {
  // Spec 021: two-source reports use the new layout.
  if (report.two_source)
    return (
      <TwoSourceReportBody
        report={report}
        observations={observations}
        names={names}
      />
    );
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
  // One bead per question, in the order they were asked.
  const beads = (held: (answer: (typeof answers)[number]) => boolean) =>
    Array.from({ length: measures.overall.total }, (_, index): BeadMark => {
      const answer = answers.find((item) => item.ordinal === index + 1);
      if (!answer?.detail) return "untested";
      return held(answer) ? "hit" : "miss";
    });
  const named = beads((answer) => answer.detail?.appearance === "mentioned");
  const recommended = beads(
    (answer) => answer.detail?.recommendation === "recommended",
  );
  const numbersOf = (marks: BeadMark[]) =>
    marks.flatMap((mark, index) => (mark === "hit" ? [index + 1] : []));
  return (
    <div className={styles.body} data-direct-ten-report>
      <section className={styles.section} id="summary" tabIndex={-1}>
        <ReportSectionHeading number="01" className={styles.sectionHeading}>
          Hasil singkat
        </ReportSectionHeading>
        <div className={styles.resultCard}>
          <p className={styles.bigNumber} aria-hidden="true">
            <span>{measures.overall.appeared}</span>
            <span>dari {measures.overall.total}</span>
          </p>
          <p className={styles.count}>
            Bisnis Anda muncul di {measures.overall.appeared} dari{" "}
            {measures.overall.total} pertanyaan
          </p>
          <TenBeads
            marks={named}
            tone="ember"
            summary={
              numbersOf(named).length
                ? `Disebut di pertanyaan ${questionList(numbersOf(named))}.`
                : "Tidak disebut di pertanyaan mana pun."
            }
          />
          <div className={styles.cardRule} />
          <p
            className={`${styles.bigNumber} ${styles.bigNumberSmall}`}
            aria-hidden="true"
          >
            <span>{measures.recommendation.recommended}</span>
            <span>dari {measures.recommendation.assessed}</span>
          </p>
          <p className={styles.count}>
            Bisnis Anda direkomendasikan di{" "}
            {measures.recommendation.recommended} dari{" "}
            {measures.recommendation.assessed} pertanyaan
          </p>
          <TenBeads
            marks={recommended}
            tone="ink"
            summary={
              numbersOf(recommended).length
                ? `Direkomendasikan di pertanyaan ${questionList(numbersOf(recommended))}.`
                : "Tidak direkomendasikan di pertanyaan mana pun."
            }
          />
          <div className={styles.cardRule} />
          <p className={styles.completion}>
            <IconCircleCheck size={16} stroke={1.75} aria-hidden="true" />
            {answers.length} dari {measures.overall.total} pertanyaan berhasil
            diuji
          </p>
        </div>
        <p className={styles.conclusion}>{report.conclusion}</p>
        <p className={`${styles.supporting} ${styles.limit}`}>
          <IconClock size={16} stroke={1.75} aria-hidden="true" />
          <span>
            Hasil ini terbatas pada sepuluh pertanyaan yang disetujui dan
            jawaban pada waktu pengamatan masing-masing. Model, waktu, lokasi,
            atau percakapan berbeda dapat memberi jawaban berbeda. Disebut bukan
            berarti direkomendasikan.
          </span>
        </p>
      </section>
      <section className={styles.section} id="detail" tabIndex={-1}>
        <ReportSectionHeading number="02" className={styles.sectionHeading}>
          Jawaban model AI
        </ReportSectionHeading>
        <p className={styles.supporting}>
          Pertanyaan dan jawaban lengkap ditampilkan sesuai urutan pengujian.
          Teks jawaban adalah bukti yang diamati, bukan pendapat Nuave.
        </p>
        {answers.map((answer) => (
          <ReportAnswer key={answer.id} answer={answer} names={names} />
        ))}
      </section>
      <section className={styles.section} id="findings" tabIndex={-1}>
        <ReportSectionHeading number="03" className={styles.sectionHeading}>
          Analisis Nuave
        </ReportSectionHeading>
        <ol className={styles.items}>
          {report.key_findings.map((finding, i) => (
            <li key={i} className={styles.card}>
              <h3>
                <span className={styles.ordinal} aria-hidden="true">
                  {i + 1}
                </span>
                {finding.title}
              </h3>
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
              <div key={i} className={styles.comparator}>
                <p>
                  <strong>{competitor.name}</strong>
                  <span className={styles.relation}>
                    {" · "}
                    {relationships[competitor.relationship]}
                  </span>
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
      <section className={styles.section} id="priorities" tabIndex={-1}>
        <ReportSectionHeading number="04" className={styles.sectionHeading}>
          Yang dapat dilakukan
        </ReportSectionHeading>
        <ol className={styles.items}>
          {[...report.priorities]
            .sort((a, b) => a.order - b.order)
            .map((priority, i) => (
              <li key={i} value={priority.order} className={styles.card}>
                <p
                  className={`${styles.eyebrow} ${styles.timing}`}
                  data-timing={priority.timing}
                >
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
                  <p className={`${styles.supporting} ${styles.caveat}`}>
                    <IconInfoCircle
                      size={16}
                      stroke={1.75}
                      aria-hidden="true"
                    />
                    <span>{priority.caveat}</span>
                  </p>
                )}
                <ReportReferences
                  ids={priority.evidence_prompt_ids}
                  references={references}
                />
              </li>
            ))}
        </ol>
      </section>
      <section className={styles.section} id="method" tabIndex={-1}>
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
