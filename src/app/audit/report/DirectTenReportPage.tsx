"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { IconCheck, IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Art } from "@/components/product/journey/Art";
import { SUPPORT_EMAIL } from "@/components/product/journey/JourneyBars";
import { NuaveLogo } from "@/components/product/journey/NuaveLogo";
import { motionAllowedNow } from "@/components/motion/useMotionAllowed";
import {
  contextMarketLabel,
  type DirectTenAuditContext,
} from "@/lib/audit/direct-ten-context-v2";
import { buildReportPresentation } from "@/lib/audit/report-presentation";
import type { AuditObservation, AuditReport } from "@/lib/audit/types";
import { cn } from "@/lib/utils";
import { formatObservationWindow, observationWindow } from "./report-header";
import { DirectTenReportBody } from "./DirectTenReportBody";
import { TwoSourceReportPage } from "./TwoSourceReport";
import type { DownloadPdf } from "./report-pdf";
import auditStyles from "../audit.module.css";

const CONTENTS = [
  ["summary", "Hasil singkat"],
  ["detail", "Jawaban model AI"],
  ["findings", "Analisis Nuave"],
  ["priorities", "Yang dapat dilakukan"],
  ["method", "Tentang audit ini"],
] as const;

type SectionId = (typeof CONTENTS)[number][0];

/** The contents chips follow the reader down the report (scrollspy). */
function useActiveSection(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = useState<SectionId>("summary");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = CONTENTS.map(([id]) => document.getElementById(id)).filter(
      (section): section is HTMLElement => section !== null,
    );
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = CONTENTS.find(([id]) => visible.has(id));
        if (first) setActive(first[0]);
      },
      // A section counts once it reaches the band under the sticky bars.
      { rootMargin: "-140px 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return [active, setActive];
}

/**
 * J32–J35: the private report as one scrolling page. The bar with Download
 * PDF and the contents chips stay at the top; the body is evidence first
 * (the counts, then every answer in full), then Nuave's reading, the actions
 * and how the audit was run. The business name is marked inside the answers.
 */
export function DirectTenReportPage(props: {
  report: AuditReport;
  brief: DirectTenAuditContext;
  observations: AuditObservation[];
  onDownloadJson: () => void;
  previewNotice?: ReactNode;
  onDownloadPdf?: DownloadPdf;
}) {
  // Spec 021: two-source reports use the new layout; reports saved before
  // Spec 018 keep this file's renderer exactly as it was.
  if (props.report.two_source) return <TwoSourceReportPage {...props} />;
  return <LegacyReportPage {...props} />;
}

function LegacyReportPage({
  report,
  brief,
  observations,
  onDownloadJson,
  previewNotice,
}: {
  report: AuditReport;
  brief: DirectTenAuditContext;
  observations: AuditObservation[];
  onDownloadJson: () => void;
  previewNotice?: ReactNode;
}) {
  const [active, setActive] = useActiveSection();
  const chips = useRef<HTMLOListElement>(null);
  const brandName = brief.identity.name;
  const scopeLabel =
    brief.focus.value.kind === "brand"
      ? `Seluruh brand ${brandName}`
      : brief.focus.value.kind === "produk"
        ? `Produk atau layanan: ${brief.focus.value.name}`
        : `Lokasi: ${brief.focus.value.name} (${brief.focus.value.address})`;
  const marketLabel = contextMarketLabel(brief);
  // Spec 012 R-12: header facts come only from the same validated retained
  // answers the body renders; invalid bindings show no invented date.
  const presentation = buildReportPresentation(report, observations);
  const readyAnswers =
    presentation.status === "ready" ? presentation.answers : null;
  const observedWindow = readyAnswers
    ? observationWindow(readyAnswers.map((answer) => answer.observedAt))
    : null;
  const distinct = (values: string[]) => [...new Set(values)].join(", ");

  // Keep the active chip in view inside the chip row (never the page).
  useEffect(() => {
    const row = chips.current;
    const chip = row?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!row || !chip) return;
    const left = chip.offsetLeft - 24;
    if (typeof row.scrollTo === "function")
      row.scrollTo({ left, behavior: motionAllowedNow() ? "smooth" : "auto" });
  }, [active]);

  const print = () => window.print();

  return (
    <div className="min-h-svh bg-white">
      <div
        className={cn(
          "sticky top-0 z-30 bg-white/95 backdrop-blur-sm",
          auditStyles.noPrint,
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-[680px] items-center justify-between gap-3 px-6">
          <Link href="/" aria-label="Nuave, ke beranda" className="flex">
            <NuaveLogo className="h-[25px] w-auto" />
          </Link>
          <Button
            type="button"
            variant="ink"
            size="sm"
            className="rounded-chip px-4"
            onClick={print}
          >
            <IconDownload aria-hidden="true" />
            Download PDF
          </Button>
        </div>
      </div>
      <article className="mx-auto w-full max-w-[680px] px-6 pb-14">
        {previewNotice ? <div className="pt-4">{previewNotice}</div> : null}
        <header className="grid gap-4 pt-[18px]" id="stage-5" tabIndex={-1}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <p className="type-label-sm-strong col-start-1 row-start-1 m-0 text-ember-700">
              AI Visibility Report
            </p>
            <h1 className="type-heading-xl col-start-1 row-start-2 m-0 break-words text-ink-900">
              {brandName}
            </h1>
            <Art
              name="kedaiBusy"
              width={89}
              className="col-start-2 row-span-2 row-start-1"
            />
            <p className="type-copy-sm col-span-2 row-start-3 m-0 mt-1.5 text-ink-600">
              {scopeLabel}
              {marketLabel ? ` · ${marketLabel}` : ""}
            </p>
          </div>
          <dl
            className="m-0 grid grid-cols-2 gap-y-3 rounded-tile border border-line-200 px-4 py-3.5 [&>div]:grid [&>div]:content-start [&>div]:gap-[3px] [&>div:nth-child(even)]:border-l [&>div:nth-child(even)]:border-line-200 [&>div:nth-child(even)]:pl-3.5 [&>div:nth-child(odd)]:pr-3.5"
            data-report-header-facts
          >
            <div>
              <dt className="type-caption text-ink-500">Tanggal pengamatan</dt>
              <dd className="type-label m-0 text-ink-900">
                {observedWindow ? (
                  <time dateTime={observedWindow.start}>
                    {formatObservationWindow(observedWindow)}
                  </time>
                ) : (
                  "Tidak tersedia"
                )}
              </dd>
            </div>
            <div>
              <dt className="type-caption text-ink-500">
                Pertanyaan yang diperiksa
              </dt>
              <dd className="type-label m-0 text-ink-900">
                {observations.length} pertanyaan independen
              </dd>
            </div>
            {readyAnswers ? (
              <>
                <div>
                  <dt className="type-caption text-ink-500">
                    Sistem yang diuji
                  </dt>
                  <dd className="type-label m-0 text-ink-900">
                    {distinct(readyAnswers.map((answer) => answer.system))}
                  </dd>
                </div>
                <div>
                  <dt className="type-caption text-ink-500">Model jawaban</dt>
                  <dd className="type-label m-0 text-ink-900">
                    {distinct(
                      readyAnswers.map((answer) => answer.returnedModel),
                    )}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </header>
        <p
          className={cn(
            "type-label-sm-strong m-0 mt-6 text-ink-500",
            auditStyles.noPrint,
          )}
          aria-hidden="true"
        >
          Isi laporan
        </p>
        <nav
          aria-label="Report contents"
          className={cn(
            "sticky top-14 z-20 -mx-6 bg-white/95 py-2 backdrop-blur-sm",
            auditStyles.noPrint,
          )}
        >
          <ol
            ref={chips}
            className="m-0 flex list-none gap-2 overflow-x-auto px-6 [scrollbar-width:none]"
          >
            {CONTENTS.map(([id, label]) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  data-chip={id}
                  aria-current={active === id ? "true" : undefined}
                  className={cn(
                    "type-label-lg inline-flex h-11 items-center gap-2 rounded-[22px] border px-[18px] whitespace-nowrap no-underline transition-[background-color,border-color,color] duration-200",
                    active === id
                      ? "border-ink-900 bg-ink-900 pl-3.5 text-white"
                      : "border-line-300 bg-white text-ink-900 hover:border-ink-400",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    const section = document.getElementById(id);
                    if (!section) return;
                    setActive(id);
                    section.tabIndex = -1;
                    section.focus({ preventScroll: true });
                    section.scrollIntoView({
                      block: "start",
                      behavior: motionAllowedNow() ? "smooth" : "auto",
                    });
                  }}
                >
                  {active === id ? (
                    <IconCheck size={18} stroke={2.25} aria-hidden="true" />
                  ) : null}
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <DirectTenReportBody
          report={report}
          observations={observations}
          names={[brandName, ...brief.identity.aliases]}
        />
        <div
          className={cn("grid gap-2.5 pt-4 text-center", auditStyles.noPrint)}
        >
          <Button
            type="button"
            variant="ink"
            size="xl"
            className="w-full"
            onClick={print}
          >
            Download PDF
          </Button>
          <Button
            type="button"
            variant="inkLink"
            size="touch"
            onClick={onDownloadJson}
          >
            Unduh bukti JSON
          </Button>
          <p className="type-caption m-0 text-ink-500">
            Butuh bantuan? {SUPPORT_EMAIL}
          </p>
        </div>
        <footer className="type-caption mt-10 flex justify-between gap-3 border-t border-line-200 pt-4 text-ink-500">
          <span>{brandName}</span>
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
