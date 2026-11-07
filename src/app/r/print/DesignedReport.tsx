"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { REPORT_FONTS } from "@/app/fonts";
import { NuaveLogo } from "@/components/product/journey/NuaveLogo";
import type { SavedReportData } from "@/lib/audit/customer-evidence-export";
import {
  subjectNoun,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import {
  MENTION_LABEL,
  mentionState,
  twoSourceView,
  type MentionState,
} from "@/app/audit/report/report-v2-data";
import { profileQuestionsNote } from "@/app/audit/report/TwoSourceSections";
import {
  BACK_COVER,
  CLOSING,
  CONFIDENTIAL_LABEL,
  CONTENTS,
  CONTINUED,
  COVER,
  DIVIDER,
  FRONT_LABEL,
  HOW_TO_READ,
  PAGE_NAME,
  REPORT_NAME,
  SECTION_QUESTIONS,
  SYNTHETIC_LABEL,
  footerParts,
  sectionLabel,
  sectionPageLabel,
  sectionTitle,
  type SectionNumber,
} from "@/lib/report-pdf/fixed-text";
import {
  contentsRows,
  reportPdfPages,
  type PageKind,
  type PageListInput,
  type PdfPage,
} from "@/lib/report-pdf/page-list";
import type { TypeRole } from "@/lib/report-pdf/type-roles";
import { cn } from "@/lib/utils";
import { familyName, pdfFontsReady } from "./font-ready";
import styles from "./designed.module.css";

/**
 * Spec 024 Part 1: the designed 16:9 report PDF, the body `/r/print` shows
 * for a two-source report while the designed print is on (F-04, F-10). The
 * pages come only from the page list (F-05); every fixed string comes from
 * fixed-text.ts (G-05); counts and labels come from the web report's code
 * (G-03). The ready marker waits for the PDF fonts (F-08).
 */

const ROLE_CLASS: Record<TypeRole, string> = {
  display: styles.display!,
  "section-number": styles.sectionNumber!,
  "section-title": styles.sectionTitle!,
  "big-number": styles.bigNumber!,
  title: styles.title!,
  statement: styles.statement!,
  heading: styles.heading!,
  lede: styles.lede!,
  text: styles.text!,
  small: styles.small!,
  caption: styles.caption!,
  label: styles.label!,
  footer: styles.footer!,
  "page-number": styles.pageNumber!,
  code: styles.code!,
};

/** A text element with its type role (F-02); the print check reads
 * `data-type` (AC-G2). */
function T({
  role,
  as: Tag = "p",
  className,
  children,
}: {
  role: TypeRole;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "dt" | "dd" | "li";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag data-type={role} className={cn(ROLE_CLASS[role], className)}>
      {children}
    </Tag>
  );
}

const PDF_FAMILIES = REPORT_FONTS.map((font) =>
  familyName(font.style.fontFamily),
);
const FONT_VARIABLES = REPORT_FONTS.map((font) => font.variable).join(" ");

const monthYear = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonthYear = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "UTC",
});

type Context = {
  two: TwoSourceReport;
  name: string;
  month: string | null;
  pages: PdfPage[];
  data: SavedReportData;
};

/* ------------------------------ marks ------------------------------ */

/** A question's state for one source, drawn as shapes, never as a font
 * glyph (G-08). */
function Mark({
  state,
  x,
  y,
  r,
  color,
  ink,
}: {
  state: MentionState;
  x: number;
  y: number;
  r: number;
  color: string;
  /** The colour of the page under the mark (the check's colour). */
  ink: string;
}) {
  const ring = { fill: ink, stroke: color, strokeWidth: 1.5 };
  switch (state) {
    case "recommended":
      return (
        <g>
          <circle cx={x} cy={y} r={r} fill={color} />
          <path
            d={`M ${x - r * 0.42} ${y + r * 0.02} L ${x - r * 0.1} ${y + r * 0.34} L ${x + r * 0.45} ${y - r * 0.3}`}
            fill="none"
            stroke={ink}
            strokeWidth={r * 0.24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case "mentioned":
      return <circle cx={x} cy={y} r={r} fill={color} />;
    case "cited":
      return (
        <g>
          <circle cx={x} cy={y} r={r - 0.75} {...ring} />
          <circle cx={x} cy={y} r={r * 0.36} fill={color} />
        </g>
      );
    case "none":
      return <circle cx={x} cy={y} r={r - 0.75} {...ring} />;
    case "noaio":
      return (
        <circle
          cx={x}
          cy={y}
          r={r - 0.75}
          {...ring}
          strokeDasharray="1.6 2.6"
          strokeLinecap="round"
        />
      );
    case "failed":
      return (
        <g>
          <circle cx={x} cy={y} r={r - 0.75} {...ring} strokeDasharray="4 3" />
          <line
            x1={x - r * 0.45}
            y1={y}
            x2={x + r * 0.45}
            y2={y}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      );
  }
}

function MarkIcon({
  state,
  color,
  ink,
  size = 18,
}: {
  state: MentionState;
  color: string;
  ink: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <Mark
        state={state}
        x={size / 2}
        y={size / 2}
        r={size / 2 - 1}
        color={color}
        ink={ink}
      />
    </svg>
  );
}

const LEGEND_ORDER: MentionState[] = [
  "recommended",
  "mentioned",
  "cited",
  "none",
  "noaio",
];

function legendStates(two: TwoSourceReport): MentionState[] {
  const failed = two.questions.some(
    (q) =>
      mentionState(q, "chatgpt") === "failed" ||
      mentionState(q, "google") === "failed",
  );
  return failed ? [...LEGEND_ORDER, "failed"] : LEGEND_ORDER;
}

/* ------------------------------ frame ------------------------------ */

function Frame({
  page,
  label,
  ctx,
  children,
  footer,
}: {
  page: PdfPage;
  label?: string;
  ctx: Context;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section
      className={cn(styles.page, page.dark && styles.dark)}
      data-pdf-page={page.number}
      data-kind={page.kind}
      data-section={page.section}
      data-label={page.label}
      data-dark={page.dark ? "true" : "false"}
      aria-label={`${page.number}`}
    >
      <header className={styles.header}>
        <NuaveLogo className={styles.logo} />
        {label ? (
          <T role="label" className={styles.headerLabel}>
            {label}
          </T>
        ) : null}
      </header>
      <div className={styles.body}>{children}</div>
      {footer ?? (
        <footer className={styles.foot}>
          <span className={styles.footParts}>
            {footerParts(ctx.name, ctx.month).map((part, i) => (
              <span key={i} className={styles.footParts}>
                {i > 0 ? (
                  <span className={styles.dot} aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <T role="footer" as="span">
                  {part}
                </T>
              </span>
            ))}
          </span>
          {page.label ? (
            <T role="page-number" as="span">
              {page.label}
            </T>
          ) : null}
        </footer>
      )}
    </section>
  );
}

/* ------------------------------ Sampul ------------------------------ */

const RING = { cx: 300, cy: 262, outer: 214, inner: 134, label: 244, dot: 9 };

function CoverRing({ two }: { two: TwoSourceReport }) {
  const n = two.questions.length || 1;
  const at = (i: number, r: number) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: RING.cx + r * Math.cos(angle),
      y: RING.cy + r * Math.sin(angle),
    };
  };
  const violet = "var(--pdf-dark-accent)";
  const white = "var(--pdf-dark-ink)";
  const ink = "var(--pdf-dark-bg)";
  return (
    <svg
      className={styles.ring}
      viewBox="0 0 600 540"
      aria-hidden="true"
      data-cover-ring
    >
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={RING.label + 26}
        fill="none"
        stroke="var(--pdf-dark-line)"
      />
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={RING.outer}
        fill="none"
        stroke={violet}
        strokeWidth={1.25}
      />
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={RING.inner}
        fill="none"
        stroke={white}
        strokeWidth={1.25}
      />
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={56}
        fill="none"
        stroke="var(--pdf-dark-line)"
      />
      {two.questions.map((q, i) => {
        const outer = at(i, RING.outer);
        const inner = at(i, RING.inner);
        return (
          <g key={q.prompt_id} data-ring-question={q.ordinal}>
            <Mark
              state={mentionState(q, "chatgpt")}
              {...outer}
              r={RING.dot}
              color={violet}
              ink={ink}
            />
            <Mark
              state={mentionState(q, "google")}
              {...inner}
              r={RING.dot}
              color={white}
              ink={ink}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** The ordinals around the ring and its centre line, as HTML text placed
 * over the drawing, so each keeps its type role (F-02). */
function RingLabels({ two }: { two: TwoSourceReport }) {
  const n = two.questions.length || 1;
  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {two.questions.map((q, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = RING.cx + RING.label * Math.cos(angle);
        const y = RING.cy + RING.label * Math.sin(angle);
        return (
          <span
            key={q.prompt_id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <T role="label" as="span">
              {String(q.ordinal).padStart(2, "0")}
            </T>
          </span>
        );
      })}
      <span
        style={{
          position: "absolute",
          left: RING.cx,
          top: RING.cy,
          transform: "translate(-50%, -50%)",
          whiteSpace: "nowrap",
        }}
      >
        <T role="small" as="span">
          {COVER.ringCenter(two.questions.length)}
        </T>
      </span>
    </div>
  );
}

function CoverPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const { two, name, data } = ctx;
  const date = checkedDay(two);
  return (
    <Frame
      page={page}
      ctx={ctx}
      label={CONFIDENTIAL_LABEL}
      footer={<div aria-hidden="true" />}
    >
      <div className={styles.cover}>
        <div className={styles.coverLeft}>
          <T role="label" className={styles.accent}>
            {COVER.eyebrow}
          </T>
          <T role="display" as="h1">
            {COVER.title(name)}
          </T>
          <T role="lede" className={styles.coverLede}>
            {COVER.lede(two.places.google.name, two.subject)}
          </T>
          {data.synthetic ? (
            <T role="small" className={styles.synthetic}>
              {SYNTHETIC_LABEL}
            </T>
          ) : null}
          <dl className={styles.coverMeta}>
            {date ? (
              <div>
                <T role="label" as="dt">
                  {COVER.checked}
                </T>
                <T role="text" as="dd">
                  {date}
                </T>
              </div>
            ) : null}
            <div>
              <T role="label" as="dt">
                {COVER.sources}
              </T>
              <T role="text" as="dd">
                {COVER.sourcesValue}
              </T>
            </div>
            <div>
              <T role="label" as="dt">
                {COVER.place}
              </T>
              <T role="text" as="dd">
                {two.places.google.name}
              </T>
            </div>
          </dl>
        </div>
        <div className={styles.coverRight}>
          <div style={{ position: "relative", width: 600, height: 540 }}>
            <CoverRing two={two} />
            <RingLabels two={two} />
          </div>
          <T role="small" className={styles.ringNote}>
            {COVER.ringNote}
          </T>
          <ul className={styles.legendRow}>
            <li style={{ color: "var(--pdf-dark-accent)" }}>
              <span className={styles.swatch} aria-hidden="true" />
              <T role="small" as="span">
                {COVER.ringChatgpt}
              </T>
            </li>
            <li style={{ color: "var(--pdf-dark-ink)" }}>
              <span className={styles.swatch} aria-hidden="true" />
              <T role="small" as="span">
                {COVER.ringGoogle}
              </T>
            </li>
          </ul>
          <ul className={styles.legendRow} data-legend>
            {legendStates(two).map((state) => (
              <li key={state}>
                <MarkIcon
                  state={state}
                  color="var(--pdf-dark-ink)"
                  ink="var(--pdf-dark-bg)"
                  size={16}
                />
                <T role="small" as="span">
                  {MENTION_LABEL[state]}
                </T>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------- Daftar isi ---------------------------- */

function pageName(kind: PageKind): string {
  if (kind === "lampiran_a0" || kind === "lampiran_soal")
    return PAGE_NAME.lampiran;
  if (kind === "divider") return "";
  return PAGE_NAME[kind];
}

function ContentsPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const rows = contentsRows(ctx.pages);
  return (
    <Frame page={page} ctx={ctx} label={FRONT_LABEL.daftar_isi}>
      <div className={styles.contents}>
        <div>
          <T role="label" className={styles.accent}>
            {CONTENTS.eyebrow}
          </T>
          <T role="title" as="h1">
            {CONTENTS.lead(ctx.two.subject)}
          </T>
        </div>
        <div>
          <T role="heading" as="h2" className={styles.headingLg}>
            {CONTENTS.heading}
          </T>
          <ol className={styles.rows} data-contents>
            {rows.map((row) => {
              const title = row.section
                ? sectionTitle(row.section, ctx.name)
                : pageName(row.kind);
              const note = row.section
                ? CONTENTS.sectionNote([
                    ...new Set(row.kinds.map(pageName).filter(Boolean)),
                  ])
                : row.kind === "cara_membaca"
                  ? CONTENTS.caraMembacaNote
                  : "";
              return (
                <li
                  key={`${row.section ?? row.kind}`}
                  className={styles.row}
                  data-contents-row={row.section ?? row.kind}
                  data-target={row.page}
                >
                  {row.section ? (
                    <T role="label" as="span" className={styles.accent}>
                      {row.section}
                    </T>
                  ) : (
                    <span className={styles.rowMark} aria-hidden="true" />
                  )}
                  <T role="heading" as="span" className={styles.headingSm}>
                    {title}
                  </T>
                  <T role="label" as="span" className={styles.rowPage}>
                    {String(row.page).padStart(2, "0")}
                  </T>
                  {note ? <T role="small">{note}</T> : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------- Cara membaca laporan ----------------------- */

function checkedDay(two: TwoSourceReport): string | null {
  const at = two.checked_to ?? two.checked_from;
  return at ? dayMonthYear.format(new Date(at)) : null;
}

function askedWhen(two: TwoSourceReport): string {
  const from = two.checked_from ? dayMonthYear.format(new Date(two.checked_from)) : null;
  const to = two.checked_to ? dayMonthYear.format(new Date(two.checked_to)) : null;
  if (from && to && from !== to) return HOW_TO_READ.betweenDays(from, to);
  const day = to ?? from;
  return day ? HOW_TO_READ.onDay(day) : "";
}

function HowToReadPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const { two, name } = ctx;
  const { chatgpt, google, failed } = two.counts;
  const asked = HOW_TO_READ.asked(
    two.places.chatgpt.name,
    two.places.google.name,
    askedWhen(two),
  ).replace(" .", ".");
  const columns: { title: string; texts: string[] }[] = [
    {
      title: HOW_TO_READ.questionsTitle,
      texts: [
        [
          two.search_data_available
            ? HOW_TO_READ.fromSearchData
            : profileQuestionsNote(two.subject),
          asked,
        ].join(" "),
        [
          HOW_TO_READ.chatgptBase(chatgpt.completed),
          HOW_TO_READ.googleBase(google.summaries, google.completed),
          ...(failed > 0 ? [HOW_TO_READ.failed(failed)] : []),
        ].join(" "),
      ],
    },
    { title: HOW_TO_READ.countingTitle, texts: [HOW_TO_READ.counting(name)] },
    { title: HOW_TO_READ.limitsTitle, texts: [HOW_TO_READ.limits(two.subject)] },
  ];
  return (
    <Frame page={page} ctx={ctx} label={FRONT_LABEL.cara_membaca}>
      <T role="title" as="h1">
        {HOW_TO_READ.title}
      </T>
      <div className={styles.columns}>
        {columns.map((column, i) => (
          <div key={column.title} className={styles.column}>
            <T role="label" className={styles.accent}>
              {String(i + 1).padStart(2, "0")}
            </T>
            <T role="heading" as="h2">
              {column.title}
            </T>
            {column.texts.map((text) => (
              <T key={text} role="text">
                {text}
              </T>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.legendBlock}>
        <T role="label">{HOW_TO_READ.legend}</T>
        <ul className={styles.legendList} data-legend>
          {legendStates(two).map((state) => (
            <li key={state}>
              <MarkIcon
                state={state}
                color="var(--pdf-light-accent)"
                ink="var(--pdf-light-bg)"
              />
              <T role="text" as="span">
                {MENTION_LABEL[state]}
              </T>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/* ----------------------------- Divider ----------------------------- */

function DividerPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const section = page.section as SectionNumber;
  const inSection = ctx.pages.filter(
    (p) => p.section === section && p.kind !== "divider",
  );
  const kinds = new Set<string>(inSection.map((p) => p.kind));
  if (
    inSection.some((p) => p.kind === "penutup" && (p.plan?.length ?? 0) > 0)
  )
    kinds.add("penutup_plan");
  const questions = SECTION_QUESTIONS[section].filter((q) =>
    q.answeredBy.some((kind) => kinds.has(kind)),
  );
  const names = [...new Set(inSection.map((p) => pageName(p.kind)))];
  const sections = [
    ...new Set(
      ctx.pages
        .filter((p) => p.kind === "divider")
        .map((p) => p.section as SectionNumber),
    ),
  ];
  return (
    <Frame page={page} ctx={ctx} label={sectionLabel(section)}>
      <div className={styles.divider}>
        <div className={styles.dividerLeft}>
          <T role="section-number">{section}</T>
          <T role="section-title" as="h1">
            {sectionTitle(section, ctx.name)}
          </T>
          <T role="lede">{DIVIDER.lede(names)}</T>
        </div>
        <div className={styles.dividerRight}>
          {questions.length ? (
            <>
              <T role="label">{DIVIDER.questionsLabel}</T>
              <ol className={styles.questions}>
                {questions.map((q, i) => (
                  <li key={i}>
                    <T role="label" as="span" className={styles.accent}>
                      {String(i + 1).padStart(2, "0")}
                    </T>
                    <T role="heading" as="span">
                      {q.text(ctx.two.subject, ctx.name)}
                    </T>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
        <ol className={styles.tracker} data-tracker>
          {sections.map((s) => (
            <li key={s} data-current={s === section ? "" : undefined}>
              <T role="small" as="span">
                {s} {sectionTitle(s, ctx.name)}
              </T>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

/* ----------------------------- Penutup ----------------------------- */

function ClosingPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const continued = page.part.index > 1;
  return (
    <Frame page={page} ctx={ctx} label={sectionPageLabel("04", ctx.name)}>
      <div className={styles.closing}>
        <T role="label" className={styles.accent}>
          {continued ? `${CLOSING.eyebrow} · ${CONTINUED}` : CLOSING.eyebrow}
        </T>
        {page.conclusion ? (
          <T role="statement" className={styles.statementLg}>
            {page.conclusion}
          </T>
        ) : null}
        {page.plan?.length ? (
          <ol className={styles.plan} data-plan>
            {page.plan.map((step) => (
              <li key={step.step} style={{ gridColumn: step.step + 1 }}>
                <T role="label" className={styles.accent}>
                  {step.weeks}
                </T>
                <T role="heading" as="h2">
                  {continued ? `${step.title} (${CONTINUED})` : step.title}
                </T>
                <T role="text">{step.text}</T>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </Frame>
  );
}

/* -------------------------- Sampul belakang -------------------------- */

function BackCoverPage({ page, ctx }: { page: PdfPage; ctx: Context }) {
  const parts = [REPORT_NAME, CONFIDENTIAL_LABEL, ...(ctx.month ? [ctx.month] : [])];
  return (
    <section
      className={cn(styles.page, styles.dark)}
      data-pdf-page={page.number}
      data-kind={page.kind}
      data-section={page.section}
      data-label={page.label}
      data-dark="true"
    >
      <div className={styles.body}>
        <div className={styles.back}>
          <svg className={styles.backRings} viewBox="0 0 900 900" aria-hidden="true">
            {[220, 320, 420].map((r) => (
              <circle key={r} cx={450} cy={450} r={r} fill="none" stroke="var(--pdf-dark-line)" />
            ))}
          </svg>
          <NuaveLogo className={styles.backLogo} />
          <T role="label">{BACK_COVER.site}</T>
          <T role="statement">{BACK_COVER.sentence}</T>
        </div>
      </div>
      <footer className={cn(styles.foot, styles.backFoot)}>
        <span className={styles.footParts}>
          {parts.map((part, i) => (
            <span key={i} className={styles.footParts}>
              {i > 0 ? (
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
              ) : null}
              <T role="footer" as="span">
                {part}
              </T>
            </span>
          ))}
        </span>
      </footer>
    </section>
  );
}

/* ------------------------------ the PDF ------------------------------ */

function PageView({ page, ctx }: { page: PdfPage; ctx: Context }) {
  switch (page.kind) {
    case "sampul":
      return <CoverPage page={page} ctx={ctx} />;
    case "daftar_isi":
      return <ContentsPage page={page} ctx={ctx} />;
    case "cara_membaca":
      return <HowToReadPage page={page} ctx={ctx} />;
    case "divider":
      return <DividerPage page={page} ctx={ctx} />;
    case "penutup":
      return <ClosingPage page={page} ctx={ctx} />;
    case "sampul_belakang":
      return <BackCoverPage page={page} ctx={ctx} />;
    default:
      // Not reachable: the page list holds only built templates.
      return null;
  }
}

export default function DesignedReport({ data }: { data: SavedReportData }) {
  const [ready, setReady] = useState<"fonts" | "ready" | "failed">("fonts");
  useEffect(() => {
    let live = true;
    // F-08: the data has arrived (this body renders only with it); now the
    // fonts. A failed font keeps the marker unset (Q-9).
    pdfFontsReady(document.fonts, PDF_FAMILIES).then(
      (ok) => live && setReady(ok ? "ready" : "failed"),
      () => live && setReady("failed"),
    );
    return () => {
      live = false;
    };
  }, []);
  const ctx = useMemo((): Context => {
    const two = twoSourceView(data.report);
    const input = { ...data.report, two_source: two } as PageListInput;
    const at = two.checked_to ?? two.checked_from;
    return {
      two,
      name: data.context.identity.name.trim() || subjectNoun(two.subject),
      month: at ? monthYear.format(new Date(at)) : null,
      pages: reportPdfPages(input).pages,
      data,
    };
  }, [data]);
  return (
    <main
      lang="id"
      className={cn("report-pdf", FONT_VARIABLES, styles.doc)}
      data-saved-report={ready === "ready" ? "ready" : "preparing"}
      data-pdf-fonts={ready}
      data-pdf-pages={ctx.pages.length}
    >
      {ctx.pages.map((page) => (
        <PageView key={page.number} page={page} ctx={ctx} />
      ))}
    </main>
  );
}
