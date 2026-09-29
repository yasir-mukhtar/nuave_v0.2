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
  version: 6;
  /**
   * `reading` is persisted only while a preparation is in flight: a refresh
   * restores it as `entry` with an interruption note, never a replayed call
   * (Spec 013 R-04). It is never a navigation target.
   */
  stage:
    | "entry"
    | "reading"
    | "brand"
    | "focus"
    | "location"
    | "product"
    | "category"
    | "offerings"
    | "service"
    | "market"
    | "summary"
    | "questions"
    | "audit";
  entry: { name: string; source: string };
  /**
   * Spec 013 J5: set while a detail screen (or the focus screen) was opened
   * from the summary's `Ubah` — the review stage the edit detour returns to.
   * Lanjut hops walk the remaining chain and consume the marker on arrival;
   * Back exits to it from the first detail screen of the detour.
   */
  editReturn?: "summary";
  /**
   * The focus + category the owner confirmed on the summary before a focus
   * edit began. While both stay untouched the detour may exit straight back
   * to the review; once either changes the chain continues through category
   * so the re-resolved suggestion is shown (R-05).
   */
  editBaseline?: {
    focus: "brand" | "produk" | "cabang";
    category: string;
  };
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
    version: 6,
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
      value.version !== 6 ||
      ![
        "entry",
        "reading",
        "brand",
        "focus",
        "location",
        "product",
        "category",
        "offerings",
        "service",
        "market",
        "summary",
        "questions",
        "audit",
      ].includes(String(value.stage)) ||
      !isRecord(value.entry) ||
      typeof value.entry.name !== "string" ||
      typeof value.entry.source !== "string" ||
      value.entry.name.length > 160 ||
      value.entry.source.length > 2_000 ||
      !Array.isArray(value.preparationCalls) ||
      !Array.isArray(value.generationAttempts) ||
      (value.editReturn !== undefined && value.editReturn !== "summary") ||
      (value.editBaseline !== undefined &&
        (!isRecord(value.editBaseline) ||
          !["brand", "produk", "cabang"].includes(
            String(value.editBaseline.focus),
          ) ||
          typeof value.editBaseline.category !== "string" ||
          value.editBaseline.category.length > 300))
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
    // Spec 013 J3: a prepared record must carry the R-24 lists; anything
    // older or corrupt restarts at entry instead of mixing.
    const validPrepared = (prepared: unknown) =>
      isRecord(prepared) &&
      typeof prepared.typedName === "string" &&
      typeof prepared.canonicalSource === "string" &&
      (prepared.discoveredName === null ||
        typeof prepared.discoveredName === "string") &&
      isRecord(prepared.locations) &&
      Array.isArray(prepared.locations.proposed) &&
      isRecord(prepared.categorySuggestions) &&
      Array.isArray(prepared.categorySuggestions.proposed) &&
      isRecord(prepared.offeringCategorySuggestions) &&
      Array.isArray(prepared.offeringCategorySuggestions.proposed);
    const validSelection = (selection: unknown) =>
      isRecord(selection) &&
      typeof selection.name === "string" &&
      ["website", "nuave", "owner"].includes(String(selection.nameOrigin)) &&
      ["main", "suggestion", "manual"].includes(String(selection.categoryKind));
    if (
      (!["entry", "reading"].includes(stage) &&
        (!validPrepared(value.prepared) || !validSelection(value.selection))) ||
      (value.prepared != null && !validPrepared(value.prepared)) ||
      (value.selection != null && !validSelection(value.selection))
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
