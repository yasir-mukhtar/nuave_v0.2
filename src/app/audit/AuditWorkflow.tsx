"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alert, Button } from "@heroui/react";
import { IconCheck, IconDownload } from "@tabler/icons-react";
import {
  businessBriefSchema,
  type AuditObservation,
  type AuditReport,
  type BusinessBrief,
  type ExtractionDraft,
  type PromptPack,
} from "@/lib/audit/types";
import { makeEvidenceExport, validatePromptPack } from "@/lib/audit/contracts";
import {
  AuditRunEventParser,
  deriveAuditStep,
  mergeObservation,
  type AuditRunEvent,
  type PromptRunStatus,
} from "@/lib/audit/stream";
import { BriefStep, QuestionsStep, RunStep, SourceStep } from "./AuditStages";
import ReportView from "./ReportView";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

type SavedState = {
  websiteUrl: string;
  brief: BusinessBrief;
  factsExtracted: boolean;
  factsConfirmed: boolean;
  extraction: ExtractionDraft | null;
  promptPack: PromptPack | null;
  observations: AuditObservation[];
  report: AuditReport | null;
  executionStarted?: boolean;
};

const STORAGE_KEY = "nuave.audit.workflow.v2";
const SESSION_KEY = "nuave.audit.session.v1";

const emptyBrief: BusinessBrief = {
  brand_name: "",
  entity_scope: "",
  brand_type: "",
  category: "",
  market_context: "",
  target_customer: "",
  official_sources: [],
  verified_offerings: [],
  verified_customer_needs: [],
  verified_decision_criteria: [],
  verified_competitor: { name: "", scope: "", source_url: "" },
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

const stepLabels = [
  "Client brief",
  "Verify facts",
  "Review questions",
  "Run audit",
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "We couldn't complete that request.");
  }
  return data;
}

function friendlyBriefError(brief: BusinessBrief) {
  const result = businessBriefSchema.safeParse(brief);
  if (result.success) return "";
  const first = result.error.issues[0];
  const field = first.path
    .join(".")
    .replace("verified_competitor.", "competitor.");
  return `Complete ${field || "the client brief"}: ${first.message}`;
}

function initialStatuses(
  pack: PromptPack | null,
  observations: AuditObservation[],
) {
  const statuses: Record<string, PromptRunStatus> = {};
  pack?.prompts.forEach((prompt) => {
    statuses[prompt.prompt_id] = "pending";
  });
  observations.forEach((observation) => {
    statuses[observation.prompt_id] = observation.run_status;
  });
  return statuses;
}

export default function AuditWorkflow() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brief, setBrief] = useState<BusinessBrief>(emptyBrief);
  const [factsExtracted, setFactsExtracted] = useState(false);
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionDraft | null>(null);
  const [promptPack, setPromptPack] = useState<PromptPack | null>(null);
  const [observations, setObservations] = useState<AuditObservation[]>([]);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [executionStarted, setExecutionStarted] = useState(false);
  const [promptStatuses, setPromptStatuses] = useState<
    Record<string, PromptRunStatus>
  >({});
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);

  const safetyIdentifier = useMemo(() => {
    if (typeof window === "undefined") return "nuave-server-placeholder";
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const value = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, value);
    return value;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state = JSON.parse(saved) as SavedState;
          const restoredObservations = state.observations || [];
          const restoredPack = state.promptPack || null;
          setWebsiteUrl(state.websiteUrl || "");
          setBrief(state.brief || emptyBrief);
          setFactsExtracted(Boolean(state.factsExtracted));
          setFactsConfirmed(Boolean(state.factsConfirmed));
          setExtraction(state.extraction || null);
          setPromptPack(restoredPack);
          setObservations(restoredObservations);
          setReport(state.report || null);
          setExecutionStarted(
            Boolean(state.executionStarted || restoredObservations.length),
          );
          setPromptStatuses(
            initialStatuses(restoredPack, restoredObservations),
          );
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const state: SavedState = {
      websiteUrl,
      brief,
      factsExtracted,
      factsConfirmed,
      extraction,
      promptPack,
      observations,
      report,
      executionStarted,
    };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Continue in memory if session storage is unavailable or full.
    }
  }, [
    brief,
    executionStarted,
    extraction,
    factsConfirmed,
    factsExtracted,
    observations,
    promptPack,
    report,
    restored,
    websiteUrl,
  ]);

  const step = deriveAuditStep({
    hasReport: Boolean(report),
    executionStarted,
    hasPromptPack: Boolean(promptPack),
    factsExtracted,
  });

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`stage-${step + 1}`)?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [restored, step]);

  function clearAfterBriefChange() {
    setFactsConfirmed(false);
    setPromptPack(null);
    setObservations([]);
    setReport(null);
    setExecutionStarted(false);
    setPromptStatuses({});
  }

  function updateBrief<K extends keyof BusinessBrief>(
    key: K,
    value: BusinessBrief[K],
  ) {
    if (executionStarted) return;
    setBrief((current) => ({ ...current, [key]: value }));
    clearAfterBriefChange();
  }

  async function extractWebsite() {
    setError("");
    if (!websiteUrl.trim()) {
      setError("Enter the client's official website URL first.");
      return;
    }
    setBusy("extract");
    try {
      const result = await postJson<{ draft: ExtractionDraft }>(
        "/api/audit/extract",
        {
          website_url: websiteUrl.trim(),
          brand_name: brief.brand_name,
          market_context: brief.market_context,
          category: brief.category,
          safety_identifier: safetyIdentifier,
        },
      );
      const draft = result.draft;
      setExtraction(draft);
      setBrief((current) => ({
        ...current,
        brand_name: draft.brand_name || current.brand_name,
        entity_scope: draft.entity_scope || current.entity_scope,
        brand_type: draft.brand_type || current.brand_type,
        category: draft.category || current.category,
        market_context: draft.market_context || current.market_context,
        target_customer: draft.target_customer || current.target_customer,
        official_sources: [
          ...new Set([websiteUrl.trim(), ...draft.official_sources]),
        ],
        verified_offerings: draft.verified_offerings,
        verified_customer_needs: draft.verified_customer_needs,
        verified_decision_criteria: draft.verified_decision_criteria,
        brand_name_variants: draft.brand_name_variants,
        priority_offering: draft.priority_offering,
        conversion_action: draft.conversion_action,
        customer_supplied_facts: draft.customer_supplied_facts,
        known_accuracy_questions: draft.known_accuracy_questions,
        usp: draft.usp,
        regulated_category_notes: draft.regulated_category_notes,
      }));
      setFactsExtracted(true);
      setFactsConfirmed(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't analyze this website.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function generatePrompts() {
    setError("");
    const validationError = friendlyBriefError(brief);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!factsConfirmed) {
      setError("Confirm that you have checked every fact before continuing.");
      return;
    }
    setBusy("prompts");
    try {
      const pack = await postJson<PromptPack>("/api/audit/prompts", {
        brief,
        safety_identifier: safetyIdentifier,
      });
      setPromptPack(pack);
      setPromptStatuses(initialStatuses(pack, []));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't create the audit questions.",
      );
    } finally {
      setBusy(null);
    }
  }

  function editPrompt(index: number, question: string) {
    if (executionStarted) return;
    setPromptPack((current) =>
      current
        ? {
            ...current,
            prompts: current.prompts.map((prompt, promptIndex) =>
              promptIndex === index ? { ...prompt, question } : prompt,
            ),
          }
        : current,
    );
    setObservations([]);
    setReport(null);
  }

  async function createReport(finalObservations: AuditObservation[]) {
    if (!promptPack) return;
    setBusy("report");
    const reportResult = await postJson<{ report: AuditReport }>(
      "/api/audit/report",
      {
        brief,
        prompts: promptPack.prompts,
        observations: finalObservations,
        safety_identifier: safetyIdentifier,
      },
    );
    setReport(reportResult.report);
  }

  function handleRunEvent(event: AuditRunEvent, current: AuditObservation[]) {
    if (event.type === "prompt_started") {
      setPromptStatuses((statuses) => ({
        ...statuses,
        [event.prompt_id]: "running",
      }));
    }
    if (event.type === "prompt_completed") {
      current = mergeObservation(current, event.observation);
      setObservations(current);
      setPromptStatuses((statuses) => ({
        ...statuses,
        [event.observation.prompt_id]: event.observation.run_status,
      }));
    }
    if (event.type === "run_completed") {
      current = event.observations;
      setObservations(current);
    }
    if (event.type === "fatal_error") throw new Error(event.message);
    return current;
  }

  async function runAudit() {
    if (!promptPack) return;
    setError("");
    const promptErrors = validatePromptPack(promptPack.prompts, brief);
    if (promptErrors.length) {
      setError(promptErrors.join(" "));
      return;
    }

    setExecutionStarted(true);
    setReport(null);
    setObservations([]);
    setPromptStatuses(initialStatuses(promptPack, []));
    setBusy("run");
    let finalObservations: AuditObservation[] = [];
    let runCompleted = false;

    try {
      const response = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          prompts: promptPack.prompts,
          safety_identifier: safetyIdentifier,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "We couldn't run the audit.");
      }
      if (!response.body)
        throw new Error("The server did not return an audit stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new AuditRunEventParser();

      while (true) {
        const { value, done } = await reader.read();
        for (const event of parser.push(
          decoder.decode(value, { stream: !done }),
        )) {
          finalObservations = handleRunEvent(event, finalObservations);
          if (event.type === "run_completed") runCompleted = true;
        }
        if (done) break;
      }
      for (const event of parser.finish()) {
        finalObservations = handleRunEvent(event, finalObservations);
        if (event.type === "run_completed") runCompleted = true;
      }
      if (!runCompleted || finalObservations.length !== 10) {
        throw new Error(
          "The connection closed before all ten observations finished.",
        );
      }
      await createReport(finalObservations);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't complete the audit.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function retryReport() {
    if (!promptPack || observations.length !== 10) return;
    setError("");
    try {
      await createReport(observations);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't create the report again.",
      );
    } finally {
      setBusy(null);
    }
  }

  function startOver() {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setWebsiteUrl("");
    setBrief(emptyBrief);
    setFactsExtracted(false);
    setFactsConfirmed(false);
    setExtraction(null);
    setPromptPack(null);
    setObservations([]);
    setReport(null);
    setExecutionStarted(false);
    setPromptStatuses({});
    setError("");
  }

  function handleLogo(file: File | undefined) {
    if (!file) {
      updateBrief("agency_logo_data_url", "");
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg)$/) || file.size > 1_000_000) {
      setError("Upload a PNG or JPG logo no larger than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      updateBrief("agency_logo_data_url", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function downloadEvidenceJson() {
    if (!report || !promptPack) return;

    const evidence = makeEvidenceExport(
      brief,
      promptPack.prompts,
      observations,
      report,
    );
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const brandSlug =
      brief.brand_name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "client";

    link.href = url;
    link.download = `${brandSlug}-nuave-evidence.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const interrupted =
    executionStarted && !busy && !report && observations.length < 10;

  return (
    <main className={styles.shell} lang="en" data-theme="light">
      <header className={`${styles.topbar} ${styles.noPrint}`}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/logo-nuave-horizontal.png"
            width={152}
            height={48}
            priority
            alt="Nuave"
          />
        </Link>
        <div className={styles.topActions}>
          <Button variant="secondary" size="sm" onPress={startOver}>
            New Audit
          </Button>
          {report ? (
            <Button variant="primary" size="sm" onPress={() => window.print()}>
              <IconDownload /> Download PDF
            </Button>
          ) : null}
        </div>
      </header>

      {!report ? (
        <nav
          className={`${styles.stepper} ${styles.noPrint}`}
          aria-label="Audit stages"
        >
          <div className={styles.stepContext}>
            <span>Audit setup</span>
            <strong>
              Step {step + 1} of {stepLabels.length}
            </strong>
          </div>
          <ol className={styles.stepList}>
            {stepLabels.map((label, index) => (
              <li
                key={label}
                className={`${styles.step} ${index <= step ? styles.stepActive : ""} ${index < step ? styles.stepComplete : ""}`}
                aria-current={index === step ? "step" : undefined}
              >
                <span className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepLabel}>
                  <span className={styles.stepMarker} aria-hidden="true">
                    {index < step ? <IconCheck /> : index + 1}
                  </span>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {error ? (
        <div className={`${styles.globalAlert} ${styles.noPrint}`}>
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Check this before continuing</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : null}

      {step === 0 ? (
        <SourceStep
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          brief={brief}
          updateBrief={updateBrief}
          busy={busy}
          factsExtracted={factsExtracted}
          onExtract={extractWebsite}
        />
      ) : null}

      {step === 1 ? (
        <BriefStep
          brief={brief}
          updateBrief={updateBrief}
          extraction={extraction}
          factsConfirmed={factsConfirmed}
          setFactsConfirmed={setFactsConfirmed}
          busy={busy}
          onGenerate={generatePrompts}
          onBack={() => setFactsExtracted(false)}
          onLogo={handleLogo}
        />
      ) : null}

      {step === 2 && promptPack ? (
        <QuestionsStep
          pack={promptPack}
          brandName={brief.brand_name}
          busy={busy}
          onEdit={editPrompt}
          onBack={() => setPromptPack(null)}
          onRun={runAudit}
        />
      ) : null}

      {step === 3 && promptPack ? (
        <RunStep
          pack={promptPack}
          statuses={promptStatuses}
          observations={observations}
          busy={busy}
          interrupted={interrupted}
          onRerun={runAudit}
          onRetryReport={retryReport}
        />
      ) : null}

      {step === 4 && report && promptPack ? (
        <ReportView
          report={report}
          brief={brief}
          observations={observations}
          onDownloadJson={downloadEvidenceJson}
        />
      ) : null}
    </main>
  );
}
