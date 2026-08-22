"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AUDIT_CLIENT_CONTRACT_VERSION } from "@/lib/audit/client-contract";
import {
  sanitizeAiSimilarBusinesses,
  withPrimarySimilarBusiness,
} from "@/lib/audit/similar-businesses";
import { AUDIT_STAGE_CALL_LIMITS } from "@/lib/audit/telemetry";
import {
  classifyReportRecovery,
  isReportFailureCode,
  type ReportFailureCode,
} from "@/lib/audit/report-recovery";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  restorableAuditReport,
} from "@/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
  createVarianceFailureRecord,
  selectVariancePrompts,
  varianceRunKeyForReport,
  type VarianceFailureRecord,
  type VarianceRecord,
} from "@/lib/audit/variance";
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
  type RunUnfinishedState,
} from "./AuditStages";
import SourceHero from "./SourceHero";
import AuditRunStep from "./AuditRunStep";
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
  /** Exact post-report call ledger used to resume a variance request safely. */
  postReportBudgetCalls?: AuditCallTelemetry[];
  reportFailureCode?: ReportFailureCode | null;
};

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
  similar_businesses: [],
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
  readonly code?: string;

  constructor(
    message: string,
    telemetry: AuditCallTelemetry[] = [],
    code?: string,
  ) {
    super(message);
    this.name = "AuditRequestError";
    this.telemetry = telemetry;
    this.code = code;
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
    code?: string;
    telemetry?: AuditCallTelemetry[];
  };
  if (!response.ok) {
    throw new AuditRequestError(
      data.error || "Kami tidak dapat menyelesaikan permintaan ini.",
      data.telemetry || [],
      data.code,
    );
  }
  return data;
}

function readStoredRunRecord<T extends { run_key: string }>(
  key: string,
): T | null {
  if (typeof window === "undefined") return null;
  const saved = window.sessionStorage.getItem(key);
  if (!saved) return null;
  try {
    const record = JSON.parse(saved) as Partial<T>;
    return typeof record.run_key === "string" ? (record as T) : null;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
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
  const [postReportBudgetCalls, setPostReportBudgetCalls] = useState<
    AuditCallTelemetry[]
  >([]);
  const [varianceRecord, setVarianceRecord] = useState<VarianceRecord | null>(
    null,
  );
  const [varianceFailure, setVarianceFailure] =
    useState<VarianceFailureRecord | null>(null);
  const varianceInFlightRunKey = useRef<string | null>(null);
  const [executionStarted, setExecutionStarted] = useState(false);
  const [promptStatuses, setPromptStatuses] = useState<
    Record<string, PromptRunStatus>
  >({});
  const [runUnfinished, setRunUnfinished] = useState<RunUnfinishedState | null>(
    null,
  );
  const [reportFailureCode, setReportFailureCode] =
    useState<ReportFailureCode | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [carryoverCostUsd, setCarryoverCostUsd] = useState(0);
  const [budgetReady, setBudgetReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  const safetyIdentifier = useMemo(() => {
    if (typeof window === "undefined") return "nuave-server-placeholder";
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const value = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, value);
    return value;
  }, []);

  const reportCallCount = setupTelemetry.filter(
    (call) => call.stage === "report",
  ).length;
  const reportRecovery = reportFailureCode
    ? classifyReportRecovery(
        reportFailureCode,
        reportCallCount,
        AUDIT_STAGE_CALL_LIMITS.report,
      )
    : null;

  const runVariance = useCallback(
    async (auditReport: AuditReport, budgetCalls: AuditCallTelemetry[]) => {
      if (!promptPack) return;
      const runKey = varianceRunKeyForReport(auditReport);
      if (varianceInFlightRunKey.current === runKey) return;

      const storedVariance =
        readStoredRunRecord<VarianceRecord>(VARIANCE_STORAGE_KEY);
      if (storedVariance?.run_key === runKey) {
        setVarianceRecord(storedVariance);
        setVarianceFailure(null);
        return;
      }
      const storedFailure = readStoredRunRecord<VarianceFailureRecord>(
        VARIANCE_FAILURE_STORAGE_KEY,
      );
      if (storedFailure?.run_key === runKey) {
        setVarianceFailure(storedFailure);
        return;
      }

      const selectedPrompts = selectVariancePrompts(promptPack.prompts);
      const selectedIds = selectedPrompts.map((prompt) => prompt.prompt_id);
      varianceInFlightRunKey.current = runKey;
      try {
        const result = await postJson<{
          variance: VarianceRecord;
          budget: AuditBudget;
        }>("/api/audit/variance", {
          brief,
          prompts: selectedPrompts,
          safety_identifier: safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: carryoverCostUsd,
            calls: budgetCalls,
          },
          run_key: runKey,
        });

        window.sessionStorage.setItem(
          VARIANCE_STORAGE_KEY,
          JSON.stringify(result.variance),
        );
        window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
        setVarianceRecord(result.variance);
        setVarianceFailure(null);
        if (!result.variance.complete) {
          setError(
            `Laporan selesai, tetapi pengukuran variasi belum lengkap: ${result.variance.incomplete_reason || "sebagian pertanyaan tidak berhasil diuji ulang."}`,
          );
        }
      } catch (cause) {
        const reason =
          cause instanceof Error
            ? cause.message
            : "Pengukuran variasi tidak dapat diselesaikan.";
        const failure = createVarianceFailureRecord({
          run_key: runKey,
          prompt_ids: selectedIds,
          incomplete_reason: reason,
        });
        try {
          window.sessionStorage.setItem(
            VARIANCE_FAILURE_STORAGE_KEY,
            JSON.stringify(failure),
          );
        } catch {
          // Keep the terminal failure in memory if session storage is unavailable.
        }
        setVarianceFailure(failure);
        setError(
          `Laporan sudah selesai dan tetap valid, tetapi pengukuran variasi gagal: ${reason}`,
        );
      } finally {
        if (varianceInFlightRunKey.current === runKey) {
          varianceInFlightRunKey.current = null;
        }
      }
    },
    [brief, carryoverCostUsd, promptPack, safetyIdentifier],
  );

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
          setPostReportBudgetCalls(state.postReportBudgetCalls || []);
          setReportFailureCode(
            isReportFailureCode(state.reportFailureCode)
              ? state.reportFailureCode
              : null,
          );
          setExecutionStarted(
            Boolean(state.executionStarted || restoredObservations.length),
          );
          setPromptStatuses(
            initialStatuses(restoredPack, restoredObservations),
          );
        }
        setVarianceRecord(
          readStoredRunRecord<VarianceRecord>(VARIANCE_STORAGE_KEY),
        );
        setVarianceFailure(
          readStoredRunRecord<VarianceFailureRecord>(
            VARIANCE_FAILURE_STORAGE_KEY,
          ),
        );
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
      postReportBudgetCalls,
      reportFailureCode,
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
    postReportBudgetCalls,
    promptPack,
    report,
    reportFailureCode,
    setupTelemetry,
    restored,
    websiteUrl,
  ]);

  const reportRunKey = useMemo(() => {
    if (!report) return "";
    try {
      return varianceRunKeyForReport(report);
    } catch {
      return "";
    }
  }, [report]);
  const varianceSettled = Boolean(
    reportRunKey &&
    (varianceRecord?.run_key === reportRunKey ||
      varianceFailure?.run_key === reportRunKey),
  );

  useEffect(() => {
    if (
      !restored ||
      !budgetReady ||
      busy ||
      !report ||
      !promptPack ||
      varianceSettled
    ) {
      return;
    }

    if (!postReportBudgetCalls.length) {
      try {
        const selected = selectVariancePrompts(promptPack.prompts);
        const failure = createVarianceFailureRecord({
          run_key: varianceRunKeyForReport(report),
          prompt_ids: selected.map((prompt) => prompt.prompt_id),
          incomplete_reason:
            "Variansi tidak dijalankan ulang setelah pemulihan karena ledger biaya pasca-laporan tidak tersedia.",
        });
        window.sessionStorage.setItem(
          VARIANCE_FAILURE_STORAGE_KEY,
          JSON.stringify(failure),
        );
        setVarianceFailure(failure);
        setError(
          "Laporan yang dipulihkan tetap valid, tetapi pengukuran variasi tidak dapat dilanjutkan dengan aman karena ledger biaya pasca-laporan tidak tersedia.",
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Pengukuran variasi pada laporan yang dipulihkan tidak dapat diselesaikan.",
        );
      }
      return;
    }

    setBusy("report");
    void runVariance(report, postReportBudgetCalls).finally(() =>
      setBusy(null),
    );
  }, [
    budgetReady,
    busy,
    postReportBudgetCalls,
    promptPack,
    report,
    restored,
    runVariance,
    varianceSettled,
  ]);

  const step = deriveAuditStep({
    hasReport: Boolean(report && varianceSettled),
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

  useEffect(() => {
    if (factsExtracted && !busy && step === 0 && !exiting) {
      setExiting(true);
      const timer = setTimeout(() => setExiting(false), 450);
      return () => clearTimeout(timer);
    }
  }, [factsExtracted, busy, step, exiting]);

  function clearAfterBriefChange() {
    setFactsConfirmed(false);
    setPromptPack(null);
    setObservations([]);
    setReport(null);
    setReportFailureCode(null);
    setPostReportBudgetCalls([]);
    setVarianceRecord(null);
    setVarianceFailure(null);
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

  async function extractWebsite(url?: string) {
    setError("");
    const resolvedUrl = url?.trim() || websiteUrl.trim();
    if (!budgetReady) {
      setError("Tunggu pengendali biaya privat sebelum memulai audit.");
      return;
    }
    if (!resolvedUrl) {
      setError("Masukkan URL situs resmi brand Anda terlebih dahulu.");
      return;
    }
    if (url) setWebsiteUrl(url.trim());
    setBusy("extract");
    try {
      const result = await postJson<{
        draft: ExtractionDraft;
        telemetry: AuditCallTelemetry[];
      }>("/api/audit/extract", {
        website_url: resolvedUrl,
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
      const similarBusinesses = sanitizeAiSimilarBusinesses(
        draft.similar_businesses ?? [],
      );
      setExtraction({
        ...draft,
        similar_businesses: similarBusinesses,
      });
      setBrief((current) =>
        withPrimarySimilarBusiness({
          ...current,
          brand_name: draft.brand_name || current.brand_name,
          entity_scope: draft.entity_scope || current.entity_scope,
          brand_type: draft.brand_type || current.brand_type,
          category: draft.category || current.category,
          market_context: draft.market_context || current.market_context,
          target_customer: draft.target_customer || current.target_customer,
          official_sources: [
            ...new Set([resolvedUrl, ...draft.official_sources]),
          ],
          verified_offerings: draft.verified_offerings,
          verified_customer_needs: draft.verified_customer_needs,
          verified_decision_criteria: draft.verified_decision_criteria,
          similar_businesses: similarBusinesses,
          brand_name_variants: draft.brand_name_variants,
          priority_offering: draft.priority_offering,
          conversion_action: draft.conversion_action,
          customer_supplied_facts: draft.customer_supplied_facts,
          known_accuracy_questions: draft.known_accuracy_questions,
          usp: draft.usp,
          regulated_category_notes: draft.regulated_category_notes,
        }),
      );
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
    const preparedBrief = withPrimarySimilarBusiness(brief);
    const validationError = friendlyBriefError(preparedBrief);
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
    setBrief(preparedBrief);
    setBusy("prompts");
    try {
      const result = await postJson<{
        pack: PromptPack;
        telemetry?: AuditCallTelemetry[];
      }>("/api/audit/prompts", { brief: preparedBrief });
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
    setReportFailureCode(null);
    setPostReportBudgetCalls([]);
    setVarianceRecord(null);
    setVarianceFailure(null);
  }

  async function createReport(
    finalObservations: AuditObservation[],
    priorCalls = setupTelemetry,
  ) {
    if (!promptPack) return;
    if (!budgetReady) {
      throw new Error("Pengendali biaya privat tidak tersedia.");
    }
    setReportFailureCode(null);
    setBusy("report");
    try {
      const reportInputCalls = [
        ...priorCalls,
        ...finalObservations.flatMap(
          (observation) => observation.telemetry || [],
        ),
      ];
      const reportResult = await postJson<{
        report: AuditReport;
        telemetry?: AuditCallTelemetry[];
      }>("/api/audit/report", {
        brief,
        prompts: promptPack.prompts,
        observations: finalObservations,
        safety_identifier: safetyIdentifier,
        budget: {
          limit_usd: AUDIT_COST_LIMIT_USD,
          carryover_cost_usd: carryoverCostUsd,
          calls: reportInputCalls,
        },
      });
      const reportCalls = reportResult.telemetry || [];
      const varianceBudgetCalls = [...reportInputCalls, ...reportCalls];
      setPostReportBudgetCalls(varianceBudgetCalls);
      if (reportCalls.length) {
        setSetupTelemetry((calls) => [...calls, ...reportCalls]);
      }
      setReport(reportResult.report);
      setReportFailureCode(null);
      await runVariance(reportResult.report, varianceBudgetCalls);
    } catch (cause) {
      if (cause instanceof AuditRequestError && cause.telemetry.length) {
        setSetupTelemetry((calls) => [...calls, ...cause.telemetry]);
      }
      if (
        cause instanceof AuditRequestError &&
        isReportFailureCode(cause.code)
      ) {
        setReportFailureCode(cause.code);
      } else {
        setReportFailureCode("REPORT_TRANSIENT_FAILURE");
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

    window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
    window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
    setVarianceRecord(null);
    setVarianceFailure(null);
    setPostReportBudgetCalls([]);
    varianceInFlightRunKey.current = null;
    setExecutionStarted(true);
    setReport(null);
    setReportFailureCode(null);
    setRunUnfinished(null);
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
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
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
      !reportRecovery?.can_retry ||
      !promptPack ||
      observations.filter((item) => item.run_status === "completed").length !==
        10
    ) {
      return;
    }
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
    window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
    window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
    setWebsiteUrl("");
    setBrief(emptyBrief);
    setFactsExtracted(false);
    setFactsConfirmed(false);
    setExtraction(null);
    setPromptPack(null);
    setObservations([]);
    setReport(null);
    setReportFailureCode(null);
    setSetupTelemetry([]);
    setPostReportBudgetCalls([]);
    setVarianceRecord(null);
    setVarianceFailure(null);
    varianceInFlightRunKey.current = null;
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

  return (
    <main className={styles.shell} lang="en" data-theme="light">
      <header
        className={`${styles.topbar} ${styles.noPrint}`}
        style={
          step === 0 && !exiting
            ? { position: "absolute", opacity: 0, pointerEvents: "none" }
            : undefined
        }
      >
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
          {report && varianceSettled ? (
            <Button variant="primary" size="sm" onPress={() => window.print()}>
              <IconDownload /> Download PDF
            </Button>
          ) : null}
        </div>
      </header>

      {step > 0 && step < 4 ? (
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

      {error && step > 0 ? (
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

      {step === 0 || exiting ? (
        <SourceHero
          initialValue={websiteUrl}
          extracting={busy === "extract"}
          error={error}
          onExtract={extractWebsite}
          exiting={exiting}
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
        <AuditRunStep
          pack={promptPack}
          statuses={promptStatuses}
          observations={observations}
          busy={busy}
          interrupted={interrupted && !runUnfinished}
          runUnfinished={runUnfinished}
          reportRecovery={reportRecovery}
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
