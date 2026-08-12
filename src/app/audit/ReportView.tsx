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
import styles from "./audit.module.css";

function resultLabel(detail: ReportDetail) {
  if (detail.run === "failed") return "Test could not run";
  if (detail.appearance === "absent") return "Not named";
  if (detail.comparison === "client_preferred")
    return "Preferred in this comparison";
  if (detail.comparison === "competitor_preferred")
    return "Another provider was preferred";
  if (detail.comparison === "compared_no_preference")
    return "Compared without a preference";
  if (detail.recommendation === "recommended") return "Recommended";
  if (detail.information === "conflicting") return "Conflicting information";
  if (detail.information === "incomplete") return "Missing information";
  return "Named, not recommended";
}

const reportCategoryLabels: Record<string, string> = {
  need_discovery: "Customer need",
  solution_discovery: "Provider options",
  comparison: "Comparison",
  validation: "Business facts",
  action: "Next step",
};

const ownerLabels: Record<string, string> = {
  business_owner: "Business owner",
  admin: "Admin",
  marketing: "Marketing",
  web_developer: "Web developer",
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
        <h4>What happened</h4>
        <p>{detail.finding}</p>
      </div>
      <div>
        <h4>Question asked</h4>
        <blockquote>{observation?.question}</blockquote>
      </div>
      <div>
        <h4>What the AI said</h4>
        <blockquote>
          {detail.answer_excerpt || "No answer was available."}
        </blockquote>
      </div>
      <div>
        <h4>What it means</h4>
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
        Checked{" "}
        {observation
          ? new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(observation.observed_at))
          : "at an unknown time"}
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
      ? "No clear issues found"
      : report.accuracy_status === "needs_confirmation"
        ? "Needs confirmation"
        : report.accuracy_status === "needs_correction"
          ? "Needs correction"
          : "Could not assess";

  return (
    <div className={styles.reportWrap}>
      <div className={`${styles.reportToolbar} ${styles.noPrint}`}>
        <Button variant="ghost" size="sm" onPress={onDownloadJson}>
          <IconDownload /> Download JSON
        </Button>
      </div>
      <article className={styles.report}>
        {previewNotice ? previewNotice : null}
        <header className={styles.reportHero} id="stage-5" tabIndex={-1}>
          <div className={styles.reportTitleBlock}>
            <p className={styles.reportEyebrow}>AI Visibility Report</p>
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
              <small>Prepared by</small>
              <strong>{brief.agency_name || "Nuave"}</strong>
            </div>
          </div>
          <Separator className={styles.heroRule} />
          <dl className={styles.scopeGrid}>
            <div>
              <dt>Audit date</dt>
              <dd>
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(report.generated_at))}
              </dd>
            </div>
            <div>
              <dt>Questions checked</dt>
              <dd>{observations.length} independent questions</dd>
            </div>
          </dl>
          <nav className={styles.reportContents} aria-label="Report contents">
            <span>In this report</span>
            <ol>
              <li>
                <a href="#summary">Main result</a>
              </li>
              <li>
                <a href="#findings">Key findings</a>
              </li>
              <li>
                <a href="#priorities">What to do next</a>
              </li>
              <li>
                <a href="#detail">Test-by-test results</a>
              </li>
              <li>
                <a href="#method">How this audit works</a>
              </li>
            </ol>
          </nav>
        </header>

        <section className={styles.reportSection} id="summary">
          <SectionHeading number="01">Main Result</SectionHeading>
          <div className={styles.resultGrid}>
            <div className={styles.mainResult}>
              <strong>{report.counts.unbranded_recommended}</strong>
              <span>{report.facts.discovery.recommendation_label}</span>
            </div>
            <div>
              <strong>{report.counts.unbranded_mentioned}</strong>
              <span>{report.facts.discovery.mention_label}</span>
            </div>
            <div>
              <strong>
                {report.counts.branded_recognized}/{report.counts.branded_total}
              </strong>
              <span>{report.facts.recognition.label}</span>
            </div>
            <div>
              <strong>{report.counts.failed}</strong>
              <span>{report.facts.coverage.label}</span>
            </div>
          </div>
          <div className={styles.executiveTakeaway}>
            <p>What this means</p>
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
                Public information: {accuracyLabel}
              </Chip>
            </div>
          </div>
          <Alert
            status="warning"
            className={`${styles.snapshotAlert} ${styles.editorialAlert}`}
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>This result can change</Alert.Title>
              <Alert.Description>
                This report shows ten AI answers from the date above. A
                different model, date, location, or conversation may return
                different answers.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <section className={styles.reportSection} id="findings">
          <SectionHeading number="02">Key Findings</SectionHeading>
          <ol className={styles.findings}>
            {report.key_findings.map((finding, index) => (
              <li key={finding.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.explanation}</p>
                </div>
                <small>
                  Based on tests:{" "}
                  {testReferences(finding.evidence_prompt_ids, testNumberById)}
                </small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.reportSection} id="priorities">
          <SectionHeading number="03">What to Do Next</SectionHeading>
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
                      {priority.timing === "do_first" ? "Do first" : "Do next"}
                    </Chip>
                  </div>
                  <h3>{priority.action}</h3>
                  <dl>
                    <div>
                      <dt>Why</dt>
                      <dd>{priority.why}</dd>
                    </div>
                    <div>
                      <dt>Based on</dt>
                      <dd>
                        {priority.basis} Tests{" "}
                        {testReferences(
                          priority.evidence_prompt_ids,
                          testNumberById,
                        )}
                        .
                      </dd>
                    </div>
                    <div>
                      <dt>Who should do this</dt>
                      <dd>{ownerLabels[priority.owner]}</dd>
                    </div>
                    <div>
                      <dt>You’re done when</dt>
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
          <SectionHeading number="04">Test-by-Test Results</SectionHeading>
          <p className={styles.sectionLead}>
            Open a test to see the question, exact answer excerpt, sources, and
            time checked.
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
                            : "Test"}
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
                          : "Test"}
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
          <SectionHeading number="05">How This Audit Works</SectionHeading>
          <div className={styles.methodGrid}>
            <p>{report.method_summary}</p>
            <ul className={styles.methodList}>
              <li>
                The evidence export keeps each question, full answer, source,
                time, model, and result.
              </li>
              <li>
                The API is not the consumer ChatGPT app. Answers can change by
                model, time, location, and conversation.
              </li>
              <li>
                A mention is not a recommendation. A failed test is not a
                negative result.
              </li>
              <li>
                This report shows what happened in this test. It does not prove
                cause or guarantee future recommendations.
              </li>
            </ul>
          </div>
          <Alert status="accent" className={styles.editorialAlert}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Use this report to choose one next step</Alert.Title>
              <Alert.Description>
                Check the public information first. Then make one useful change
                and repeat the same test.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </section>

        <footer className={styles.reportFooter}>
          <span>{brief.brand_name}</span>
          <span>Nuave AI Visibility Audit</span>
          <span>
            {new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(
              new Date(report.generated_at),
            )}
          </span>
        </footer>
      </article>
    </div>
  );
}
