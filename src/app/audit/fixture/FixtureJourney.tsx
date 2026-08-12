"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  clearFixtureJourneySession,
  freshFixtureJourneyState,
  loadFixtureJourneyState,
  saveFixtureJourneyState,
  type FixtureJourneyState,
  type FixtureJourneyStage,
} from "@/lib/fixture-journey/state";
import {
  fixtureJourneyContext,
  questionClassExplanations,
} from "@/lib/fixture-journey/adapter";
import {
  FIXTURE_PROCESSING_WORK_STAGE_COUNT,
  fixtureProcessingStages,
  processingStageDurationMs,
} from "@/lib/fixture-journey/processing";
import {
  FixtureJourneyReportError,
  buildFixtureEvidenceExport,
  constructFixtureReport,
} from "@/lib/fixture-journey/report";
import {
  GOLDEN_REPORT_SECTIONS,
  goldenBrief,
  goldenObservations,
} from "@/lib/audit/fixtures/report-golden";
import type { AuditReport } from "@/lib/audit/types";
import ReportView from "../ReportView";
import styles from "./fixture.module.css";

const { business, contact, questions, summary } = fixtureJourneyContext;

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

/**
 * Persistent fixture-preview disclosure. Rendered on every journey screen so
 * the fictional business, simulated processing, and no-payment facts are
 * visible without opening any secondary help.
 */
function PreviewNotice() {
  return (
    <aside
      className={styles.previewNotice}
      aria-label="Fictional preview notice"
    >
      <strong>Fictional preview.</strong>
      <span>
        {business.name} and its results are fictional. The AI processing is
        simulated, no payment is taken, and this is not a delivered customer
        audit.
      </span>
    </aside>
  );
}

/**
 * The same disclosure rendered inside the report article so printed and
 * saved PDF output retains it.
 */
function ReportPreviewNotice() {
  return (
    <div
      className={styles.reportPreviewNotice}
      role="note"
      aria-label="Fictional preview notice"
    >
      <strong>Fictional preview.</strong>
      <span>
        {business.name} and its results are fictional, the AI processing is
        simulated, no payment is taken, and this is not a delivered customer
        audit. This example report exists only in this tab&apos;s session.
      </span>
    </div>
  );
}

function DraftScreen({
  headingRef,
  onStart,
}: {
  headingRef: HeadingRef;
  onStart: () => void;
}) {
  return (
    <section aria-labelledby="fixture-intake-heading">
      <p className={styles.eyebrow}>Example intake · Step 1 of 6</p>
      <h1
        id="fixture-intake-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Start with the fixed example business
      </h1>
      <p className={styles.lede}>
        In the real journey, a customer would enter their official website,
        business name, location or service area, a delivery email, and consent
        to use their public sources. This preview uses one fixed fictional
        business instead, so nothing is submitted and no data is collected.
      </p>

      <section
        className={styles.card}
        aria-labelledby="example-business-heading"
      >
        <h2 id="example-business-heading" className={styles.cardTitle}>
          The example business
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Business name</dt>
            <dd className={styles.factValue}>{business.name}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Business scope</dt>
            <dd className={styles.factValue}>{business.entityScope}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Category</dt>
            <dd className={styles.factValue}>{business.category}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Market or location</dt>
            <dd className={styles.factValue}>{business.marketContext}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Official website</dt>
            <dd className={styles.factValue}>
              <code>{contact.website}</code>
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Example contact</dt>
            <dd className={styles.factValue}>
              <code>{contact.email}</code>
              <span className={styles.factSub}>
                Fictional contact context on the reserved .example domain.
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="future-intake-heading">
        <h2 id="future-intake-heading" className={styles.cardTitle}>
          What a real intake will collect
        </h2>
        <p className={styles.note}>
          Official website or authoritative public profile · business name ·
          city, branch, or service area · delivery email · consent to use the
          submitted public sources. None of these are accepted in this preview.
        </p>
      </section>

      <div className={styles.actionArea}>
        <div className={styles.actionsRow}>
          <p className={styles.actionHint}>
            No arbitrary URL, business name, or email can be entered here.
          </p>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onStart}
          >
            Start the example preview
          </button>
        </div>
      </div>
    </section>
  );
}

function FactsScreen({
  headingRef,
  factsConfirmed,
  onContinue,
  onBack,
}: {
  headingRef: HeadingRef;
  factsConfirmed: boolean;
  onContinue: (checked: boolean) => void;
  onBack: () => void;
}) {
  // Local UI state only: the box starts checked when the facts were already
  // confirmed earlier in this preview (backward navigation keeps the
  // confirmation). The persisted confirmation itself lives in the journey
  // state, not here.
  const [checked, setChecked] = useState(factsConfirmed);

  return (
    <section aria-labelledby="fixture-facts-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Back to example intake
        </button>
      </div>
      <p className={styles.eyebrow}>Facts ready · Step 2 of 6</p>
      <h1
        id="fixture-facts-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Review the example facts before continuing
      </h1>
      <p className={styles.lede}>
        These facts come from the fictional fixture and are read-only in this
        preview. In the real journey, the customer would confirm or correct them
        before the audit runs.
      </p>

      <section
        className={styles.card}
        aria-labelledby="fixture-facts-list-heading"
      >
        <h2 id="fixture-facts-list-heading" className={styles.cardTitle}>
          {business.name} — fixture facts
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Business name</dt>
            <dd className={styles.factValue}>{business.name}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Exact business scope</dt>
            <dd className={styles.factValue}>{business.entityScope}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Category</dt>
            <dd className={styles.factValue}>{business.category}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Target customer</dt>
            <dd className={styles.factValue}>{business.targetCustomer}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Priority service</dt>
            <dd className={styles.factValue}>{business.priorityOffering}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Market or location</dt>
            <dd className={styles.factValue}>{business.marketContext}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Official source</dt>
            <dd className={styles.factValue}>
              <code>{contact.website}</code>
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Known name variant</dt>
            <dd className={styles.factValue}>
              {business.nameVariants.length
                ? business.nameVariants.join(", ")
                : "None listed"}
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Verified competitor</dt>
            <dd className={styles.factValue}>
              {business.competitor.name} ({business.competitor.scope})
              <span className={styles.factSub}>
                Source: <code>{business.competitor.sourceUrl}</code>
              </span>
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Accuracy question</dt>
            <dd className={styles.factValue}>
              {business.accuracyQuestions.length
                ? business.accuracyQuestions.join(" · ")
                : "None listed"}
            </dd>
          </div>
        </dl>
      </section>

      <div className={styles.actionArea}>
        <label className={styles.confirmRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>I have reviewed the example facts shown above.</span>
        </label>
        <div className={styles.actionsRow}>
          <p className={styles.actionHint}>
            Facts are read-only in this preview. Confirming them locks the
            example business for the ten questions that follow.
          </p>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => onContinue(checked)}
          >
            Continue to the ten questions
          </button>
        </div>
      </div>
      {factsConfirmed ? (
        <p className={styles.note}>
          ✓ Example facts confirmed earlier in this preview.
        </p>
      ) : null}
    </section>
  );
}

function QuestionsScreen({
  headingRef,
  questionsApproved,
  onApprove,
  onBack,
}: {
  headingRef: HeadingRef;
  questionsApproved: boolean;
  onApprove: (checked: boolean) => void;
  onBack: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <section aria-labelledby="fixture-questions-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Back to example facts
        </button>
      </div>
      <p className={styles.eyebrow}>Questions ready · Step 3 of 6</p>
      <h1
        id="fixture-questions-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Review the ten example questions
      </h1>
      <p className={styles.lede}>
        These are the fictional fixture&apos;s ten questions in their original
        order. In the real journey, the customer would review and approve the
        pack before the audit runs. The questions are read-only in this preview.
      </p>

      <div className={styles.classCards}>
        <section className={styles.classCard}>
          <h2>{questionClassExplanations.unbranded.label} · 5</h2>
          <p>{questionClassExplanations.unbranded.detail}</p>
        </section>
        <section className={styles.classCard}>
          <h2>{questionClassExplanations.branded.label} · 5</h2>
          <p>{questionClassExplanations.branded.detail}</p>
        </section>
      </div>

      <ol className={styles.questionList}>
        {questions.all.map((prompt, index) => (
          <li key={prompt.prompt_id} className={styles.questionItem}>
            <span className={styles.questionNumber} aria-hidden="true">
              {index + 1}
            </span>
            <div className={styles.questionBody}>
              <p className={styles.questionText}>{prompt.question}</p>
              <span className={styles.questionChip}>
                {prompt.branded
                  ? "Named business — with the business name"
                  : "Discovery — without the business name"}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {questionsApproved ? (
        <div className={styles.approvedPanel} role="status">
          <strong>Pack approved.</strong>
          <span>
            The ten example questions are now locked for the simulated run. The
            scope summary and simulated checkout come next; nothing has been
            processed and no payment is involved.
          </span>
        </div>
      ) : (
        <div className={styles.actionArea}>
          <label className={styles.confirmRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>I approve these ten questions for the simulated run.</span>
          </label>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Approving locks the pack for the simulated run. The questions stay
              exactly as shown above.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => onApprove(checked)}
            >
              Approve the question pack
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryScreen({
  headingRef,
  checkoutComplete,
  onSimulatePayment,
  onContinueAfterPayment,
  onBack,
}: {
  headingRef: HeadingRef;
  checkoutComplete: boolean;
  onSimulatePayment: () => void;
  onContinueAfterPayment: () => void;
  onBack: () => void;
}) {
  return (
    <section aria-labelledby="fixture-summary-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Back to the ten questions
        </button>
      </div>
      <p className={styles.eyebrow}>Scope review · Step 4 of 6</p>
      <h1
        id="fixture-summary-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Review the example scope
      </h1>
      <p className={styles.lede}>
        This summary repeats exactly what the preview locked in: the fictional
        business, the ten approved questions, and what the example run would do.
        Nothing here is a real order.
      </p>

      <section className={styles.card} aria-labelledby="order-summary-heading">
        <h2 id="order-summary-heading" className={styles.cardTitle}>
          Example scope
        </h2>
        <dl className={styles.factList}>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Business</dt>
            <dd className={styles.factValue}>{business.entityScope}</dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Questions</dt>
            <dd className={styles.factValue}>
              {summary.questionCount} approved questions —{" "}
              {questions.unbranded.length} discovery and{" "}
              {questions.branded.length} named-business
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Execution surface</dt>
            <dd className={styles.factValue}>
              The {summary.questionCount} fixture questions, run one at a time
              through the {summary.executionSurface.system} surface recorded in
              the golden fixture, with fictional model names (
              {summary.executionSurface.models.join(", ")}) and responses.
              Nothing executes live.
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>Example report</dt>
            <dd className={styles.factValue}>
              One five-section example report:{" "}
              {GOLDEN_REPORT_SECTIONS.join(", ")}. It keeps the fixture&apos;s
              exact evidence and one failed test.
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="limitation-heading">
        <h2 id="limitation-heading" className={styles.cardTitle}>
          Preview limitation
        </h2>
        <p className={styles.note}>
          The example report is not a real audit result, is not private, and is
          not hosted. It exists only in this browser tab&apos;s session and is
          not delivered to anyone. This preview makes no delivery, privacy,
          remedy, or commercial promise.
        </p>
      </section>

      <div className={styles.checkoutPanel} aria-labelledby="checkout-heading">
        <h2 id="checkout-heading" className={styles.checkoutHeading}>
          Simulated checkout
        </h2>
        <p className={styles.checkoutPhrase}>
          Simulasi pembayaran — tidak ada tagihan.
        </p>
        <p className={styles.checkoutExplanation}>
          Simulated payment — no charge. No card, no amount, no receipt, and no
          real order are involved. This preview shows no price.
        </p>
      </div>

      <div className={styles.actionArea}>
        {checkoutComplete ? (
          <>
            <p className={styles.note}>
              ✓ Simulated payment completed earlier in this preview. No charge
              was made.
            </p>
            <div className={styles.actionsRow}>
              <p className={styles.actionHint}>
                The simulated checkout is already done; continue to the
                simulated run.
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onContinueAfterPayment}
              >
                Continue to the simulated run
              </button>
            </div>
          </>
        ) : (
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Completing this step only marks the checkout as simulated in this
              tab&apos;s session. Nothing is charged and nothing is created.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onSimulatePayment}
            >
              Simulate payment — no charge
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PaidScreen({
  headingRef,
  onStartProcessing,
  onBack,
}: {
  headingRef: HeadingRef;
  onStartProcessing: () => void;
  onBack: () => void;
}) {
  return (
    <section aria-labelledby="fixture-paid-heading">
      <div className={styles.backRow}>
        <button type="button" className={styles.ghostAction} onClick={onBack}>
          ← Back to the scope review
        </button>
      </div>
      <p className={styles.eyebrow}>Simulated payment · Step 5 of 6</p>
      <h1
        id="fixture-paid-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Simulated payment complete
      </h1>
      <div className={styles.approvedPanel} role="status">
        <strong>No charge, no receipt, no order.</strong>
        <span>
          This preview only marked the checkout as simulated in this tab&apos;s
          session. No payment was taken, no receipt was created, and no real
          order or entitlement exists.
        </span>
      </div>
      <p className={styles.lede}>
        The simulated run advances through five bounded stages and builds the
        example report from the fixture. Nothing runs in the background until
        you start it, and nothing continues after this tab closes.
      </p>
      <div className={styles.actionArea}>
        <div className={styles.actionsRow}>
          <p className={styles.actionHint}>
            Starting the run never contacts a provider or the live audit API. It
            is a local simulation.
          </p>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onStartProcessing}
          >
            Start the simulated run
          </button>
        </div>
      </div>
    </section>
  );
}

function ProcessingScreen({
  headingRef,
  processingStage,
  interrupted,
  onResume,
  onStartOver,
}: {
  headingRef: HeadingRef;
  processingStage: number;
  interrupted: boolean;
  onResume: () => void;
  onStartOver: () => void;
}) {
  const current = fixtureProcessingStages[processingStage];
  return (
    <section aria-labelledby="fixture-processing-heading">
      <p className={styles.eyebrow}>Simulated run · Step 6 of 6</p>
      <h1
        id="fixture-processing-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Simulated processing
      </h1>
      <div className={styles.simulationNotice} role="status">
        <strong>This is a simulation.</strong>
        <span>
          No provider, model, search, or payment service is contacted. The run
          advances only while this tab is open; closing the tab stops it and
          nothing continues in the background.
        </span>
      </div>
      {interrupted ? (
        <div className={styles.interruptedNotice} role="status">
          <strong>The simulation stopped.</strong>
          <span>
            It stopped when the page was closed or refreshed. No background work
            continued, and nothing runs while you are away. Choose Resume to
            continue from the stage shown, or start over.
          </span>
        </div>
      ) : null}
      <p className={styles.lede} aria-live="polite">
        Simulation status:{" "}
        {interrupted
          ? `paused at ${current.label.toLowerCase()}`
          : current.label.toLowerCase()}
        .
      </p>
      <ol className={styles.processingList}>
        {fixtureProcessingStages.map((stage, index) => {
          const done = index < processingStage;
          const active = index === processingStage;
          return (
            <li
              key={stage.id}
              className={`${styles.processingItem} ${
                active ? styles.processingItemActive : ""
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className={styles.processingMarker} aria-hidden="true">
                {done ? "✓" : index + 1}
              </span>
              <span className={styles.processingLabel}>{stage.label}</span>
              {active ? (
                <span
                  className={
                    interrupted ? styles.processingPaused : styles.processingNow
                  }
                >
                  {interrupted ? "paused" : "in progress"}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {interrupted ? (
        <div className={styles.actionArea}>
          <div className={styles.actionsRow}>
            <p className={styles.actionHint}>
              Resuming continues the simulation from the stage shown. Nothing
              was executed while you were away.
            </p>
            <span className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onResume}
              >
                Resume simulated run
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={onStartOver}
              >
                Start over
              </button>
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.note}>
          This preview shows honest, bounded progress. It does not claim to show
          live per-question answers, and it does not pretend a provider is
          responding.
        </p>
      )}
    </section>
  );
}

function ReadyScreen({
  headingRef,
  report,
  reportConstructionFailed,
  retryError,
  retryErrorRef,
  onRetryReport,
  onStartOver,
  onDownloadJson,
}: {
  headingRef: HeadingRef;
  report: AuditReport | null;
  reportConstructionFailed: boolean;
  retryError: string;
  retryErrorRef: React.RefObject<HTMLParagraphElement | null>;
  onRetryReport: () => void;
  onStartOver: () => void;
  onDownloadJson: () => void;
}) {
  // The construction-failure state is terminal and truthful: no run summary,
  // no "Report ready" check, and no claim that an example report exists.
  if (reportConstructionFailed) {
    return (
      <section aria-labelledby="fixture-failure-heading">
        <p className={styles.eyebrow}>Example report · Step 6 of 6</p>
        <h1
          id="fixture-failure-heading"
          className={styles.heading}
          tabIndex={-1}
          ref={headingRef}
        >
          The example report could not be built
        </h1>
        <div className={styles.terminalError} role="alert">
          <h2>Example report construction failed</h2>
          <p>
            The local fixture construction failed, so no example report became
            ready. No live audit call was made, and none will be made as part of
            this preview. You can retry the local construction or start over.
          </p>
          {retryError ? (
            <p
              id="fixture-retry-error"
              className={styles.retryError}
              role="alert"
              tabIndex={-1}
              ref={retryErrorRef}
            >
              {retryError}
            </p>
          ) : null}
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onRetryReport}
            >
              Retry building the example report
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={onStartOver}
            >
              Start over
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="fixture-ready-heading">
      <p className={styles.eyebrow}>Example report · Step 6 of 6</p>
      <h1
        id="fixture-ready-heading"
        className={styles.heading}
        tabIndex={-1}
        ref={headingRef}
      >
        Example report — fictional preview
      </h1>
      <div className={styles.runSummary} aria-labelledby="run-summary-heading">
        <h2 id="run-summary-heading" className={styles.cardTitle}>
          Simulated run completed
        </h2>
        <ol className={styles.runSummaryList}>
          {fixtureProcessingStages.map((stage) => (
            <li key={stage.id}>
              <span aria-hidden="true">✓</span>
              {stage.label}
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.note}>
        This example report exists only in this browser tab&apos;s session. It
        is not hosted, private, or delivered. Refresh keeps this preview&apos;s
        progress; closing the tab removes it.
      </p>

      {report ? (
        <div className={styles.reportWorkspace}>
          <ReportView
            report={report}
            brief={goldenBrief}
            observations={goldenObservations}
            onDownloadJson={onDownloadJson}
            previewNotice={<ReportPreviewNotice />}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function FixtureJourney({
  forceReportFailure = false,
}: {
  /** Server-controlled test configuration; never customer-selectable. */
  forceReportFailure?: boolean;
}) {
  const [journey, setJourney] = useState<FixtureJourneyState>(
    freshFixtureJourneyState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [gateError, setGateError] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [interruptedRestore, setInterruptedRestore] = useState(false);
  // Read once during first render; the subscription below keeps it current.
  // Not rendered into JSX, so the SSR fallback never causes a hydration gap.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [fixtureReport, setFixtureReport] = useState<AuditReport | null>(null);
  const [retryError, setRetryError] = useState("");
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const retryErrorRef = useRef<HTMLParagraphElement | null>(null);

  // Restore the furthest valid fixture state from session storage. Invalid
  // or version-incompatible state is cleared and the journey starts over
  // with a visible explanation. A restored mid-processing state is paused:
  // the simulation stops when the page closes or refreshes and resumes only
  // after the reviewer explicitly chooses Resume. At the ready destination,
  // the example report is reconstructed locally from the same fixture
  // (deterministic except for the generated timestamp).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { state, reset } = loadFixtureJourneyState();
      setJourney(state);
      setResetNotice(reset);
      if (state.stage === "processing") {
        setInterruptedRestore(true);
      }
      if (state.stage === "ready" && !state.reportConstructionFailed) {
        try {
          setFixtureReport(
            constructFixtureReport(
              forceReportFailure ? { forceFailure: true } : {},
            ),
          );
        } catch (error) {
          if (error instanceof FixtureJourneyReportError) {
            setJourney((current) => ({
              ...current,
              reportConstructionFailed: true,
            }));
          } else {
            throw error;
          }
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [forceReportFailure]);

  // Persist only validated, version-compatible fixture state.
  useEffect(() => {
    if (!hydrated) return;
    saveFixtureJourneyState(journey);
  }, [hydrated, journey]);

  // Move focus to the stage heading and scroll to the top on stage change.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, journey.stage]);

  // Track the reduced-motion preference so the simulated run completes
  // near-immediately while still showing the same meaningful stage text.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Deterministic, bounded simulated processing. Each work stage advances on
  // a fixed timer; the final stage builds the example report locally. The
  // run never calls a provider and never continues after this component
  // unmounts (tab closed or journey reset). A restored mid-processing state
  // stays paused until the reviewer explicitly resumes it.
  useEffect(() => {
    if (journey.stage !== "processing") return;
    if (interruptedRestore) return;
    const duration = processingStageDurationMs(reducedMotion);
    const timer = window.setTimeout(() => {
      const nextStage = journey.processingStage + 1;
      if (nextStage < FIXTURE_PROCESSING_WORK_STAGE_COUNT) {
        setJourney((current) => ({ ...current, processingStage: nextStage }));
        return;
      }
      try {
        const report = constructFixtureReport(
          forceReportFailure ? { forceFailure: true } : {},
        );
        setFixtureReport(report);
        setJourney((current) => ({
          ...current,
          processingStage: FIXTURE_PROCESSING_WORK_STAGE_COUNT - 1,
          processingCompleted: true,
          stage: "ready",
        }));
      } catch (error) {
        if (error instanceof FixtureJourneyReportError) {
          setJourney((current) => ({
            ...current,
            processingStage: FIXTURE_PROCESSING_WORK_STAGE_COUNT - 1,
            processingCompleted: true,
            reportConstructionFailed: true,
            stage: "ready",
          }));
          return;
        }
        throw error;
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [
    journey.stage,
    journey.processingStage,
    reducedMotion,
    forceReportFailure,
    interruptedRestore,
  ]);

  function showGateError(message: string) {
    setGateError(message);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  }

  function goToStage(stage: FixtureJourneyStage) {
    setGateError("");
    setConfirmingReset(false);
    setJourney((current) => ({ ...current, stage }));
  }

  function startExample() {
    goToStage("facts");
  }

  function continueAfterFacts(checked: boolean) {
    if (!checked) {
      showGateError(
        "Review the example facts above and confirm them before continuing.",
      );
      return;
    }
    setJourney((current) => ({
      ...current,
      stage: "questions",
      factsConfirmed: true,
    }));
    setGateError("");
  }

  function approveQuestionPack(checked: boolean) {
    if (!checked) {
      showGateError(
        "Approve the ten example questions before locking the pack.",
      );
      return;
    }
    setJourney((current) => ({
      ...current,
      questionsApproved: true,
      stage: "summary",
    }));
    setGateError("");
  }

  function simulatePayment() {
    setJourney((current) => ({
      ...current,
      checkoutComplete: true,
      stage: "paid",
    }));
    setGateError("");
  }

  function startProcessing() {
    setJourney((current) => ({
      ...current,
      processingStage: 0,
      stage: "processing",
    }));
    setGateError("");
  }

  function retryReportConstruction() {
    try {
      const report = constructFixtureReport(
        forceReportFailure ? { forceFailure: true } : {},
      );
      setFixtureReport(report);
      setRetryError("");
      setJourney((current) => ({
        ...current,
        reportConstructionFailed: false,
      }));
    } catch (error) {
      if (error instanceof FixtureJourneyReportError) {
        // Perceivable feedback: the retry failed and construction is still
        // unavailable; the reviewer can retry again or start over.
        setRetryError(
          "The retry failed: the local fixture construction still cannot build the example report. You can retry again or start over.",
        );
        window.setTimeout(() => retryErrorRef.current?.focus(), 0);
        return;
      }
      throw error;
    }
  }

  function resumeSimulatedRun() {
    setInterruptedRestore(false);
    setGateError("");
  }

  function downloadExampleEvidenceJson() {
    if (!fixtureReport) return;
    const evidence = buildFixtureEvidenceExport(fixtureReport);
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "northstar-advisory-nuave-example-evidence.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function beginStartOver() {
    const hasProgress =
      journey.stage !== "draft" ||
      journey.factsConfirmed ||
      journey.questionsApproved ||
      journey.checkoutComplete ||
      journey.processingCompleted;
    if (hasProgress) {
      setConfirmingReset(true);
      return;
    }
    startOver();
  }

  function startOver() {
    clearFixtureJourneySession();
    setJourney(freshFixtureJourneyState());
    setFixtureReport(null);
    setRetryError("");
    setGateError("");
    setConfirmingReset(false);
    setResetNotice(false);
    setInterruptedRestore(false);
  }

  const stage = journey.stage;

  return (
    <main className={styles.shell} lang="en" data-theme="light">
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            N
          </span>
          Nuave — fictional preview
        </Link>
        <div className={styles.topActions}>
          {stage === "ready" &&
          fixtureReport &&
          !journey.reportConstructionFailed ? (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => window.print()}
            >
              Download PDF
            </button>
          ) : null}
          <button
            type="button"
            className={styles.ghostAction}
            onClick={beginStartOver}
          >
            Start over
          </button>
        </div>
      </header>

      {confirmingReset ? (
        <div className={styles.confirmBar} role="alert">
          <span>
            Start over returns the preview to the example intake and clears only
            this preview&apos;s saved progress.
          </span>
          <span className={styles.topActions}>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={startOver}
            >
              Confirm start over
            </button>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={() => setConfirmingReset(false)}
            >
              Keep preview
            </button>
          </span>
        </div>
      ) : null}

      <PreviewNotice />

      {resetNotice ? (
        <div className={styles.resetNotice} role="status">
          <strong>Preview reset.</strong>
          <span>
            The saved preview state was missing, stale, or invalid, so it was
            cleared. You are at the start of the example preview.
          </span>
        </div>
      ) : null}

      {gateError ? (
        <div
          id="fixture-gate-error"
          className={styles.gateError}
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {gateError}
        </div>
      ) : null}

      <div className={styles.workspace}>
        {stage === "draft" ? (
          <DraftScreen headingRef={headingRef} onStart={startExample} />
        ) : null}
        {stage === "facts" ? (
          <FactsScreen
            headingRef={headingRef}
            factsConfirmed={journey.factsConfirmed}
            onContinue={continueAfterFacts}
            onBack={() => goToStage("draft")}
          />
        ) : null}
        {stage === "questions" ? (
          <QuestionsScreen
            headingRef={headingRef}
            questionsApproved={journey.questionsApproved}
            onApprove={approveQuestionPack}
            onBack={() => goToStage("facts")}
          />
        ) : null}
        {stage === "summary" ? (
          <SummaryScreen
            headingRef={headingRef}
            checkoutComplete={journey.checkoutComplete}
            onSimulatePayment={simulatePayment}
            onContinueAfterPayment={() => goToStage("paid")}
            onBack={() => goToStage("questions")}
          />
        ) : null}
        {stage === "paid" ? (
          <PaidScreen
            headingRef={headingRef}
            onStartProcessing={startProcessing}
            onBack={() => goToStage("summary")}
          />
        ) : null}
        {stage === "processing" ? (
          <ProcessingScreen
            headingRef={headingRef}
            processingStage={journey.processingStage}
            interrupted={interruptedRestore}
            onResume={resumeSimulatedRun}
            onStartOver={beginStartOver}
          />
        ) : null}
        {stage === "ready" ? (
          <ReadyScreen
            headingRef={headingRef}
            report={fixtureReport}
            reportConstructionFailed={journey.reportConstructionFailed}
            retryError={retryError}
            retryErrorRef={retryErrorRef}
            onRetryReport={retryReportConstruction}
            onStartOver={beginStartOver}
            onDownloadJson={downloadExampleEvidenceJson}
          />
        ) : null}
      </div>
    </main>
  );
}
