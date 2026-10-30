import {
  sourceExcerptStatusSchema,
  type SourceExcerptStatus,
  type AuditCallTelemetry,
} from "../audit/types";
import { DIRECT_TEN_PROMPT_IDS } from "../audit/locked-question-pack";
import type { GlmPackProvenance } from "./local-questions";
import type { QuestionOrigin } from "../discovery/question-rules";
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
  /** Spec 018 R-07: the server's origin for each written question. */
  origins?: QuestionOrigin[];
};

export type SmartStage = SmartSession["stage"];

export type SmartPreparedIdentity = {
  inputName: string;
  inputSource: string;
  canonicalUrl: string;
  displayName: string | null;
  preparationMode: "synthetic-local" | "live";
  /** The website's own short description, shown on the found card (J05). */
  description?: string | null;
  /** The website's icon as an image data URL, when small enough to keep. */
  iconDataUrl?: string | null;
  /** The free check did not finish (J04): the owner continued with a name
   * guessed from the address, and nothing was read from the website yet. */
  guessed?: true;
  /** The website was read but its name labels were unclear, so the owner
   * checks the name before going on. */
  nameUnsure?: true;
};

export type SmartSession = {
  version: 9;
  /**
   * `reading` is persisted only while a preparation is in flight: a refresh
   * restores it as `entry` with an interruption note, never a replayed call
   * (Spec 013 R-04). It is never a navigation target.
   */
  stage:
    | "entry"
    | "reading"
    | "brand"
    | "steps"
    | "order"
    | "intro-business"
    | "focus"
    | "location"
    | "product"
    | "category"
    | "offerings"
    | "target-customer"
    | "customer-needs"
    | "competitors"
    | "differentiator"
    | "service"
    | "market"
    | "intro-review"
    | "summary"
    | "questions";
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
  /**
   * Spec 016 R-01: the brand chosen on the free brand screen, before the paid
   * reading. It becomes the selection's name once the reading is done.
   */
  brand?: { name: string; origin: "owner" | "website" } | null;
  /**
   * Spec 016 R-02/R-29: the saved order. The id is not a secret credential for
   * anything but this order's own progress; the email is NEVER stored here
   * (R-31). `website` and `name` are what the order was made for: a different
   * website or brand needs a new order.
   */
  order?: {
    id: string;
    website: string;
    name: string;
    /** Spec 017 R-19: set once the server said this order is paid. From then
     * on the website and business are locked and the order is never sent as
     * `previous_order_id`. */
    paid?: boolean;
    /** The order number the server showed once paid (R-01), so the page can
     * still show it if the order later ends. */
    number?: string;
    /** Set when this browser starts the paid reading for this order. From
     * then on the reading never starts by itself: a failed or interrupted
     * reading waits for the customer's own Lanjut (Spec 013 R-04). */
    readingStarted?: true;
    /** Spec 018 R-07: set once the server said discovery ran twice for this
     * order; "Kota untuk pencarian" can no longer change. */
    searchPlaceLocked?: true;
  } | null;
  /** An order the customer left by changing the website or the brand. It may
   * still be open; the next order tells the server to expire it, so it stops
   * holding part of the daily cap (spec 016 R-08). */
  supersededOrder?: string | null;
  /** What that order was made for (website and business). */
  supersededInfo?: { website: string; name: string } | null;
  /** Where to go once an order is made again (R-30: the saved progress
   * continues on the new order with no new paid call). */
  afterOrder?: SmartStage | null;
  /** Set on every save; progress older than 7 days is discarded (R-31). */
  savedAt?: string;
  preparationCalls: AuditCallTelemetry[];
  preparationMode: "synthetic-local" | "live" | null;
  sourceExcerptStatus?: SourceExcerptStatus;
  generationAttempts: GenerationAttempt[];
};

const SMART_STAGES: readonly SmartSession["stage"][] = [
  "entry",
  "reading",
  "brand",
  "steps",
  "order",
  "intro-business",
  "focus",
  "location",
  "product",
  "category",
  "offerings",
  "target-customer",
  "customer-needs",
  "competitors",
  "differentiator",
  "service",
  "market",
  "intro-review",
  "summary",
  "questions",
];

/**
 * Screens the v2 journey folded into a neighbour: what customers compare now
 * shares the needs screen (J17), and the often-wrong public fact sits inside
 * the differentiator screen (J22). Progress saved on one of them reopens on
 * the screen that now owns it.
 */
const FOLDED_STAGES: Readonly<Record<string, SmartSession["stage"]>> = {
  "decision-considerations": "customer-needs",
  "public-fact": "differentiator",
};

function knownStage(value: unknown): SmartSession["stage"] | null {
  if (typeof value !== "string") return null;
  if (SMART_STAGES.includes(value as SmartSession["stage"]))
    return value as SmartSession["stage"];
  return FOLDED_STAGES[value] ?? null;
}

/** The longest website description and icon a saved session keeps. */
export const IDENTITY_DESCRIPTION_MAX = 300;
export const IDENTITY_ICON_MAX = 60_000;

export function freshSmartSession(): SmartSession {
  return {
    version: 9,
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
      value.version !== 9 ||
      !knownStage(value.stage) ||
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
    const stage = knownStage(value.stage)!;
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
        ) ||
        (value.identity.description != null &&
          (typeof value.identity.description !== "string" ||
            value.identity.description.length > IDENTITY_DESCRIPTION_MAX)) ||
        (value.identity.iconDataUrl != null &&
          (typeof value.identity.iconDataUrl !== "string" ||
            value.identity.iconDataUrl.length > IDENTITY_ICON_MAX ||
            !value.identity.iconDataUrl.startsWith("data:image/"))) ||
        (value.identity.guessed !== undefined &&
          value.identity.guessed !== true) ||
        (value.identity.nameUnsure !== undefined &&
          value.identity.nameUnsure !== true))
    )
      return null;
    // Spec 013 J3: a prepared record must carry the R-24 lists; anything
    // older or corrupt restarts at entry instead of mixing. JQ adds the
    // retained R-20 prepared meanings: a proposed string/string-list with a
    // website or Nuave origin, or null.
    const validPreparedText = (value: unknown) =>
      isRecord(value) &&
      typeof value.origin === "string" &&
      ["website", "nuave"].includes(value.origin) &&
      (value.proposed === null || typeof value.proposed === "string");
    const validPreparedList = (value: unknown) =>
      isRecord(value) &&
      typeof value.origin === "string" &&
      ["website", "nuave"].includes(value.origin) &&
      (value.proposed === null ||
        (Array.isArray(value.proposed) &&
          value.proposed.every((item) => typeof item === "string")));
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
      Array.isArray(prepared.offeringCategorySuggestions.proposed) &&
      validPreparedText(prepared.targetCustomer) &&
      validPreparedList(prepared.decisionConsiderations) &&
      validPreparedText(prepared.differentiator);
    // JQ: the three retained meanings keep the same optional owner/prepared
    // origin rule — absent falls back to "owner" at confirm time.
    const validMeaningOrigin = (value: unknown) =>
      value === undefined ||
      (typeof value === "string" &&
        ["website", "nuave", "owner"].includes(value));
    const validSelection = (selection: unknown) =>
      isRecord(selection) &&
      typeof selection.name === "string" &&
      ["website", "nuave", "owner"].includes(String(selection.nameOrigin)) &&
      ["main", "suggestion", "manual"].includes(
        String(selection.categoryKind),
      ) &&
      Array.isArray(selection.customerNeeds) &&
      selection.customerNeeds.every((item) => typeof item === "string") &&
      typeof selection.targetCustomer === "string" &&
      Array.isArray(selection.decisionConsiderations) &&
      selection.decisionConsiderations.every(
        (item) => typeof item === "string",
      ) &&
      typeof selection.differentiator === "string" &&
      isRecord(selection.origins) &&
      validMeaningOrigin(selection.origins.targetCustomer) &&
      validMeaningOrigin(selection.origins.decisionConsiderations) &&
      validMeaningOrigin(selection.origins.differentiator) &&
      ["named", "unknown", "category-alternatives"].includes(
        String(selection.comparatorMode),
      ) &&
      Array.isArray(selection.comparatorNames) &&
      selection.comparatorNames.every((item) => typeof item === "string") &&
      typeof selection.publicFact === "string" &&
      // J7/R-22: aliases must already be a valid "Nama lain" list.
      Array.isArray(selection.aliases) &&
      selection.aliases.length <= 12 &&
      selection.aliases.every(
        (item) =>
          typeof item === "string" &&
          item.trim().length > 0 &&
          item.trim().length <= 160,
      ) &&
      new Set(
        selection.aliases.map((item) =>
          String(item).trim().toLocaleLowerCase("id-ID"),
        ),
      ).size === selection.aliases.length;
    // Spec 016: before the paid reading there is no prepared understanding —
    // the free brand screen and the order screen run on the identity alone.
    const beforeReading =
      ["entry", "reading", "steps", "order"].includes(stage) ||
      (stage === "brand" && value.prepared == null && value.identity != null);
    if (
      (!beforeReading &&
        (!validPrepared(value.prepared) || !validSelection(value.selection))) ||
      (value.prepared != null && !validPrepared(value.prepared)) ||
      (value.selection != null && !validSelection(value.selection)) ||
      (value.confirmedSelection != null &&
        !validSelection(value.confirmedSelection))
    )
      return null;
    const frozen = value.frozen ? parseFrozenSmartIntake(value.frozen) : null;
    if (value.frozen && !frozen) return null;
    if (stage === "questions" && !frozen) return null;
    if (
      value.brand != null &&
      (!isRecord(value.brand) ||
        typeof value.brand.name !== "string" ||
        value.brand.name.length > 160 ||
        !["owner", "website"].includes(String(value.brand.origin)))
    )
      return null;
    if (
      value.order != null &&
      (!isRecord(value.order) ||
        typeof value.order.id !== "string" ||
        !/^[0-9a-f]{32}$/.test(value.order.id) ||
        typeof value.order.website !== "string" ||
        value.order.website.length > 2_000 ||
        typeof value.order.name !== "string" ||
        value.order.name.length > 160 ||
        (value.order.paid !== undefined && value.order.paid !== true) ||
        (value.order.readingStarted !== undefined &&
          value.order.readingStarted !== true) ||
        (value.order.searchPlaceLocked !== undefined &&
          value.order.searchPlaceLocked !== true) ||
        (value.order.number !== undefined &&
          (typeof value.order.number !== "string" ||
            !/^NV-[A-Z0-9]{6}$/.test(value.order.number))))
    )
      return null;
    if (
      value.supersededInfo != null &&
      (!isRecord(value.supersededInfo) ||
        typeof value.supersededInfo.website !== "string" ||
        value.supersededInfo.website.length > 2_000 ||
        typeof value.supersededInfo.name !== "string" ||
        value.supersededInfo.name.length > 160)
    )
      return null;
    if (
      value.supersededOrder != null &&
      (typeof value.supersededOrder !== "string" ||
        !/^[0-9a-f]{32}$/.test(value.supersededOrder))
    )
      return null;
    if (
      value.afterOrder != null &&
      (value.afterOrder === "order" || !knownStage(value.afterOrder))
    )
      return null;
    // The order screens run on the identity (and the brand chosen on it).
    if ((stage === "order" || stage === "steps") && value.identity == null)
      return null;
    if (value.savedAt !== undefined && typeof value.savedAt !== "string")
      return null;
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
        !isRecord(pack.provenance) ||
        (pack.origins !== undefined &&
          (!Array.isArray(pack.origins) || pack.origins.length !== 10))
      )
        return null;
    }
    return {
      ...value,
      stage,
      ...(value.afterOrder != null
        ? { afterOrder: knownStage(value.afterOrder) }
        : {}),
      identity: (value.identity ?? null) as SmartPreparedIdentity | null,
      frozen,
      pack: (pack ?? null) as SmartQuestionPack | null,
    } as SmartSession;
  } catch {
    return null;
  }
}

/** R-31: intake progress older than this is removed from the browser. */
export const SMART_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Browser storage can be missing or blocked (private window, cleared data):
 * every access is guarded and the page works without it. */
function progressStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** R-29: the intake progress is kept in this browser's local storage, so a
 * closed tab continues at the same screen. Progress saved more than 7 days
 * ago is removed (R-31). */
export function readSmartSession(now = Date.now()): SmartSession | null {
  const storage = progressStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SMART_INTAKE_STORAGE_KEY);
    const session = parseSmartSession(raw);
    if (!session) return null;
    // Every save stamps `savedAt`; a record without one (or with one that is
    // not a date) has no known age and is treated as expired.
    if (
      session.savedAt === undefined ||
      !(now - Date.parse(session.savedAt) <= SMART_SESSION_MAX_AGE_MS)
    ) {
      storage.removeItem(SMART_INTAKE_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeSmartSession(session: SmartSession): void {
  const storage = progressStorage();
  if (!storage) return;
  try {
    storage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({ ...session, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Storage full or blocked: the journey continues without saving.
  }
}

/** R-31: removed when the audit starts. */
export function clearSmartSession(): void {
  try {
    progressStorage()?.removeItem(SMART_INTAKE_STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

/** R-31: after the audit starts only the order id stays in the browser, until
 * the order ends, so a reload shows the progress or the result. */
export const ACTIVE_ORDER_STORAGE_KEY = "nuave.activeOrder.v1" as const;

export function readActiveOrder(): string | null {
  try {
    const raw = progressStorage()?.getItem(ACTIVE_ORDER_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as { orderId?: unknown }) : null;
    return typeof value?.orderId === "string" &&
      /^[0-9a-f]{32}$/.test(value.orderId)
      ? value.orderId
      : null;
  } catch {
    return null;
  }
}

export function writeActiveOrder(orderId: string): void {
  try {
    progressStorage()?.setItem(
      ACTIVE_ORDER_STORAGE_KEY,
      JSON.stringify({ orderId }),
    );
  } catch {
    // The order still runs on the server; only the reload shortcut is lost.
  }
}

export function clearActiveOrder(): void {
  try {
    progressStorage()?.removeItem(ACTIVE_ORDER_STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

export function smartPackPrompts(pack: SmartQuestionPack) {
  return DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
    prompt_id,
    question: pack.approved[index]!,
    review_status: "needs_human_review" as const,
  }));
}
