"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alert, Button } from "@heroui/react";
import { IconCheck, IconDownload } from "@tabler/icons-react";
import {
  businessBriefSchema,
  AUDIT_COST_LIMIT_USD,
  type AuditCallTelemetry,
  type AuditBudget,
  type AuditObservation,
  type AuditReport,
  type BusinessBrief,
  type ExtractionDraft,
  type PromptPack,
} from "@/lib/audit/types";
import { makeEvidenceExport } from "@/lib/audit/contracts";
import { summarizeAuditTelemetry } from "@/lib/audit/telemetry";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  restorableAuditReport,
} from "@/lib/audit/workflow-storage";
import {
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateIndonesianQuestionPack,
} from "@/lib/audit/questions-id";
import {
  AuditRunEventParser,
  deriveAuditStep,
  mergeObservation,
  type AuditRunEvent,
  type PromptRunStatus,
} from "@/lib/audit/stream";
import {
  BriefStep,
  QuestionsStep,
  RunStep,
  SourceStep,
  type RunUnfinishedState,
} from "./AuditStages";
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
  setupTelemetry?: AuditCallTelemetry[];
  executionStarted?: boolean;
};

// R3-4 (Phase 3 fix-round-3 adversarial review): the key and the restore
// guard live in `@/lib/audit/workflow-storage`, where they are pure logic and
// tested. `AuditReport.measures` is a new required field, so the key is
// bumped v3 -> v4 AND a restored report is dropped if it does not carry the
// fields the report screen reads.
const STORAGE_KEY = AUDIT_WORKFLOW_STORAGE_KEY;
const SESSION_KEY = AUDIT_SESSION_STORAGE_KEY;

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
  "Fakta bisnis",
  "Periksa fakta",
  "Periksa pertanyaan",
  "Jalankan audit",
];

class AuditRequestError extends Error {
  readonly telemetry: AuditCallTelemetry[];

  constructor(message: string, telemetry: AuditCallTelemetry[] = []) {
    super(message);
    this.name = "AuditRequestError";
    this.telemetry = telemetry;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & {
    error?: string;
    telemetry?: AuditCallTelemetry[];
  };
  if (!response.ok) {
    throw new AuditRequestError(
      data.error || "Kami tidak dapat menyelesaikan permintaan ini.",
      data.telemetry || [],
    );
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
  return `Lengkapi ${field || "informasi bisnis"}: ${first.message}`;
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
  const [setupTelemetry, setSetupTelemetry] = useState<AuditCallTelemetry[]>(
    [],
  );
  const [executionStarted, setExecutionStarted] = useState(false);
  const [promptStatuses, setPromptStatuses] = useState<
    Record<string, PromptRunStatus>
  >({});
  const [runUnfinished, setRunUnfinished] = useState<RunUnfinishedState | null>(
    null,
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [carryoverCostUsd, setCarryoverCostUsd] = useState(0);
  const [budgetReady, setBudgetReady] = useState(false);

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
          setReport(restorableAuditReport(state.report));
          setSetupTelemetry(state.setupTelemetry || []);
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
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/audit/extract", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as Partial<AuditBudget> & {
          error?: string;
        };
        if (
          !response.ok ||
          data.limit_usd !== AUDIT_COST_LIMIT_USD ||
          typeof data.carryover_cost_usd !== "number" ||
          data.carryover_cost_usd < 0 ||
          data.carryover_cost_usd > AUDIT_COST_LIMIT_USD
        ) {
          throw new Error(
            data.error || "Pengaturan pengendali biaya privat tidak valid.",
          );
        }
        if (!cancelled) {
          setCarryoverCostUsd(data.carryover_cost_usd);
          setBudgetReady(true);
        }
      } catch (cause) {
        if (!cancelled) {
          setBudgetReady(false);
          setError(
            cause instanceof Error
              ? cause.message
              : "Pengendali biaya privat tidak tersedia.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
      setupTelemetry,
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
    setupTelemetry,
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
    setRunUnfinished(null);
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
    if (!budgetReady) {
      setError("Tunggu pengendali biaya privat sebelum memulai audit.");
      return;
    }
    if (!websiteUrl.trim()) {
      setError("Masukkan URL situs resmi brand Anda terlebih dahulu.");
      return;
    }
    setBusy("extract");
    try {
      const result = await postJson<{
        draft: ExtractionDraft;
        telemetry: AuditCallTelemetry[];
      }>("/api/audit/extract", {
        website_url: websiteUrl.trim(),
        brand_name: brief.brand_name,
        market_context: brief.market_context,
        category: brief.category,
        safety_identifier: safetyIdentifier,
        budget: {
          limit_usd: AUDIT_COST_LIMIT_USD,
          carryover_cost_usd: carryoverCostUsd,
          calls: setupTelemetry,
        },
      });
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
      setSetupTelemetry((calls) => [...calls, ...result.telemetry]);
    } catch (cause) {
      if (cause instanceof AuditRequestError && cause.telemetry.length) {
        setSetupTelemetry((calls) => [...calls, ...cause.telemetry]);
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Kami tidak dapat menganalisis situs web ini.",
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
      setError(
        "Periksa fakta bisnis di atas dan konfirmasi sebelum melanjutkan.",
      );
      return;
    }
    setBusy("prompts");
    try {
      // The ten Indonesian questions come from the live generation boundary
      // (Spec 003 work package A): one bounded no-search provider call,
      // server-side accounting, deterministic fallback on any failure. The
      // returned telemetry is folded into the session budget (R-36).
      const result = await postJson<{
        pack: PromptPack;
        telemetry?: AuditCallTelemetry[];
      }>("/api/audit/prompts", { brief });
      const pack = result.pack;
      setPromptPack(pack);
      setPromptStatuses(initialStatuses(pack, []));
      if (result.telemetry?.length) {
        setSetupTelemetry((calls) => [...calls, ...(result.telemetry ?? [])]);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kami tidak dapat membuat pertanyaan audit.",
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

  async function createReport(
    finalObservations: AuditObservation[],
    priorCalls = setupTelemetry,
  ) {
    if (!promptPack) return;
    if (!budgetReady) {
      throw new Error("Pengendali biaya privat tidak tersedia.");
    }
    setBusy("report");
    try {
      const reportResult = await postJson<{ report: AuditReport }>(
        "/api/audit/report",
        {
          brief,
          prompts: promptPack.prompts,
          observations: finalObservations,
          safety_identifier: safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: carryoverCostUsd,
            calls: [
              ...priorCalls,
              ...finalObservations.flatMap(
                (observation) => observation.telemetry || [],
              ),
            ],
          },
        },
      );
      setReport(reportResult.report);
    } catch (cause) {
      if (cause instanceof AuditRequestError && cause.telemetry.length) {
        setSetupTelemetry((calls) => [...calls, ...cause.telemetry]);
      }
      throw cause;
    }
  }

  function handleRunEvent(event: AuditRunEvent, current: AuditObservation[]) {
    if (event.type === "prompt_started" || event.type === "attempt_started") {
      setPromptStatuses((statuses) => ({
        ...statuses,
        [event.prompt_id]: "running",
      }));
    }
    if (event.type === "prompt_retrying") {
      setPromptStatuses((statuses) => ({
        ...statuses,
        [event.prompt_id]: "retrying",
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
    if (event.type === "prompt_failed") {
      setPromptStatuses((statuses) => ({
        ...statuses,
        [event.prompt_id]: "failed",
      }));
    }
    if (event.type === "run_completed") {
      current = event.observations;
      setObservations(current);
    }
    if (event.type === "run_unfinished") {
      setRunUnfinished({
        completed: event.completed,
        failedPromptIds: event.failed_prompt_ids,
        message: event.message,
      });
    }
    if (event.type === "fatal_error") throw new Error(event.message);
    return current;
  }

  async function runAudit() {
    if (!promptPack) return;
    setError("");
    if (!budgetReady) {
      setError("Tunggu pengendali biaya privat sebelum menjalankan audit.");
      return;
    }
    // The locked pack is validated with the Indonesian question rules (Spec
    // 002/003): leakage, unsupported premises, distinctness, executability.
    const minimized = minimizeIndonesianBrief(brief);
    const questionErrors = validateIndonesianQuestionPack(
      promptPack.prompts.map((prompt) => prompt.question),
      minimized,
    );
    const blockers = indonesianPackBlockers(
      promptPack.prompts.map((prompt) => prompt.question),
      minimized,
    );
    if (questionErrors.length || blockers.length) {
      setError(
        [...questionErrors.map((issue) => issue.message), ...blockers].join(
          " ",
        ),
      );
      return;
    }

    setExecutionStarted(true);
    setReport(null);
    setRunUnfinished(null);
    // Interrupted-run resume (Spec 003 R-19): completed observations are
    // preserved and sent back to the run route, which never reruns them.
    const resumeObservations = observations.filter(
      (observation) => observation.run_status === "completed",
    );
    const runPriorCalls = [
      ...setupTelemetry,
      ...observations.flatMap((observation) => observation.telemetry || []),
    ];
    setSetupTelemetry(runPriorCalls);
    setObservations([]);
    setPromptStatuses(initialStatuses(promptPack, []));
    setBusy("run");
    let finalObservations: AuditObservation[] = [];
    let runCompleted = false;
    let runUnfinishedReceived = false;

    try {
      const response = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          prompts: promptPack.prompts,
          safety_identifier: safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: carryoverCostUsd,
            calls: runPriorCalls,
          },
          resume_observations: resumeObservations,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Kami tidak dapat menjalankan audit.");
      }
      if (!response.body)
        throw new Error("Server tidak mengembalikan aliran audit.");

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
          if (event.type === "run_unfinished") runUnfinishedReceived = true;
        }
        if (done) break;
      }
      for (const event of parser.finish()) {
        finalObservations = handleRunEvent(event, finalObservations);
        if (event.type === "run_completed") runCompleted = true;
        if (event.type === "run_unfinished") runUnfinishedReceived = true;
      }
      if (!runCompleted && !runUnfinishedReceived) {
        // The stream ended without a terminal run event: the browser-bound
        // connection dropped. Completed observations are preserved and never
        // rerun; no background continuation exists in this phase.
        throw new Error("Koneksi terputus sebelum 10 observasi selesai.");
      }
      if (runCompleted && finalObservations.length !== 10) {
        throw new Error(
          "Aliran audit berakhir dengan kumpulan observasi tidak valid.",
        );
      }
      if (runCompleted) {
        await createReport(finalObservations, runPriorCalls);
      }
      // run_unfinished already recorded the terminal state: no report is
      // created before 10/10 evaluable observations (no partial report).
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kami tidak dapat menyelesaikan audit.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function retryReport() {
    if (
      !promptPack ||
      observations.filter((item) => item.run_status === "completed").length !==
        10
    )
      return;
    setError("");
    try {
      await createReport(observations);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kami tidak dapat membuat laporan lagi.",
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
    setSetupTelemetry([]);
    setExecutionStarted(false);
    setPromptStatuses({});
    setRunUnfinished(null);
    setError("");
  }

  function handleLogo(file: File | undefined) {
    if (!file) {
      updateBrief("agency_logo_data_url", "");
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg)$/) || file.size > 1_000_000) {
      setError("Unggah logo PNG atau JPG berukuran maksimal 1 MB.");
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
    executionStarted &&
    !busy &&
    !report &&
    observations.filter((item) => item.run_status === "completed").length < 10;
  const telemetrySummary =
    report?.operational_telemetry ??
    summarizeAuditTelemetry(
      [
        ...setupTelemetry,
        ...observations.flatMap((observation) => observation.telemetry || []),
      ],
      AUDIT_COST_LIMIT_USD,
      carryoverCostUsd,
    );

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
            Mulai ulang
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
          aria-label="Tahapan audit"
        >
          <div className={styles.stepContext}>
            <span>Pengaturan audit</span>
            <strong>
              Langkah {step + 1} dari {stepLabels.length}
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
              <Alert.Title>Periksa ini sebelum melanjutkan</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : null}

      {telemetrySummary.call_count || telemetrySummary.carryover_cost_usd ? (
        <div className={`${styles.globalAlert} ${styles.noPrint}`}>
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Kendali biaya sesi privat</Alert.Title>
              <Alert.Description>
                {telemetrySummary.call_count} panggilan API · USD{" "}
                {telemetrySummary.accounted_cost_usd.toFixed(4)} tercatat dari
                USD {telemetrySummary.cost_limit_usd.toFixed(2)}
                {` · sisa USD ${Math.max(
                  0,
                  telemetrySummary.cost_limit_usd -
                    telemetrySummary.accounted_cost_usd,
                ).toFixed(4)}`}
                {telemetrySummary.carryover_cost_usd
                  ? ` · USD ${telemetrySummary.carryover_cost_usd.toFixed(4)} dibawa dari sesi sebelumnya`
                  : ""}
              </Alert.Description>
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
          interrupted={interrupted && !runUnfinished}
          runUnfinished={runUnfinished}
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
