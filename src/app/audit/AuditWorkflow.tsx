"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuditNotice } from "@/components/product/AuditNotice";
import { Button } from "@/components/ui/button";
import { IconCheck, IconDownload } from "@tabler/icons-react";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditCallTelemetry,
  type AuditBudget,
  type AuditObservation,
  type AuditReport,
  type BusinessBrief,
  type ExtractionDraft,
  type PromptPack,
} from "@/lib/audit/types";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "@/lib/audit/client-contract";
import {
  customerAuditErrorMessage,
  type AuditCustomerStage,
} from "@/lib/audit/customer-error";
import { makeCustomerEvidenceExport } from "@/lib/audit/customer-evidence-export";
import { sanitizeAiSimilarBusinesses } from "@/lib/audit/similar-businesses";
import { AUDIT_STAGE_CALL_LIMITS } from "@/lib/audit/telemetry";
import {
  classifyReportRecovery,
  isReportFailureCode,
  type ReportFailureCode,
} from "@/lib/audit/report-recovery";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  type AuditWorkflowStorageState,
  restorableAuditReport,
} from "@/lib/audit/workflow-storage";
import {
  INVALID_SOURCE_INPUT_MESSAGE,
  parseSourceInput,
} from "@/lib/audit/source-input";
import {
  acceptComparisonTarget,
  applyBriefFieldChange,
  applyScopeSelection,
  confirmIdentity,
  createWorkflowMeta,
  mergeExtractionIntoBrief,
  nextIntakeScreen,
  parseWorkflowStorageState,
  previousIntakeScreen,
  validateBriefForReview,
  WORKFLOW_SCHEMA_VERSION,
  type ComparisonTargetInput,
  type ScopeKind,
  type WorkflowMeta,
} from "@/lib/audit/workflow-authority";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
  createVarianceFailureRecord,
  varianceRunKeyForReport,
  type VarianceFailureRecord,
  type VarianceRecord,
} from "@/lib/audit/variance";
import {
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
} from "@/lib/audit/questions-id";
import {
  completedLockedObservationSetErrors,
  designatedVariancePrompts,
} from "@/lib/audit/locked-question-pack";
import {
  AuditOperationGeneration,
  isAbortError,
} from "@/lib/audit/workflow-operation-generation";
import {
  AuditRunEventParser,
  deriveAuditStep,
  mergeObservation,
  type AuditRunEvent,
  type PromptRunStatus,
} from "@/lib/audit/stream";
import {
  B1BriefStep,
  QuestionsStep,
  type RunUnfinishedState,
} from "./AuditStages";
import SourceHero from "./SourceHero";
import AuditRunStep from "./AuditRunStep";
import ReportView from "./ReportView";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

type SavedState = AuditWorkflowStorageState;

const STORAGE_KEY = AUDIT_WORKFLOW_STORAGE_KEY;
const SESSION_KEY = AUDIT_SESSION_STORAGE_KEY;
const PRESERVED_FACTS_WARNING =
  "Fakta yang sudah Anda edit atau konfirmasi dipertahankan. Hasil pemindaian baru tidak menggantinya; periksa kembali sebelum membuat pertanyaan.";

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

async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json()) as T & {
    error?: string;
    code?: string;
    telemetry?: AuditCallTelemetry[];
  };
  if (!response.ok) {
    throw new AuditRequestError(
      data.error || "Audit request failed.",
      data.telemetry || [],
      data.code,
    );
  }
  return data;
}

function safeError(stage: AuditCustomerStage, cause: unknown) {
  return customerAuditErrorMessage(
    stage,
    cause instanceof AuditRequestError ? cause.code : undefined,
  );
}

function dedupeAuditCalls(calls: AuditCallTelemetry[]) {
  const seen = new Set<string>();
  return calls.filter((call) => {
    const key =
      call.response_id || `${call.stage}:${call.attempt}:${call.started_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const [workflowMeta, setWorkflowMeta] = useState<WorkflowMeta>(() =>
    createWorkflowMeta(emptyBrief),
  );
  const [extractedSourceUrl, setExtractedSourceUrl] = useState("");
  const [factsExtracted, setFactsExtracted] = useState(false);
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  const [factsCustomerOwned, setFactsCustomerOwned] = useState(false);
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
  const operationGenerationRef = useRef<AuditOperationGeneration | null>(null);
  if (!operationGenerationRef.current) {
    operationGenerationRef.current = new AuditOperationGeneration();
  }
  const operationGeneration = operationGenerationRef.current;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const extractionInFlightRef = useRef<string | null>(null);

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
    async (
      auditReport: AuditReport,
      budgetCalls: AuditCallTelemetry[],
      completedObservations: AuditObservation[],
    ) => {
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

      const selectedPrompts = designatedVariancePrompts(
        promptPack.prompts,
        brief,
      );
      const selectedIds = selectedPrompts.map((prompt) => prompt.prompt_id);
      const proofErrors = completedLockedObservationSetErrors({
        prompts: promptPack.prompts,
        observations: completedObservations,
        brief,
      });
      if (proofErrors.length) {
        const reason = `Variance proof rejected: ${proofErrors.join(" ")}`;
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
          // Keep detailed terminal diagnostics in memory if storage is unavailable.
        }
        setVarianceFailure(failure);
        setError(customerAuditErrorMessage("variance"));
        return;
      }

      const operation = operationGeneration.begin("variance");
      varianceInFlightRunKey.current = runKey;
      try {
        const result = await postJson<{
          variance: VarianceRecord;
          budget: AuditBudget;
        }>(
          "/api/audit/variance",
          {
            brief,
            locked_prompts: promptPack.prompts,
            completed_observations: completedObservations,
            prompts: selectedPrompts,
            safety_identifier: safetyIdentifier,
            budget: {
              limit_usd: AUDIT_COST_LIMIT_USD,
              carryover_cost_usd: carryoverCostUsd,
              calls: budgetCalls,
            },
            run_key: runKey,
          },
          operation.signal,
        );

        if (!operationGeneration.isCurrent(operation)) return;
        window.sessionStorage.setItem(
          VARIANCE_STORAGE_KEY,
          JSON.stringify(result.variance),
        );
        window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
        setVarianceRecord(result.variance);
        setVarianceFailure(null);
        if (!result.variance.complete) {
          setError(customerAuditErrorMessage("variance"));
        }
      } catch (cause) {
        if (isAbortError(cause) || !operationGeneration.isCurrent(operation)) {
          return;
        }
        const reason =
          cause instanceof Error ? cause.message : "Variance execution failed.";
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
          // Keep detailed terminal diagnostics in memory if storage is unavailable.
        }
        setVarianceFailure(failure);
        setError(safeError("variance", cause));
      } finally {
        if (
          operationGeneration.isCurrent(operation) &&
          varianceInFlightRunKey.current === runKey
        ) {
          varianceInFlightRunKey.current = null;
        }
        operationGeneration.finish(operation);
      }
    },
    [
      brief,
      carryoverCostUsd,
      operationGeneration,
      promptPack,
      safetyIdentifier,
    ],
  );

  useEffect(() => {
    return () => operationGeneration.invalidate("Audit page unmounted");
  }, [operationGeneration]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state = parseWorkflowStorageState(
            JSON.parse(saved),
          ) as SavedState | null;
          if (!state) {
            window.sessionStorage.removeItem(STORAGE_KEY);
          } else {
            const restoredObservations = state.observations || [];
            const restoredPack = state.promptPack || null;
            setWebsiteUrl(state.websiteUrl || "");
            setExtractedSourceUrl(state.extractedSourceUrl || "");
            setBrief(state.brief || emptyBrief);
            setWorkflowMeta(state.meta);
            setFactsExtracted(Boolean(state.factsExtracted));
            setFactsConfirmed(Boolean(state.factsConfirmed));
            setFactsCustomerOwned(
              Boolean(state.factsCustomerOwned || state.factsConfirmed),
            );
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
          throw new Error(data.error || "Budget bootstrap failed.");
        }
        if (!cancelled) {
          setCarryoverCostUsd(data.carryover_cost_usd);
          setBudgetReady(true);
        }
      } catch (cause) {
        if (!cancelled) {
          setBudgetReady(false);
          setError(safeError("bootstrap", cause));
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
      version: WORKFLOW_SCHEMA_VERSION,
      websiteUrl,
      extractedSourceUrl,
      brief,
      meta: workflowMeta,
      factsExtracted,
      factsConfirmed,
      factsCustomerOwned,
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
    extractedSourceUrl,
    executionStarted,
    extraction,
    factsConfirmed,
    factsCustomerOwned,
    factsExtracted,
    observations,
    postReportBudgetCalls,
    promptPack,
    report,
    reportFailureCode,
    setupTelemetry,
    restored,
    workflowMeta,
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
        const selected = designatedVariancePrompts(promptPack.prompts, brief);
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
        setError(customerAuditErrorMessage("variance"));
      } catch (cause) {
        setError(safeError("variance", cause));
      }
      return;
    }

    const generation = operationGeneration.currentGeneration();
    setBusy("report");
    void runVariance(report, postReportBudgetCalls, observations).finally(
      () => {
        if (operationGeneration.currentGeneration() === generation) {
          setBusy((current) => (current === "report" ? null : current));
        }
      },
    );
  }, [
    budgetReady,
    busy,
    observations,
    operationGeneration,
    postReportBudgetCalls,
    promptPack,
    report,
    restored,
    runVariance,
    varianceSettled,
    brief,
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
    operationGeneration.invalidate("Business facts changed");
    varianceInFlightRunKey.current = null;
    setBusy(null);
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
    setFieldErrors({});
  }

  function updateBrief<K extends keyof BusinessBrief>(
    key: K,
    value: BusinessBrief[K],
  ) {
    if (executionStarted) return;
    const mutation = applyBriefFieldChange(brief, workflowMeta, key, value);
    setBrief(mutation.brief);
    setWorkflowMeta(mutation.meta);
    setFactsCustomerOwned(true);
    clearAfterBriefChange();
  }

  function updateScopeKind(scopeKind: ScopeKind) {
    if (executionStarted) return;
    const mutation = applyScopeSelection(
      brief,
      workflowMeta,
      scopeKind,
      scopeKind === workflowMeta.scopeKind ? workflowMeta.scopeValue : "",
    );
    setBrief(mutation.brief);
    setWorkflowMeta(mutation.meta);
    setFactsCustomerOwned(true);
    clearAfterBriefChange();
  }

  function updateScopeValue(scopeValue: string) {
    if (executionStarted) return;
    const mutation = applyScopeSelection(
      brief,
      workflowMeta,
      workflowMeta.scopeKind,
      scopeValue,
    );
    setBrief(mutation.brief);
    setWorkflowMeta(mutation.meta);
    setFactsCustomerOwned(true);
    clearAfterBriefChange();
  }

  function updateComparisonTarget(input: ComparisonTargetInput) {
    if (executionStarted) return;
    const mutation = acceptComparisonTarget(brief, workflowMeta, input);
    setBrief(mutation.brief);
    setWorkflowMeta(mutation.meta);
    setFactsCustomerOwned(true);
    clearAfterBriefChange();
  }

  function confirmBrandIdentity() {
    if (!brief.brand_name.trim()) {
      setFieldErrors({ brand_name: "Isi nama brand Anda." });
      setError("Isi nama brand Anda sebelum mengonfirmasi identitas.");
      return;
    }
    const mutation = confirmIdentity(brief, workflowMeta);
    setWorkflowMeta(mutation.meta);
    setFieldErrors({});
    setError("");
  }

  function requestSourceCorrection() {
    if (executionStarted || busy) return;
    setFieldErrors({});
    setError("");
    setWorkflowMeta((current) => ({
      ...current,
      intakeScreen: "source-correction",
    }));
  }

  async function submitSourceCorrection(
    sourceUrl: string,
    correctedBrandName: string,
  ) {
    const sourceCandidate =
      sourceUrl.trim() || extractedSourceUrl || brief.official_sources[0] || "";
    const parsedSource = parseSourceInput(sourceCandidate);
    if (!parsedSource) {
      showIntakeIssue({
        field: "sourceCorrectionSource",
        screen: "source-correction",
        message:
          "Masukkan website publik atau profil Instagram yang valid untuk sumber baru.",
      });
      return;
    }
    if (!correctedBrandName.trim()) {
      showIntakeIssue({
        field: "sourceCorrectionName",
        screen: "source-correction",
        message: "Isi nama brand yang benar sebelum membaca ulang sumber.",
      });
      return;
    }

    const resolvedUrl = parsedSource.normalizedUrl;
    if (resolvedUrl === extractedSourceUrl) {
      const mutation = applyBriefFieldChange(
        brief,
        workflowMeta,
        "brand_name",
        correctedBrandName.trim(),
      );
      setBrief(mutation.brief);
      setWorkflowMeta({
        ...mutation.meta,
        intakeScreen: "brand-confirm",
        identityUnverified: false,
      });
      setFactsCustomerOwned(true);
      clearAfterBriefChange();
      return;
    }

    await extractWebsite(resolvedUrl, correctedBrandName.trim());
  }

  function inputIdForField(field: string) {
    if (field === "entity_scope") {
      return workflowMeta.scopeKind === "whole-brand"
        ? "scope-kind-whole-brand"
        : "scope-value";
    }
    return (
      {
        brand_name: "brand-name",
        official_sources: "source-correction-source",
        scopeValue: "scope-value",
        brand_type: "brand-type",
        category: "category",
        market_context: "market-context",
        target_customer: "target-customer",
        verified_customer_needs: "customer-needs",
        verified_decision_criteria: "decision-criteria",
        verified_offerings: "verified-offerings",
        "verified_competitor.name": "comparison-name",
        "verified_competitor.scope": "comparison-scope",
        "verified_competitor.source_url": "comparison-source",
        sourceCorrectionSource: "source-correction-source",
        sourceCorrectionName: "source-correction-name",
      } as Record<string, string>
    )[field];
  }

  function showIntakeIssue(issue: {
    field: string;
    screen: typeof workflowMeta.intakeScreen;
    message: string;
  }) {
    setFieldErrors({ [issue.field]: issue.message });
    setWorkflowMeta((current) => ({ ...current, intakeScreen: issue.screen }));
    setError(issue.message);
    window.setTimeout(() => {
      const id = inputIdForField(issue.field);
      if (id) document.getElementById(id)?.focus();
    }, 0);
  }

  function continueIntake(screen: typeof workflowMeta.intakeScreen) {
    const issue = validateBriefForReview(brief, workflowMeta).find(
      (candidate) => candidate.screen === screen,
    );
    if (issue) {
      showIntakeIssue(issue);
      return;
    }
    setFieldErrors({});
    setError("");
    setWorkflowMeta((current) => ({
      ...current,
      intakeScreen: nextIntakeScreen(current.scopeKind, screen),
    }));
  }

  function goBackInIntake(screen: typeof workflowMeta.intakeScreen) {
    setFieldErrors({});
    setError("");
    setWorkflowMeta((current) => ({
      ...current,
      intakeScreen: previousIntakeScreen(current.scopeKind, screen),
    }));
  }

  async function extractWebsite(url?: string, brandNameOverride?: string) {
    setError("");
    const rawUrl = url?.trim() || websiteUrl.trim();
    const parsedSource = parseSourceInput(rawUrl);
    if (!parsedSource) {
      setError(INVALID_SOURCE_INPUT_MESSAGE);
      return;
    }
    const resolvedUrl = parsedSource.normalizedUrl;
    const correctedBrandName = brandNameOverride?.trim();
    const requestBrief = correctedBrandName
      ? { ...brief, brand_name: correctedBrandName }
      : brief;
    const requestMeta = correctedBrandName
      ? {
          ...workflowMeta,
          identityUnverified: false,
          customerEditedFields: [
            ...new Set([...workflowMeta.customerEditedFields, "brand_name"]),
          ],
        }
      : workflowMeta;
    if (!budgetReady) {
      setError(customerAuditErrorMessage("bootstrap"));
      return;
    }
    if (extractionInFlightRef.current) return;
    if (
      extractedSourceUrl === resolvedUrl &&
      extraction &&
      !correctedBrandName
    ) {
      setWebsiteUrl(resolvedUrl);
      setFactsExtracted(true);
      setWorkflowMeta((current) => ({
        ...current,
        intakeScreen: "brand-confirm",
      }));
      return;
    }
    setWebsiteUrl(resolvedUrl);
    extractionInFlightRef.current = resolvedUrl;
    const preserveCustomerFacts = requestMeta.customerEditedFields.length > 0;
    setBusy("extract");
    try {
      const result = await postJson<{
        draft: ExtractionDraft;
        telemetry: AuditCallTelemetry[];
      }>("/api/audit/extract", {
        website_url: resolvedUrl,
        brand_name: requestBrief.brand_name,
        market_context: requestBrief.market_context,
        category: requestBrief.category,
        identity_unverified: correctedBrandName
          ? false
          : workflowMeta.identityUnverified || !brief.brand_name.trim(),
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
        warnings: preserveCustomerFacts
          ? [...new Set([...draft.warnings, PRESERVED_FACTS_WARNING])]
          : draft.warnings,
      });
      const mutation = mergeExtractionIntoBrief({
        currentBrief: requestBrief,
        currentMeta: requestMeta,
        draft: { ...draft, similar_businesses: similarBusinesses },
        acceptedSourceUrl: resolvedUrl,
      });
      setBrief(mutation.brief);
      setWorkflowMeta({
        ...mutation.meta,
        intakeScreen: "brand-confirm",
        identityUnverified: correctedBrandName
          ? false
          : mutation.meta.identityUnverified,
      });
      setFactsCustomerOwned(preserveCustomerFacts);
      setExtractedSourceUrl(resolvedUrl);
      setFactsExtracted(true);
      setFactsConfirmed(false);
      setSetupTelemetry((calls) => [...calls, ...result.telemetry]);
    } catch (cause) {
      if (cause instanceof AuditRequestError && cause.telemetry.length) {
        setSetupTelemetry((calls) => [...calls, ...cause.telemetry]);
      }
      setError(safeError("extract", cause));
    } finally {
      if (extractionInFlightRef.current === resolvedUrl) {
        extractionInFlightRef.current = null;
      }
      setBusy(null);
    }
  }

  async function generatePrompts() {
    setError("");
    const validationIssue = validateBriefForReview(brief, workflowMeta)[0];
    if (validationIssue) {
      showIntakeIssue(validationIssue);
      return;
    }

    const operation = operationGeneration.begin("prompts");
    setFactsConfirmed(true);
    setFactsCustomerOwned(true);
    setBusy("prompts");
    try {
      const result = await postJson<{
        pack: PromptPack;
        telemetry?: AuditCallTelemetry[];
      }>("/api/audit/prompts", { brief }, operation.signal);
      if (!operationGeneration.isCurrent(operation)) return;
      const pack = result.pack;
      setPromptPack(pack);
      setPromptStatuses(initialStatuses(pack, []));
      if (result.telemetry?.length) {
        setSetupTelemetry((calls) => [...calls, ...(result.telemetry ?? [])]);
      }
    } catch (cause) {
      if (!isAbortError(cause) && operationGeneration.isCurrent(operation)) {
        setError(safeError("prompts", cause));
      }
    } finally {
      if (operationGeneration.isCurrent(operation)) setBusy(null);
      operationGeneration.finish(operation);
    }
  }

  function editPrompt(index: number, question: string) {
    if (executionStarted) return;
    operationGeneration.invalidate("Question text changed");
    varianceInFlightRunKey.current = null;
    setBusy(null);
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
    if (!budgetReady) throw new Error("Budget bootstrap unavailable.");

    const operation = operationGeneration.begin("report");
    setReportFailureCode(null);
    setBusy("report");
    try {
      const reportInputCalls = dedupeAuditCalls([
        ...priorCalls,
        ...finalObservations.flatMap(
          (observation) => observation.telemetry || [],
        ),
      ]);
      const reportResult = await postJson<{
        report: AuditReport;
        telemetry?: AuditCallTelemetry[];
      }>(
        "/api/audit/report",
        {
          brief,
          prompts: promptPack.prompts,
          observations: finalObservations,
          safety_identifier: safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: carryoverCostUsd,
            calls: reportInputCalls,
          },
        },
        operation.signal,
      );
      if (!operationGeneration.isCurrent(operation)) return;

      const reportCalls = reportResult.telemetry || [];
      const varianceBudgetCalls = dedupeAuditCalls([
        ...reportInputCalls,
        ...reportCalls,
      ]);
      setPostReportBudgetCalls(varianceBudgetCalls);
      if (reportCalls.length) {
        setSetupTelemetry((calls) =>
          dedupeAuditCalls([...calls, ...reportCalls]),
        );
      }
      setReport(reportResult.report);
      setReportFailureCode(null);
      await runVariance(
        reportResult.report,
        varianceBudgetCalls,
        finalObservations,
      );
    } catch (cause) {
      if (isAbortError(cause) || !operationGeneration.isCurrent(operation)) {
        return;
      }
      if (cause instanceof AuditRequestError && cause.telemetry.length) {
        setSetupTelemetry((calls) =>
          dedupeAuditCalls([...calls, ...cause.telemetry]),
        );
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
    } finally {
      if (operationGeneration.isCurrent(operation)) setBusy(null);
      operationGeneration.finish(operation);
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
      if (event.observations?.length) {
        current = event.observations;
        setObservations(current);
      }
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
      setError(customerAuditErrorMessage("bootstrap"));
      return;
    }
    const minimized = minimizeIndonesianBrief(brief);
    const questionErrors = validateCanonicalIndonesianQuestionPack(
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

    const resumeObservations = observations.filter(
      (observation) => observation.run_status === "completed",
    );
    const runPriorCalls = dedupeAuditCalls([
      ...setupTelemetry,
      ...observations.flatMap((observation) => observation.telemetry || []),
    ]);
    const operation = operationGeneration.begin("run");
    setBusy("run");
    let finalObservations: AuditObservation[] = [...resumeObservations];
    let runCompleted = false;
    let runUnfinishedReceived = false;
    let handedToReport = false;

    try {
      const response = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: operation.signal,
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
        const data = (await response.json()) as {
          error?: string;
          code?: string;
        };
        throw new AuditRequestError(
          data.error || "Audit run failed.",
          [],
          data.code,
        );
      }
      if (!response.body) throw new Error("Audit stream body missing.");
      if (!operationGeneration.isCurrent(operation)) return;

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
      setSetupTelemetry(runPriorCalls);
      setObservations(resumeObservations);
      setPromptStatuses(initialStatuses(promptPack, resumeObservations));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = new AuditRunEventParser();

      while (true) {
        const { value, done } = await reader.read();
        if (!operationGeneration.isCurrent(operation)) {
          await reader.cancel().catch(() => undefined);
          return;
        }
        for (const event of parser.push(
          decoder.decode(value, { stream: !done }),
        )) {
          if (!operationGeneration.isCurrent(operation)) return;
          finalObservations = handleRunEvent(event, finalObservations);
          if (event.type === "run_completed") runCompleted = true;
          if (event.type === "run_unfinished") runUnfinishedReceived = true;
        }
        if (done) break;
      }
      for (const event of parser.finish()) {
        if (!operationGeneration.isCurrent(operation)) return;
        finalObservations = handleRunEvent(event, finalObservations);
        if (event.type === "run_completed") runCompleted = true;
        if (event.type === "run_unfinished") runUnfinishedReceived = true;
      }
      if (!runCompleted && !runUnfinishedReceived) {
        throw new Error("Audit stream ended early.");
      }
      if (runCompleted && finalObservations.length !== 10) {
        throw new Error("Invalid completed observation set.");
      }
      if (runCompleted && operationGeneration.isCurrent(operation)) {
        operationGeneration.finish(operation);
        handedToReport = true;
        await createReport(finalObservations, runPriorCalls);
      }
    } catch (cause) {
      if (
        !isAbortError(cause) &&
        (handedToReport || operationGeneration.isCurrent(operation))
      ) {
        setError(safeError(handedToReport ? "report" : "run", cause));
      }
    } finally {
      if (!handedToReport && operationGeneration.isCurrent(operation)) {
        setBusy(null);
      }
      operationGeneration.finish(operation);
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
      if (!isAbortError(cause)) setError(safeError("report", cause));
    }
  }

  function startOver() {
    operationGeneration.invalidate("Audit restarted");
    varianceInFlightRunKey.current = null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
    window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
    setWebsiteUrl("");
    setBrief(emptyBrief);
    setFactsExtracted(false);
    setFactsConfirmed(false);
    setFactsCustomerOwned(false);
    setExtraction(null);
    setPromptPack(null);
    setObservations([]);
    setReport(null);
    setReportFailureCode(null);
    setSetupTelemetry([]);
    setPostReportBudgetCalls([]);
    setVarianceRecord(null);
    setVarianceFailure(null);
    setExecutionStarted(false);
    setPromptStatuses({});
    setRunUnfinished(null);
    setBusy(null);
    setError("");
    setWorkflowMeta(createWorkflowMeta(emptyBrief));
    setExtractedSourceUrl("");
    extractionInFlightRef.current = null;
    setFieldErrors({});
  }

  function backToSource() {
    operationGeneration.invalidate("Navigated back to source");
    varianceInFlightRunKey.current = null;
    setBusy(null);
    setFactsExtracted(false);
    setWorkflowMeta((current) => ({
      ...current,
      intakeScreen: "brand-confirm",
    }));
    setFieldErrors({});
  }

  function backToFacts() {
    operationGeneration.invalidate("Navigated back to business facts");
    varianceInFlightRunKey.current = null;
    setBusy(null);
    setPromptPack(null);
    setFactsConfirmed(false);
    setWorkflowMeta((current) => ({
      ...current,
      intakeScreen: "review",
    }));
    setFieldErrors({});
  }

  function downloadEvidenceJson() {
    if (!report || !promptPack) return;
    const evidence = makeCustomerEvidenceExport(
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
    <main className={styles.shell} lang="id" data-theme="light">
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
          <Button variant="secondary" size="sm" onClick={startOver}>
            Mulai ulang
          </Button>
          {report && varianceSettled ? (
            <Button variant="default" size="sm" onClick={() => window.print()}>
              <IconDownload /> Cetak / simpan PDF
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
          <AuditNotice title="Periksa ini sebelum melanjutkan" tone="danger">
            {error}
          </AuditNotice>
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
        <B1BriefStep
          key={workflowMeta.intakeScreen}
          brief={brief}
          updateBrief={updateBrief}
          extraction={extraction}
          screen={workflowMeta.intakeScreen}
          scopeKind={workflowMeta.scopeKind}
          scopeValue={workflowMeta.scopeValue}
          comparisonProposal={workflowMeta.comparisonProposal}
          comparisonStatus={workflowMeta.comparisonStatus}
          marketInvalidated={workflowMeta.marketInvalidated}
          offeringsInvalidated={workflowMeta.offeringsInvalidated}
          customerEditedFields={workflowMeta.customerEditedFields}
          preservedCustomerFields={workflowMeta.preservedCustomerFields}
          fieldErrors={fieldErrors}
          identityUnverified={workflowMeta.identityUnverified}
          busy={busy}
          onScopeKindChange={updateScopeKind}
          onScopeValueChange={updateScopeValue}
          onConfirmIdentity={confirmBrandIdentity}
          onRequestSourceCorrection={requestSourceCorrection}
          onSubmitSourceCorrection={submitSourceCorrection}
          onAcceptComparison={updateComparisonTarget}
          onContinue={continueIntake}
          onBack={goBackInIntake}
          onBackToSource={backToSource}
          onGenerate={generatePrompts}
        />
      ) : null}

      {step === 2 && promptPack ? (
        <QuestionsStep
          pack={promptPack}
          brandName={brief.brand_name}
          busy={busy}
          onEdit={editPrompt}
          onBack={backToFacts}
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
