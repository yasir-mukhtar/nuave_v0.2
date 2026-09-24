import {
  sourceExcerptStatusSchema,
  type SourceExcerptStatus,
  type AuditCallTelemetry,
} from "../audit/types";
import { DIRECT_TEN_PROMPT_IDS } from "../audit/locked-question-pack";
import type { GlmPackProvenance } from "./local-questions";
import type { GenerationAttempt } from "./local-session";
import {
  parseFrozenSmartIntake,
  SMART_INTAKE_STORAGE_KEY,
  type FrozenSmartIntake,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";

export type SmartQuestionPack = {
  version: "nuave-local-questions-v2";
  inputFingerprint: string;
  originals: string[];
  approved: string[];
  revision: number;
  provenance: GlmPackProvenance;
  billedCostUsd: number | null;
};

export type SmartPreparedIdentity = {
  inputName: string;
  inputSource: string;
  canonicalUrl: string;
  displayName: string | null;
  preparationMode: "synthetic-local" | "live";
};

export type SmartSession = {
  version: 2;
  stage: "entry" | "summary" | "clarify" | "questions" | "audit";
  entry: { name: string; source: string };
  identity: SmartPreparedIdentity | null;
  prepared: PreparedUnderstanding | null;
  selection: SmartSelection | null;
  confirmedSelection: SmartSelection | null;
  frozen: FrozenSmartIntake | null;
  pack: SmartQuestionPack | null;
  preparationCalls: AuditCallTelemetry[];
  preparationMode: "synthetic-local" | "live" | null;
  sourceExcerptStatus?: SourceExcerptStatus;
  generationAttempts: GenerationAttempt[];
};

export function freshSmartSession(): SmartSession {
  return {
    version: 2,
    stage: "entry",
    entry: { name: "", source: "" },
    identity: null,
    prepared: null,
    selection: null,
    confirmedSelection: null,
    frozen: null,
    pack: null,
    preparationCalls: [],
    preparationMode: null,
    generationAttempts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseSmartSession(raw: string | null): SmartSession | null {
  if (!raw || raw.length > 400_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 2 ||
      !["entry", "summary", "clarify", "questions", "audit"].includes(
        String(value.stage),
      ) ||
      !isRecord(value.entry) ||
      typeof value.entry.name !== "string" ||
      typeof value.entry.source !== "string" ||
      value.entry.name.length > 160 ||
      value.entry.source.length > 2_000 ||
      !Array.isArray(value.preparationCalls) ||
      !Array.isArray(value.generationAttempts)
    )
      return null;
    const stage = value.stage as SmartSession["stage"];
    if (
      value.sourceExcerptStatus !== undefined &&
      !sourceExcerptStatusSchema.safeParse(value.sourceExcerptStatus).success
    )
      return null;
    if (
      value.identity != null &&
      (!isRecord(value.identity) ||
        typeof value.identity.inputName !== "string" ||
        typeof value.identity.inputSource !== "string" ||
        typeof value.identity.canonicalUrl !== "string" ||
        (value.identity.displayName !== null &&
          typeof value.identity.displayName !== "string") ||
        !["live", "synthetic-local"].includes(
          String(value.identity.preparationMode),
        ))
    )
      return null;
    if (
      stage !== "entry" &&
      (!isRecord(value.prepared) || !isRecord(value.selection))
    )
      return null;
    const frozen = value.frozen ? parseFrozenSmartIntake(value.frozen) : null;
    if (value.frozen && !frozen) return null;
    if (["questions", "audit"].includes(stage) && !frozen) return null;
    const pack = value.pack;
    if (pack !== null && pack !== undefined) {
      if (
        !isRecord(pack) ||
        pack.version !== "nuave-local-questions-v2" ||
        !frozen ||
        pack.inputFingerprint !== frozen.fingerprint ||
        !Array.isArray(pack.originals) ||
        !Array.isArray(pack.approved) ||
        pack.originals.length !== 10 ||
        pack.approved.length !== 10 ||
        !pack.originals.every((item) => typeof item === "string") ||
        !pack.approved.every((item) => typeof item === "string") ||
        !Number.isInteger(pack.revision) ||
        !isRecord(pack.provenance)
      )
        return null;
    }
    if (stage === "audit" && !pack) return null;
    return {
      ...value,
      identity: (value.identity ?? null) as SmartPreparedIdentity | null,
      frozen,
      pack: (pack ?? null) as SmartQuestionPack | null,
    } as SmartSession;
  } catch {
    return null;
  }
}

export function readSmartSession(): SmartSession | null {
  if (typeof window === "undefined") return null;
  return parseSmartSession(
    window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
  );
}

export function writeSmartSession(session: SmartSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SMART_INTAKE_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export function smartPackPrompts(pack: SmartQuestionPack) {
  return DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
    prompt_id,
    question: pack.approved[index]!,
    review_status: "needs_human_review" as const,
  }));
}
