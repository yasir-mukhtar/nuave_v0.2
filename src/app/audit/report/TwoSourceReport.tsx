"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconExternalLink,
} from "@tabler/icons-react";
import { NuaveLogo } from "@/components/product/journey/NuaveLogo";
import { SUPPORT_EMAIL } from "@/components/product/journey/JourneyBars";
import { motionAllowedNow } from "@/components/motion/useMotionAllowed";
import {
  MentionDot,
  type MentionLook,
} from "@/components/product/report/MentionDot";
import type { DirectTenAuditContext } from "@/lib/audit/direct-ten-context-v2";
import { buildReportPresentation } from "@/lib/audit/report-presentation";
import {
  subjectNoun,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import type { AuditObservation, AuditReport } from "@/lib/audit/types";
import { cn } from "@/lib/utils";
import {
  MENTION_LABEL,
  SOURCE_LABEL,
  competitorRows,
  displayHost,
  mentionState,
  ratingLine,
  siteIcon,
  topicGapRows,
  verdictFromConclusion,
  type CompetitorRow,
  type MentionState,
  type Source,
} from "./report-v2-data";
import { checkedDate, profileQuestionsNote } from "./TwoSourceSections";
import { AnswerPanelProvider, SOURCE_ICON, useOpenAnswer } from "./AnswerPanel";
import { AnswersTable } from "./AnswersTable";
import { ReportAppendix } from "./ReportAppendix";
import { PdfButton, PdfFailed, useReportPdf } from "./ReportPdfButton";
import type { DownloadPdf } from "./report-pdf";
import auditStyles from "../audit.module.css";
import bodyStyles from "./report-body.module.css";
import styles from "./report-v2.module.css";

/**
 * Spec 021 Part A: the two-source report in the approved prototype's layout
 * (experiments/report-v2-poc). Reports saved before Spec 018 never reach this
 * file; they keep DirectTenReportPage's legacy renderer byte for byte.
 */

const SECTIONS = [
  ["temuan", "Temuan Utama"],
  ["pesaing", "Peta Pesaing"],
  ["topik", "Celah Topik"],
  ["rekomendasi", "Rekomendasi"],
  ["penutup", "Penutup"],
  ["jawaban", "Jawaban AI"],
] as const;
type SectionId = (typeof SECTIONS)[number][0];

const numberFormat = new Intl.NumberFormat("id-ID");

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.tabIndex = -1;
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    block: "start",
    behavior: motionAllowedNow() ? "smooth" : "auto",
  });
}

/** The chips follow the reader down the report. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(key.split(",").find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    for (const id of key.split(",")) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [key]);
  return [active, setActive] as const;
}

function ContentsNav({ ids }: { ids: readonly SectionId[] }) {
  const [active, setActive] = useActiveSection(ids);
  return (
    <nav
      aria-label="Isi laporan"
      className={cn(styles.chips, auditStyles.noPrint)}
    >
      <ol className={styles.inner}>
        {SECTIONS.filter(([id]) => ids.includes(id)).map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              data-chip={id}
              aria-current={active === id ? "true" : undefined}
              className={cn(
                "type-label inline-flex h-9 items-center gap-1.5 rounded-[18px] border px-3.5 whitespace-nowrap no-underline transition-[background-color,border-color,color] duration-200",
                active === id
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line-300 bg-white text-ink-900 hover:border-ink-400",
              )}
              onClick={(event) => {
                event.preventDefault();
                setActive(id);
                scrollToSection(id);
              }}
            >
              {active === id ? (
                <IconCheck size={16} stroke={2.25} aria-hidden="true" />
              ) : null}
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Spec 021 "PDF": these sections start a new page on paper. */
const NEW_PAGE: ReadonlySet<SectionId> = new Set([
  "temuan",
  "rekomendasi",
  "penutup",
]);

/** A full-width section band with its title and lede. */
function Band({
  id,
  title,
  lede,
  tone,
  children,
}: {
  id: SectionId;
  title: string;
  lede?: ReactNode;
  tone?: "wash" | "ink" | "grey";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      data-new-page={NEW_PAGE.has(id) || undefined}
      className={cn(
        styles.band,
        tone === "wash" && styles.bandWash,
        tone === "ink" && styles.bandInk,
        tone === "grey" && styles.bandGrey,
      )}
    >
      <div className={cn(styles.inner, styles.bandInner)}>
        <div className={styles.secHead}>
          <h2 id={`${id}-title`}>{title}</h2>
          {lede ? <p className={styles.lede}>{lede}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Question references at the end of a paragraph, in neutral grey. Each
 * opens its question in the side panel (Spec 021 Part D); none changes the
 * address, which keeps the report link's secret after the `#`. */
function QuestionRefs({ ordinals }: { ordinals: readonly number[] }) {
  const openAnswer = useOpenAnswer();
  if (!ordinals.length) return null;
  return (
    <span className={styles.refs}>
      {ordinals.map((n) => (
        <button
          key={n}
          type="button"
          className={styles.ref}
          onClick={(event) => openAnswer(n, undefined, event.currentTarget)}
          aria-label={`P${n}: pertanyaan ${n}`}
          data-question-ref={n}
        >
          P{n}
        </button>
      ))}
    </span>
  );
}

function sourceSentence(two: TwoSourceReport, source: Source) {
  const who = subjectNoun(two.subject);
  const { chatgpt, google } = two.counts;
  if (source === "chatgpt")
    return chatgpt.completed === 0
      ? "Tidak diuji"
      : `${who} muncul di ${chatgpt.named} dari ${chatgpt.completed} pertanyaan dan direkomendasikan di ${chatgpt.recommended}.`;
  if (google.completed === 0) return "Tidak diuji";
  const shown = `Google menampilkan AI Overview di ${google.summaries} dari ${google.completed} pertanyaan`;
  if (google.summaries === 0) return `${shown}. Penyebutan: Tidak diuji.`;
  const cited = two.questions.filter(
    (q) => mentionState(q, "google") === "cited",
  ).length;
  return `${shown}; ${who.charAt(0).toLowerCase()}${who.slice(1)} muncul di ${google.named} dari ${google.summaries}.${
    cited ? ` Situs Anda dikutip tanpa nama di ${cited}.` : ""
  }`;
}

function SourceCard({ two, source }: { two: TwoSourceReport; source: Source }) {
  const openAnswer = useOpenAnswer();
  const { chatgpt, google } = two.counts;
  const [count, of, unit] =
    source === "chatgpt"
      ? [chatgpt.named, chatgpt.completed, "jawaban"]
      : [google.named, google.summaries, "ringkasan AI"];
  return (
    <div className={styles.card} data-source-card={source}>
      <h3 className={styles.source}>
        {SOURCE_ICON[source]}
        {SOURCE_LABEL[source]}
      </h3>
      {of > 0 ? (
        <p className={styles.big} aria-hidden="true">
          <span>{count}</span>
          <span>
            dari {of} {unit}
          </span>
        </p>
      ) : null}
      <p className={styles.sentence}>{sourceSentence(two, source)}</p>
      <ol className={styles.dots}>
        {two.questions.map((question) => {
          const state = mentionState(question, source);
          return (
            <li key={question.prompt_id}>
              <button
                type="button"
                className={styles.dotLink}
                onClick={(event) =>
                  openAnswer(question.ordinal, source, event.currentTarget)
                }
                data-mention={state}
                aria-label={`Pertanyaan ${question.ordinal}: ${MENTION_LABEL[state]}`}
              >
                <MentionDot look={state} />
                <span aria-hidden="true">{question.ordinal}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const LEGEND: MentionState[] = [
  "noaio",
  "none",
  "cited",
  "mentioned",
  "recommended",
];

function Legend({ withFailed }: { withFailed: boolean }) {
  const looks: MentionState[] = withFailed ? [...LEGEND, "failed"] : LEGEND;
  return (
    <ul className={styles.legend} aria-label="Arti titik">
      {looks.map((look) => (
        <li key={look}>
          <MentionDot look={look as MentionLook} size="sm" />
          {MENTION_LABEL[look]}
        </li>
      ))}
    </ul>
  );
}

function Findings({
  report,
  ordinalOf,
}: {
  report: AuditReport;
  ordinalOf: (promptId: string) => number | undefined;
}) {
  const two = report.two_source!;
  const ordinals = (ids: readonly string[]) =>
    ids
      .map(ordinalOf)
      .filter((n): n is number => n !== undefined)
      .sort((a, b) => a - b);
  return (
    <ol className={styles.findings}>
      {report.key_findings.map((finding, i) => (
        <li key={i} className={styles.finding} data-finding>
          <h3>{finding.title}</h3>
          <p>
            {finding.explanation}{" "}
            <QuestionRefs ordinals={ordinals(finding.evidence_prompt_ids)} />
          </p>
        </li>
      ))}
      {two.google_finding ? (
        <li className={styles.finding} data-google-finding>
          <h3>Google AI Overview</h3>
          <p>{two.google_finding}</p>
        </li>
      ) : null}
    </ol>
  );
}

function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N}' ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Spec 021 C-03: the business's own site icon, loaded without a referrer;
 * initials when there is none, when it fails, or when logos are off
 * (synthetic reports and the printed copy). */
function CompetitorLogo({
  name,
  website,
  showLogos,
}: {
  name: string;
  website: string | null | undefined;
  showLogos: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const icon = showLogos ? siteIcon(website) : null;
  return (
    <span className={styles.initials} aria-hidden="true">
      {icon && !failed ? (
        // A plain image: the site's own icon, never an optimised copy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.logo}
          src={icon}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          data-competitor-logo
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** A provider address as a link that opens in a new tab with no referrer
 * (C-04). */
function SiteLink({ website }: { website: string }) {
  return (
    <a
      className={styles.site}
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label={`${displayHost(website)} (membuka tab baru)`}
      data-competitor-site
    >
      {displayHost(website)}
      <IconExternalLink aria-hidden="true" />
    </a>
  );
}

function CompetitorLine({
  row,
  ownLabel,
  showLogos,
}: {
  row: CompetitorRow;
  ownLabel: string;
  showLogos: boolean;
}) {
  const total = row.chatgpt + row.google;
  // "direkomendasikan" is the report writer's reading of the owner's
  // answers (as in Ringkasan); every row's card count is ChatGPT's own.
  const recommended = row.own?.recommended ?? 0;
  const cards = row.cards ?? 0;
  const split = [
    row.chatgpt ? `ChatGPT ${row.chatgpt}` : "",
    row.google ? `Google ${row.google}` : "",
    row.own?.cited ? `dikutip ${row.own.cited}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const rating = ratingLine(row.rating, row.reviews);
  return (
    <div
      className={cn(styles.compRow, row.own && styles.own)}
      data-competitor={row.own ? "own" : "other"}
    >
      <CompetitorLogo
        name={row.name}
        website={row.website}
        showLogos={showLogos}
      />
      <p className={styles.name}>
        {row.name}
        {row.own ? <span className={styles.youPill}>{ownLabel}</span> : null}
        {row.website || rating ? (
          <span className={styles.metaLine}>
            {row.website ? <SiteLink website={row.website} /> : null}
            {row.website && rating ? " · " : null}
            {rating ? <span data-competitor-rating>{rating}</span> : null}
          </span>
        ) : null}
      </p>
      <p className={styles.stats}>
        <strong>{total}×</strong>
        {recommended ? (
          <>
            direkomendasikan {recommended}×
            <br />
          </>
        ) : null}
        {cards ? (
          <>
            kartu ChatGPT {cards}×
            <br />
          </>
        ) : null}
        <span className={styles.split}>{split}</span>
      </p>
    </div>
  );
}

function Competitors({
  two,
  observations,
  ownNames,
  ownWebsite,
  showLogos,
}: {
  two: TwoSourceReport;
  observations: readonly AuditObservation[];
  /** The owner's display name first, then its other names. */
  ownNames: readonly string[];
  /** The owner's own site, when the saved listings have none. */
  ownWebsite?: string;
  showLogos: boolean;
}) {
  const { counted, uncounted } = competitorRows(two, observations, ownNames);
  const others = counted.filter((row) => !row.own);
  const top = new Set(others.slice(0, 5));
  const shown = counted
    .filter((row) => row.own || top.has(row))
    .map((row) =>
      row.own && !row.website && ownWebsite
        ? { ...row, website: ownWebsite }
        : row,
    );
  const saved = new Map(
    (two.competitors?.others ?? []).map((fact) => [fact.name, fact]),
  );
  const rest = [
    ...others
      .filter((row) => !top.has(row))
      .map((row) => ({ name: row.name, website: row.website ?? null })),
    ...uncounted.map((name) => ({
      name,
      website: saved.get(name)?.website ?? null,
    })),
  ];
  const anyCards = shown.some((row) => row.cards);
  return (
    <div className={styles.comp} data-other-businesses>
      {shown.map((row) => (
        <CompetitorLine
          key={row.name}
          row={row}
          ownLabel={subjectNoun(two.subject)}
          showLogos={showLogos}
        />
      ))}
      {rest.length ? (
        <div className={styles.tail}>
          <p>Bisnis lain yang juga disebut AI:</p>
          <ul className={styles.chipList}>
            {rest.map(({ name, website }) => (
              <li key={name}>
                {website ? (
                  <a
                    className={styles.linkChip}
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    title={displayHost(website)}
                    aria-label={`${name} (${displayHost(website)}, membuka tab baru)`}
                    data-competitor-site
                  >
                    {name}
                    <IconExternalLink aria-hidden="true" />
                  </a>
                ) : (
                  <span className={styles.plainChip}>{name}</span>
                )}
              </li>
            ))}
          </ul>
          {rest.some((item) => item.website) ? (
            <p className={styles.tailNote}>
              Ikon panah menandai website yang bisa dibuka.
            </p>
          ) : null}
        </div>
      ) : null}
      {anyCards ? (
        <div className={styles.tail}>
          <p className={styles.tailNote} data-cards-note>
            Kartu ChatGPT: berapa kali ChatGPT menampilkan bisnis itu sebagai
            kartu tempat (nama, rating, alamat) dalam jawabannya.
          </p>
        </div>
      ) : null}
      {!others.length && !uncounted.length ? (
        <div className={styles.tail}>
          <p>Tidak ada bisnis lain yang disebut dalam jawaban ini.</p>
        </div>
      ) : null}
    </div>
  );
}

function TopicGaps({
  two,
  observations,
}: {
  two: TwoSourceReport;
  observations: readonly AuditObservation[];
}) {
  const rows = topicGapRows(two, observations, two.subject);
  return (
    <ul className={styles.topics} data-topics-missing>
      {rows.map((row) => (
        <li key={row.ordinal} className={styles.topic}>
          <h3>{row.topic}</h3>
          {row.volume !== null ? (
            <span className={styles.vol}>
              ±{numberFormat.format(row.volume)}
              <small>pencarian/bulan</small>
            </span>
          ) : row.othersNamed > 0 ? (
            <span className={styles.vol}>
              {row.othersNamed} {two.subject === "klinik" ? "klinik" : "bisnis"}
              <small>lain disebut AI</small>
            </span>
          ) : (
            <span />
          )}
          <p>
            {row.standing}{" "}
            {row.domains.length ? (
              <span className={styles.srcLine}>
                Sumber yang dipakai AI: {row.domains.join(", ")}
              </span>
            ) : null}{" "}
            <QuestionRefs ordinals={[row.ordinal]} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function Recommendations({ report }: { report: AuditReport }) {
  const priorities = [...report.priorities].sort((a, b) => a.order - b.order);
  return (
    <ol className={styles.recs}>
      {priorities.map((priority, i) => (
        <li key={i} className={styles.rec} data-recommendation>
          <span className={styles.recNumber} aria-hidden="true">
            {i + 1}
          </span>
          <h3>{priority.action}</h3>
          <p>{priority.why}</p>
        </li>
      ))}
    </ol>
  );
}

function Closing({ report }: { report: AuditReport }) {
  return (
    <>
      {report.conclusion ? (
        <p className={styles.conclusion}>{report.conclusion}</p>
      ) : null}
      <div className={styles.reaudit} data-reaudit>
        <h3>Audit ulang setelah 8 minggu</h3>
        <p>
          ChatGPT dan Google perlu waktu untuk membaca halaman baru. Setelah
          perubahan berjalan sekitar delapan minggu, audit ulang dengan 10
          pertanyaan yang sama, supaya hasilnya bisa dibandingkan langsung
          dengan laporan ini.
        </p>
      </div>
    </>
  );
}

/**
 * The report's sections (Ringkasan to Jawaban AI). `nav` is placed between
 * Ringkasan and the first band, where the contents chips belong.
 */
export function TwoSourceReportBody({
  report,
  observations,
  names = [],
  nav,
  ownWebsite,
  showLogos = false,
}: {
  report: AuditReport;
  observations: AuditObservation[];
  names?: readonly string[];
  nav?: ReactNode;
  /** The owner's own site, for its row in Peta Pesaing. */
  ownWebsite?: string;
  /** Spec 021 C-03: competitors' site icons; off in synthetic reports and in
   * the copy Browser Run prints. */
  showLogos?: boolean;
}) {
  const two = report.two_source!;
  const presentation = buildReportPresentation(report, observations);
  if (presentation.status !== "ready")
    return (
      <div className={bodyStyles.body} role="alert">
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
  const ordinalOf = (promptId: string) =>
    two.questions.find((q) => q.prompt_id === promptId)?.ordinal;
  const ownName = names[0] ?? subjectNoun(two.subject);
  const anyFailed = two.questions.some(
    (q) =>
      mentionState(q, "chatgpt") === "failed" ||
      mentionState(q, "google") === "failed",
  );
  const hasTopics = topicGapRows(two, observations, two.subject).length > 0;
  const hasRecs = report.priorities.length > 0;
  return (
    <AnswerPanelProvider two={two} answers={presentation.answers} names={names}>
      <div data-direct-ten-report data-report-v2>
        <section id="summary" className={styles.inner} aria-label="Ringkasan">
          <div className={styles.summary}>
            <p className={styles.verdict} data-verdict>
              {verdictFromConclusion(report.conclusion)}
            </p>
            <div className={styles.cards}>
              <SourceCard two={two} source="chatgpt" />
              <SourceCard two={two} source="google" />
            </div>
            <Legend withFailed={anyFailed} />
            {two.counts.failed > 0 ? (
              <p className={styles.failed} data-failed-count>
                {two.counts.failed} pemeriksaan tidak dapat diuji
              </p>
            ) : null}
            {hasRecs ? (
              <a
                className={cn(styles.jump, auditStyles.noPrint)}
                href="#rekomendasi"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("rekomendasi");
                }}
              >
                Lihat {report.priorities.length} rekomendasi
                <IconArrowRight size={16} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
        {nav}
        <Band id="temuan" title="Temuan Utama">
          <Findings report={report} ordinalOf={ordinalOf} />
        </Band>
        <Band
          id="pesaing"
          title="Peta Pesaing"
          lede="Bisnis yang disebut ChatGPT dan Google dalam jawaban ini, diurutkan dari yang paling sering disebut."
        >
          <Competitors
            two={two}
            observations={observations}
            ownNames={[ownName, ...names.slice(1)]}
            ownWebsite={ownWebsite}
            showLogos={showLogos}
          />
        </Band>
        {hasTopics ? (
          <Band
            id="topik"
            title="Celah Topik"
            lede={`Topik yang dicari orang, tetapi jawabannya belum menyebut ${subjectNoun(two.subject, false)}.`}
          >
            <TopicGaps two={two} observations={observations} />
          </Band>
        ) : null}
        {hasRecs ? (
          <Band
            id="rekomendasi"
            title="Rekomendasi"
            lede="Diurutkan dari yang paling penting."
            tone="wash"
          >
            <Recommendations report={report} />
          </Band>
        ) : null}
        <Band id="penutup" title="Penutup" tone="ink">
          <Closing report={report} />
        </Band>
        <Band
          id="jawaban"
          title="Jawaban AI"
          lede={
            <>
              Bukti di balik laporan ini.
              {/* On paper the answers follow in full; nothing to tap. */}
              <span className={auditStyles.noPrint}>
                {" "}
                Ketuk pertanyaan untuk membaca jawaban lengkapnya.
              </span>
            </>
          }
          tone="grey"
        >
          <AnswersTable two={two} names={names} />
          <ReportAppendix
            two={two}
            answers={presentation.answers}
            names={names}
          />
          <ul className={styles.notes} data-answer-notes>
            <li>
              Jawaban AI dapat berubah menurut waktu, model, akun, dan lokasi.
            </li>
            <li>
              {two.places.google.name === two.places.chatgpt.name
                ? `Pertanyaan diajukan dari ${two.places.chatgpt.name}.`
                : `Pertanyaan diajukan dari ${two.places.chatgpt.name}; Google dari ${two.places.google.name}.`}
            </li>
            <li>Disebut belum tentu direkomendasikan.</li>
            {!two.search_data_available ? (
              <li data-profile-questions>
                {profileQuestionsNote(two.subject)}
              </li>
            ) : null}
          </ul>
        </Band>
      </div>
    </AnswerPanelProvider>
  );
}

/** The whole page: top bar, header, the sections, the save row, the footer. */
export function TwoSourceReportPage({
  report,
  brief,
  observations,
  previewNotice,
  onDownloadPdf,
  showLogos = false,
}: {
  report: AuditReport;
  brief: DirectTenAuditContext;
  observations: AuditObservation[];
  previewNotice?: ReactNode;
  /** The server PDF (Part P); without it, "Unduh PDF" prints. */
  onDownloadPdf?: DownloadPdf;
  /** Competitors' site icons (Part C); off unless the page turns them on. */
  showLogos?: boolean;
}) {
  const two = report.two_source!;
  const name = brief.identity.name;
  const date = checkedDate(two);
  const pdf = useReportPdf(onDownloadPdf);
  const hasTopics = topicGapRows(two, observations, two.subject).length > 0;
  const ids = SECTIONS.map(([id]) => id).filter(
    (id) =>
      (id !== "topik" || hasTopics) &&
      (id !== "rekomendasi" || report.priorities.length > 0),
  );
  return (
    <div className={styles.page}>
      <div className={cn(styles.topbar, auditStyles.noPrint)}>
        <div className={styles.inner}>
          <Link href="/" aria-label="Nuave, ke beranda" className="flex">
            <NuaveLogo className="h-[25px] w-auto" />
          </Link>
          <PdfButton pdf={pdf} place="top" />
        </div>
        <PdfFailed pdf={pdf} place="top" className={styles.topbarNote} />
      </div>
      {previewNotice ? (
        <div className={cn(styles.inner, "pt-4")}>{previewNotice}</div>
      ) : null}
      <header
        className={cn(styles.inner, styles.head)}
        id="stage-5"
        tabIndex={-1}
      >
        <p className={styles.eyebrow}>Laporan Visibilitas AI</p>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.meta}>
          <strong>{displayHost(brief.identity.source)}</strong>
          {` · ${two.places.google.name}`}
        </p>
        <p className={styles.meta} data-report-checked>
          {date ? `Diperiksa ${date} · ` : ""}ChatGPT dan Google AI Overview
        </p>
      </header>
      <TwoSourceReportBody
        report={report}
        observations={observations}
        names={[name, ...brief.identity.aliases]}
        nav={<ContentsNav ids={ids} />}
        ownWebsite={
          /^https?:\/\//i.test(brief.identity.source)
            ? brief.identity.source
            : undefined
        }
        showLogos={showLogos}
      />
      <div className={styles.inner}>
        <div className={cn(styles.save, auditStyles.noPrint)}>
          <div className="grid gap-1">
            <h2>Simpan laporan ini</h2>
            <p>
              Satu PDF berisi temuan, rekomendasi, dan semua jawaban lengkap,
              siap dibagikan ke tim atau agensi Anda.
            </p>
          </div>
          <div className={styles.saveAction}>
            <PdfButton pdf={pdf} place="end" />
            <PdfFailed pdf={pdf} place="end" />
          </div>
        </div>
        <footer className={styles.footer}>
          <span>Nuave · Laporan Visibilitas AI · {name}</span>
          <span>Butuh bantuan? {SUPPORT_EMAIL}</span>
        </footer>
      </div>
    </div>
  );
}
