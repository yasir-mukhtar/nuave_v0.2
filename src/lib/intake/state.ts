/**
 * Real intake answer state for the new Airbnb-style journey (Phase 5).
 *
 * Authority: `docs/drafts/INTAKE_DATA_CONTRACT.md` §1 (IntakeState shape,
 * ConceptState prepared/selected/status semantics, §3 materiality) with the
 * 2026-09-05 amendment (service-channels concept, market reach+areas,
 * 15 screens), `docs/drafts/NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md` §7–§9
 * (canonical draft ownership, dependency rules, validation invariants), and
 * the handoff locked routes. Experience copy and interaction grammar are
 * owned by the experience contract — nothing here renders.
 *
 * What this module owns:
 * - `IntakeState`: one committed-answer record per screen, owned by the
 *   shell (`IntakeJourney`). Screens read it and write through it, so Back
 *   navigation and remounts restore committed answers instead of reseeding
 *   from the fixture. Staged (uncommitted) input — text being typed,
 *   add-line drafts, the brand-fix correction, the s-questions wording
 *   edits — stays component-local by design (journey §8.1: Kembali discards
 *   uncommitted changes).
 * - Seeding from prepared fixture values (extraction stand-in for preview).
 * - Blocking validity per screen, computed from committed answers
 *   (journey §9). Same blocking set the shell already gates on, plus
 *   offerings ≥1 for whole/location routes (journey §2 settles the Gate 0
 *   disagreement exactly this way; §9.5; §8.3 offerings row).
 * - The s-review projection from committed answers (journey §8.3: Review is
 *   a current projection of the committed active shell draft — never
 *   fixture fallbacks or inactive branch data).
 * - Fact-version state: `factVersion` starts at 1 and bumps on each saved
 *   review-edit that materially changes normalized output (data contract
 *   §3; experience s-review next/branch). `question-preview.ts` consumes it
 *   to supersede stale generation and invalidate a ready pack.
 *
 * Deliberately NOT here: the durable BusinessBrief/workflow handoff, storage
 * persistence (reload-resume is journey §8.1.9 "when supported by the approved
 * rebuild plan"), or live-provider question generation. The bounded offline
 * preview boundary lives in `question-preview.ts`.
 */

import type { FixtureScreenState, PreparedItem } from "./fixtures";
import { isBlockingScreen } from "./navigation";
import type { IntakeAnswerUpdater, IntakeScopeChoice } from "./navigation";
import type { IntakeScreenId } from "./screens";
import { useState } from "react";

/* ── Market reach kind (moved here so state owns the vocabulary; the screen
 * keeps its option deck and re-exports this type for its tests) ── */

export type MarketKind = "sekitar" | "beberapa" | "seluruh" | "luar";

/* ── Committed answer shapes (one per screen; prepared labels resolve via
 * the fixture label index, never stored twice) ── */

/** A2 single-select answer: exactly one chosen row + user-added rows. */
export type SingleSelectAnswer = {
  selectedId: string | null;
  custom: PreparedItem[];
};

/** A3 multi-select answer: on-ids + user-added items. */
export type MultiSelectAnswer = {
  onIds: string[];
  custom: PreparedItem[];
};

export type IntakeState = {
  /** s-scope: committed scope kind + the option id picked. */
  scope: IntakeScopeChoice;
  scopeOptionId: string | null;
  /** False until the owner explicitly picks (data contract §1.1 rule 3). */
  scopeCommitted: boolean;
  /** Committed brand correction (s-brand-fix Periksa lagi); null = prepared. */
  brandCorrected: { name: string; source: string } | null;
  /** Staged brand-fix draft (uncommitted until Periksa lagi; Batal resets). */
  brandFixDraft: { name: string; source: string };
  /** s-branch XOR s-product (inactive branch stays null, never hidden). */
  branch: SingleSelectAnswer;
  product: SingleSelectAnswer;
  /** s-category: one prepared id or a typed custom label. */
  category: { selectedId: string | null; customLabel: string | null };
  /** s-offerings (inactive on product scope) + s-customers chips. */
  offerings: MultiSelectAnswer;
  customers: MultiSelectAnswer;
  /** s-service: fixed channels, ≥1 (handoff multi-select amendment). */
  service: { onIds: string[] };
  /** s-market: reach + areas (areas only for area-based reach). */
  market: { kind: MarketKind | null; areaIds: string[]; customAreas: string[] };
  /** s-competitors: exclusive named mode vs no-direct mode. */
  competitors: { keptIds: string[]; custom: string[]; noDirect: boolean };
  /** s-facts: one optional public fact (empty = explicitly skipped). */
  facts: { text: string };
  /** Screens whose visible answer was explicitly committed with Lanjut. */
  confirmedScreens: IntakeScreenId[];
  /** Fact version: 1 until a saved review-edit materially changes output. */
  factVersion: number;
};

/* ── Fixture reading (prepared values seed committed answers; the fixture
 * never supplies answers after init) ── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFixtureScreen(
  fixture: unknown,
  screenId: IntakeScreenId,
): FixtureScreenState | null {
  if (!isRecord(fixture)) return null;
  const screens = fixture["screens"];
  if (!isRecord(screens)) return null;
  const screen = screens[screenId];
  if (!isRecord(screen)) return null;
  const prepared = Array.isArray(screen["prepared"])
    ? (screen["prepared"] as PreparedItem[])
    : [];
  const selected = Array.isArray(screen["selected"])
    ? (screen["selected"] as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  return { prepared, selected };
}

/* ── Pure seed helpers (moved here from the screen modules so init and
 * screens share one implementation; origin modules re-export them) ── */

/** Initial A2 selection: first fixture-selected id that is still prepared. */
export function initialSingleSelection(
  screen: FixtureScreenState | null,
): string | null {
  if (!screen) return null;
  const preparedIds = new Set(screen.prepared.map((item) => item.id));
  return screen.selected.find((id) => preparedIds.has(id)) ?? null;
}

/** Initial A3 on-set: fixture-selected ids that are still prepared. */
export function initialChipSelection(
  screen: FixtureScreenState | null,
): string[] {
  if (!screen) return [];
  const preparedIds = new Set(screen.prepared.map((item) => item.id));
  return screen.selected.filter((id) => preparedIds.has(id));
}

export function marketKindFromId(id: string): MarketKind | null {
  const lower = id.toLowerCase();
  if (/sekitar|nearby|lokasi/.test(lower)) return "sekitar";
  if (/beberapa|multi|kota|cities/.test(lower) && !/tambah/.test(lower))
    return "beberapa";
  if (/seluruh|nationwide|seluruh-indonesia|^all|national/.test(lower))
    return "seluruh";
  if (/luar|abroad|international|luar-negeri/.test(lower)) return "luar";
  return null;
}

export function seedMarketKind(
  screen: FixtureScreenState | null,
): MarketKind | null {
  if (!screen) return null;
  for (const id of screen.selected) {
    const kind = marketKindFromId(id);
    if (kind) return kind;
  }
  for (const item of screen.prepared) {
    if (!item.on) continue;
    const kind = marketKindFromId(item.id);
    if (kind) return kind;
  }
  return null;
}

export function seedCityIds(screen: FixtureScreenState | null): string[] {
  if (!screen) return [];
  return screen.prepared
    .filter(
      (item) =>
        /^city/i.test(item.id) ||
        (/kota|area|city/i.test(item.id) && marketKindFromId(item.id) === null),
    )
    .filter((item) => screen.selected.includes(item.id))
    .map((item) => item.id);
}

/** s-brand-fix blocks until the staged name is non-empty (source optional). */
export function isBrandFixValid(name: string): boolean {
  return name.trim().length > 0;
}

/** A2 single-select is valid once exactly one row is chosen. */
export function isSingleChoiceValid(selectedId: string | null): boolean {
  return selectedId !== null;
}

/** ≥1 service channel required (handoff multi-select amendment). */
export function isServiceSelectionValid(ids: readonly string[]): boolean {
  return ids.length > 0;
}

/**
 * Reach + areas both required for area-based reach (handoff: "required area
 * selection where applicable"). Pure, unit-tested.
 */
export function isMarketAnswerValid(
  kind: MarketKind | null,
  areaCount: number,
): boolean {
  if (kind === null) return false;
  if (kind === "sekitar" || kind === "beberapa") return areaCount > 0;
  return true;
}

/* ── Scope option mapping (fixed single-select ids ↔ journey scope) ── */

export const SCOPE_OPTION_IDS = [
  "scope-whole-brand",
  "scope-branch",
  "scope-product",
] as const;

/** scope-option id → journey scope answer (handoff locked routes). */
export function scopeKindOfOptionId(id: string): IntakeScopeChoice | null {
  if (id === "scope-branch") return "cabang";
  if (id === "scope-product") return "produk";
  if (id === "scope-whole-brand") return "brand";
  return null;
}

export function scopeOptionIdOfKind(scope: IntakeScopeChoice): string {
  if (scope === "cabang") return "scope-branch";
  if (scope === "produk") return "scope-product";
  return "scope-whole-brand";
}

/* ── Init: seed committed answers from prepared fixture values ── */

function seedSingle(
  fixture: unknown,
  screenId: IntakeScreenId,
): SingleSelectAnswer {
  return {
    selectedId: initialSingleSelection(readFixtureScreen(fixture, screenId)),
    custom: [],
  };
}

function seedMulti(
  fixture: unknown,
  screenId: IntakeScreenId,
): MultiSelectAnswer {
  return {
    onIds: initialChipSelection(readFixtureScreen(fixture, screenId)),
    custom: [],
  };
}

function readFixPrefill(fixture: unknown): { name: string; source: string } {
  const brand = readFixtureScreen(fixture, "s-brand");
  const card = brand?.prepared[0];
  const fix = readFixtureScreen(fixture, "s-brand-fix");
  const byId = new Map((fix?.prepared ?? []).map((item) => [item.id, item]));
  const fixName = byId.get("fix-name")?.label?.trim();
  const fixSourceRaw = byId.get("fix-source");
  const fixSource = (fixSourceRaw?.detail ?? fixSourceRaw?.label ?? "").trim();
  return {
    name:
      fixName !== undefined && fixName !== "" ? fixName : (card?.label ?? ""),
    source: fixSource !== "" ? fixSource : (card?.detail ?? ""),
  };
}

/** Build committed answers from prepared fixture values (one call, shell). */
export function createIntakeState(fixture: unknown): IntakeState {
  const scopeScreen = readFixtureScreen(fixture, "s-scope");
  const scopePrepared = (scopeScreen?.prepared ?? []).map((item) => item.id);
  const hasCanonical =
    scopePrepared.length > 0 &&
    SCOPE_OPTION_IDS.every((id) => scopePrepared.includes(id));
  const seedOptions = hasCanonical ? scopePrepared : [...SCOPE_OPTION_IDS];
  const seedSelected = hasCanonical
    ? (scopeScreen?.selected ?? [])
    : (scopeScreen?.selected ?? []).filter((id) =>
        (SCOPE_OPTION_IDS as readonly string[]).includes(id),
      );
  const scopeOptionId =
    seedSelected.find((id) =>
      (seedOptions as readonly string[]).includes(id),
    ) ?? null;
  const scope = scopeOptionId
    ? (scopeKindOfOptionId(scopeOptionId) ?? "brand")
    : "brand";

  const marketScreen = readFixtureScreen(fixture, "s-market");
  const marketKind = seedMarketKind(marketScreen);
  const marketAreas = seedCityIds(marketScreen);
  const competitorScreen = readFixtureScreen(fixture, "s-competitors");

  return {
    scope,
    scopeOptionId,
    scopeCommitted: scopeOptionId !== null,
    brandCorrected: null,
    brandFixDraft: readFixPrefill(fixture),
    branch: seedSingle(fixture, "s-branch"),
    product: seedSingle(fixture, "s-product"),
    category: {
      selectedId: initialSingleSelection(
        readFixtureScreen(fixture, "s-category"),
      ),
      customLabel: null,
    },
    offerings: seedMulti(fixture, "s-offerings"),
    customers: seedMulti(fixture, "s-customers"),
    service: {
      onIds: initialChipSelection(readFixtureScreen(fixture, "s-service")),
    },
    market: {
      kind: marketKind,
      /* Sekitar is single-select (workbench): seed at most one area. */
      areaIds: marketKind === "sekitar" ? marketAreas.slice(0, 1) : marketAreas,
      customAreas: [],
    },
    competitors: {
      keptIds: (competitorScreen?.selected ?? []).filter((id) =>
        /^competitor/i.test(id),
      ),
      custom: (competitorScreen?.selected ?? []).filter(
        (id) => !/^competitor/i.test(id),
      ),
      noDirect: false,
    },
    facts: { text: "" },
    confirmedScreens: [],
    factVersion: 1,
  };
}

/* ── Prepared label index (display lookup only; answers stay in state) ── */

/** Prepared display items per screen, for label resolution + review rows. */
export function buildPreparedLabelIndex(
  fixture: unknown,
): Map<IntakeScreenId, PreparedItem[]> {
  const index = new Map<IntakeScreenId, PreparedItem[]>();
  if (!isRecord(fixture)) return index;
  const screens = fixture["screens"];
  if (!isRecord(screens)) return index;
  for (const [id, screen] of Object.entries(screens)) {
    if (!isRecord(screen) || !Array.isArray(screen["prepared"])) continue;
    index.set(
      id as IntakeScreenId,
      (screen["prepared"] as PreparedItem[]).filter(
        (item) => typeof item?.id === "string",
      ),
    );
  }
  return index;
}

function labelFor(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: IntakeScreenId,
  id: string,
): string | undefined {
  return index.get(screenId)?.find((item) => item.id === id)?.label;
}

/* ── Pure answer transitions (screens dispatch these through updateAnswer;
 * every one returns a new state object) ── */

export function setScopeAnswer(
  state: IntakeState,
  optionId: string,
): IntakeState {
  const scope = scopeKindOfOptionId(optionId) ?? state.scope;
  return { ...state, scope, scopeOptionId: optionId, scopeCommitted: true };
}

/** Commit a scope option and invalidate all scope-conditioned answers once. */
export function commitScopeOption(
  state: IntakeState,
  fixture: unknown,
  optionId: string,
): IntakeState {
  const scope = scopeKindOfOptionId(optionId);
  if (scope === null) return state;
  if (state.scope === scope && state.scopeCommitted) return state;
  return applyScopeChange(state, fixture, scope);
}

export function setSingleAnswer(
  state: IntakeState,
  screen: "branch" | "product",
  selectedId: string | null,
): IntakeState {
  return { ...state, [screen]: { ...state[screen], selectedId } };
}

export function addSingleCustom(
  state: IntakeState,
  screen: "branch" | "product",
  item: PreparedItem,
): IntakeState {
  const answer = state[screen];
  return {
    ...state,
    [screen]: {
      selectedId: item.id,
      custom: [...answer.custom, item],
    },
  };
}

const CATEGORY_DEPENDENT_SCREENS: readonly IntakeScreenId[] = [
  "s-offerings",
  "s-customers",
  "s-competitors",
];

function withoutCategoryDependentConfirmations(
  state: IntakeState,
): IntakeScreenId[] {
  return state.confirmedScreens.filter(
    (screenId) => !CATEGORY_DEPENDENT_SCREENS.includes(screenId),
  );
}

export function setCategoryAnswer(
  state: IntakeState,
  selectedId: string | null,
): IntakeState {
  const customLabel =
    selectedId?.startsWith("category-custom") === true
      ? state.category.customLabel
      : null;
  if (
    selectedId === state.category.selectedId &&
    customLabel === state.category.customLabel
  ) {
    return state;
  }
  return {
    ...state,
    category: { selectedId, customLabel },
    confirmedScreens: withoutCategoryDependentConfirmations(state),
  };
}

/** Typed custom category replaces the previous custom label (one slot). */
export function setCategoryCustom(
  state: IntakeState,
  label: string,
): IntakeState {
  const normalized = label.trim();
  if (
    state.category.selectedId?.startsWith("category-custom") === true &&
    state.category.customLabel?.trim() === normalized
  ) {
    return state;
  }
  const previous = state.category.customLabel;
  const id = `category-custom-${previous === null ? 1 : 2}`;
  return {
    ...state,
    category: { selectedId: id, customLabel: normalized },
    confirmedScreens: withoutCategoryDependentConfirmations(state),
  };
}

export function toggleMultiAnswer(
  state: IntakeState,
  screen: "offerings" | "customers",
  id: string,
): IntakeState {
  const answer = state[screen];
  const onIds = answer.onIds.includes(id)
    ? answer.onIds.filter((entry) => entry !== id)
    : [...answer.onIds, id];
  return { ...state, [screen]: { ...answer, onIds } };
}

export function addMultiCustom(
  state: IntakeState,
  screen: "offerings" | "customers",
  item: PreparedItem,
): IntakeState {
  const answer = state[screen];
  if (answer.onIds.includes(item.id)) return state;
  return {
    ...state,
    [screen]: {
      onIds: [...answer.onIds, item.id],
      custom: [...answer.custom, item],
    },
  };
}

export function toggleServiceChannel(
  state: IntakeState,
  id: string,
): IntakeState {
  const onIds = state.service.onIds.includes(id)
    ? state.service.onIds.filter((entry) => entry !== id)
    : [...state.service.onIds, id];
  return { ...state, service: { onIds } };
}

export function setMarketKind(
  state: IntakeState,
  kind: MarketKind,
): IntakeState {
  if (state.market.kind === kind) return state;
  /* Reach change resets the area pick (workbench behavior). */
  return { ...state, market: { kind, areaIds: [], customAreas: [] } };
}

export function toggleMarketArea(state: IntakeState, id: string): IntakeState {
  const single = state.market.kind === "sekitar";
  const areaIds = single
    ? [id]
    : state.market.areaIds.includes(id)
      ? state.market.areaIds.filter((entry) => entry !== id)
      : [...state.market.areaIds, id];
  return { ...state, market: { ...state.market, areaIds } };
}

export function addMarketArea(state: IntakeState, area: string): IntakeState {
  if (state.market.customAreas.includes(area)) return state;
  return {
    ...state,
    market: {
      ...state.market,
      customAreas: [...state.market.customAreas, area],
    },
  };
}

export function removeMarketArea(
  state: IntakeState,
  area: string,
): IntakeState {
  return {
    ...state,
    market: {
      ...state.market,
      customAreas: state.market.customAreas.filter((entry) => entry !== area),
    },
  };
}

export function toggleCompetitor(state: IntakeState, id: string): IntakeState {
  const keptIds = state.competitors.keptIds.includes(id)
    ? state.competitors.keptIds.filter((entry) => entry !== id)
    : [...state.competitors.keptIds, id];
  return {
    ...state,
    competitors: { ...state.competitors, keptIds, noDirect: false },
  };
}

export function addCompetitor(state: IntakeState, name: string): IntakeState {
  if (state.competitors.custom.includes(name)) return state;
  return {
    ...state,
    competitors: {
      ...state.competitors,
      custom: [...state.competitors.custom, name],
      noDirect: false,
    },
  };
}

export function removeCompetitor(
  state: IntakeState,
  name: string,
): IntakeState {
  return {
    ...state,
    competitors: {
      ...state.competitors,
      custom: state.competitors.custom.filter((entry) => entry !== name),
    },
  };
}

export function setCompetitorsNoDirect(
  state: IntakeState,
  noDirect: boolean,
): IntakeState {
  return {
    ...state,
    competitors: noDirect
      ? { keptIds: [], custom: [], noDirect: true }
      : { ...state.competitors, noDirect: false },
  };
}

export function setFactsText(state: IntakeState, text: string): IntakeState {
  return { ...state, facts: { text } };
}

export function setBrandFixDraft(
  state: IntakeState,
  draft: { name: string; source: string },
): IntakeState {
  return { ...state, brandFixDraft: draft };
}

/** Batal: drop the staged correction, restore the prefill. */
export function resetBrandFixDraft(
  state: IntakeState,
  fixture: unknown,
): IntakeState {
  return { ...state, brandFixDraft: readFixPrefill(fixture) };
}

/** Periksa lagi: commit the staged correction as the confirmed identity. */
export function commitBrandFix(state: IntakeState): IntakeState {
  return {
    ...state,
    brandCorrected: {
      name: state.brandFixDraft.name.trim(),
      source: state.brandFixDraft.source.trim(),
    },
  };
}

/* ── Blocking validity from committed answers (journey §9) ── */

export function isScreenAnswerValid(
  screenId: IntakeScreenId,
  state: IntakeState,
): boolean {
  switch (screenId) {
    case "s-brand":
      /* Editorial implicit confirm: Lanjut confirms the shown card. */
      return true;
    case "s-brand-fix":
      return isBrandFixValid(state.brandFixDraft.name);
    case "s-scope":
      return state.scopeCommitted;
    case "s-branch":
      return isSingleChoiceValid(state.branch.selectedId);
    case "s-product":
      return isSingleChoiceValid(state.product.selectedId);
    case "s-category":
      return isSingleChoiceValid(state.category.selectedId);
    case "s-offerings":
      /* Journey §2 settles the Gate 0 disagreement: whole/location routes
       * require ≥1 selected offering. Custom rows remain available after
       * deselection, so only the committed on-set counts. */
      return state.offerings.onIds.length > 0;
    case "s-service":
      return isServiceSelectionValid(state.service.onIds);
    case "s-market":
      return isMarketAnswerValid(
        state.market.kind,
        state.market.areaIds.length + state.market.customAreas.length,
      );
    case "s-competitors": {
      const namedCount =
        state.competitors.keptIds.length + state.competitors.custom.length;
      return state.competitors.noDirect ? namedCount === 0 : namedCount > 0;
    }
    default:
      /* s-crawl, s-customers, s-facts, s-review (separate gate), s-questions:
       * never block on their own answer. */
      return true;
  }
}

/** Client-side sensitive-data stop for any intake text sent downstream. */
export function containsSensitiveData(text: string): boolean {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return true;
  if (/(?:\+?62|0)[\d\s\-().]{8,}/.test(text)) return true;
  if (/(?:\d[\s-]?){13,19}/.test(text)) return true;
  if (
    /(?:access[_ -]?token|refresh[_ -]?token|api[_ -]?key|token|secret|password|passwd)\s*[:=]\s*\S+/i.test(
      text,
    )
  )
    return true;
  if (/\b(nik|ktp|no\.?\s*(rekening|ktp)|cvv|cvv2|pin\s*atm)\b/i.test(text))
    return true;
  return false;
}

const CONFIRMATION_SCREEN_IDS: readonly IntakeScreenId[] = [
  "s-brand",
  "s-scope",
  "s-branch",
  "s-product",
  "s-category",
  "s-offerings",
  "s-customers",
  "s-service",
  "s-market",
  "s-competitors",
  "s-facts",
];

export function screenRequiresConfirmation(screenId: IntakeScreenId): boolean {
  return CONFIRMATION_SCREEN_IDS.includes(screenId);
}

export function confirmIntakeScreen(
  state: IntakeState,
  screenId: IntakeScreenId,
): IntakeState {
  if (
    !screenRequiresConfirmation(screenId) ||
    state.confirmedScreens.includes(screenId)
  ) {
    return state;
  }
  return {
    ...state,
    scopeCommitted: screenId === "s-scope" ? true : state.scopeCommitted,
    confirmedScreens: [...state.confirmedScreens, screenId],
  };
}

export function nextUnconfirmedScreen(
  state: IntakeState,
  activePath: readonly IntakeScreenId[],
  after: IntakeScreenId,
): IntakeScreenId | null {
  const start = activePath.indexOf(after);
  if (start === -1) return null;
  return (
    activePath
      .slice(start + 1)
      .find(
        (screenId) =>
          screenRequiresConfirmation(screenId) &&
          !state.confirmedScreens.includes(screenId),
      ) ?? null
  );
}

/**
 * Review approval gate (journey §8.3 + §9.12): every answer screen on the
 * active path was explicitly committed, every blocking answer is valid, and
 * no dependent answer awaits reconfirmation. Unsafe optional free text also
 * blocks the handoff so it can never enter question generation.
 */
export function isReviewApprovable(
  state: IntakeState,
  activePath: readonly IntakeScreenId[],
): boolean {
  return (
    !containsSensitiveData(state.facts.text) &&
    activePath.every(
      (screenId) =>
        !screenRequiresConfirmation(screenId) ||
        state.confirmedScreens.includes(screenId),
    ) &&
    activePath.every(
      (screenId) =>
        !isBlockingScreen(screenId) || isScreenAnswerValid(screenId, state),
    )
  );
}

/* ── s-review projection from committed answers (journey §8.3) ── */

export type ReviewRow = {
  key: string;
  label: string;
  value: string;
  /** Owning screen for the chevron correction link. */
  target: IntakeScreenId;
  advisory?: boolean;
};

function singleLabel(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: IntakeScreenId,
  answer: SingleSelectAnswer,
): string | undefined {
  if (answer.selectedId === null) return undefined;
  const custom = answer.custom.find(
    (item) => item.id === answer.selectedId,
  )?.label;
  return custom ?? labelFor(index, screenId, answer.selectedId);
}

function multiLabels(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: IntakeScreenId,
  answer: MultiSelectAnswer,
): string[] {
  const selected = new Set(answer.onIds);
  return [...(index.get(screenId) ?? []), ...answer.custom]
    .filter((item) => selected.has(item.id))
    .map((item) => item.label);
}

export function deriveCompetitorNames(
  state: IntakeState,
  fixture: unknown,
): string[] {
  if (state.competitors.noDirect) return [];
  const index = buildPreparedLabelIndex(fixture);
  const selected = new Set(state.competitors.keptIds);
  const prepared = (index.get("s-competitors") ?? [])
    .filter((item) => selected.has(item.id))
    .map((item) => item.label.split(/\s+—\s+/, 1)[0].trim());
  const custom = state.competitors.custom
    .map((name) => name.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return [...new Set([...prepared, ...custom])];
}

/**
 * Meaning-level review rows from the committed draft. Same row grammar and
 * fallback strings as the fixture projection; values come only from state
 * (fixture supplies prepared display labels, never answers). Advisory
 * conflict rows still read fixture metadata — they have no answer
 * counterpart by design.
 */
export function deriveReviewRowsFromState(
  state: IntakeState,
  fixture: unknown,
  activeScreens?: readonly IntakeScreenId[],
): ReviewRow[] {
  const index = buildPreparedLabelIndex(fixture);
  const active = (id: IntakeScreenId) =>
    activeScreens === undefined || activeScreens.includes(id);

  const scopeValue =
    (state.scopeOptionId !== null
      ? labelFor(index, "s-scope", state.scopeOptionId)
      : undefined) ?? "Belum dipilih";

  const branchLabel = singleLabel(index, "s-branch", state.branch);
  const productLabel = singleLabel(index, "s-product", state.product);
  const targetLabel =
    state.scope === "cabang"
      ? branchLabel
      : state.scope === "produk"
        ? productLabel
        : undefined;
  const targetValue = targetLabel !== undefined ? targetLabel : "Belum dipilih";

  const categoryLabel =
    state.category.selectedId !== null
      ? ((state.category.customLabel !== null &&
        state.category.selectedId.startsWith("category-custom")
          ? state.category.customLabel
          : labelFor(index, "s-category", state.category.selectedId)) ??
        undefined)
      : undefined;

  const offeringLabels = multiLabels(index, "s-offerings", state.offerings);
  const reviewOfferingLabels =
    state.scope === "produk"
      ? productLabel === undefined
        ? []
        : [productLabel]
      : offeringLabels;
  const reviewOfferingTarget: IntakeScreenId =
    state.scope === "produk" ? "s-product" : "s-offerings";
  const customerLabels = multiLabels(index, "s-customers", state.customers);
  const serviceLabels = multiLabels(index, "s-service", {
    onIds: state.service.onIds,
    custom: [],
  });

  let marketValue: string;
  if (state.market.kind === null) {
    marketValue = "Belum dipilih";
  } else if (state.market.kind === "luar") {
    marketValue = "Indonesia dan luar negeri";
  } else if (state.market.kind === "seluruh") {
    marketValue = "Seluruh Indonesia";
  } else {
    const selectedAreas = new Set(state.market.areaIds);
    const areaLabels = (index.get("s-market") ?? [])
      .filter((item) => selectedAreas.has(item.id))
      .map((item) => item.label)
      .filter(
        (label) =>
          label !== "Sekitar satu area" &&
          label !== "Beberapa area" &&
          label !== "Seluruh Indonesia" &&
          label !== "Indonesia dan luar negeri",
      );
    const customAreas = state.market.customAreas
      .map((area) => area.trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
    const all = [...areaLabels, ...customAreas];
    marketValue = all.length > 0 ? all.join(", ") : "Belum dipilih";
  }

  const competitorNames = deriveCompetitorNames(state, fixture);
  const competitorValue =
    competitorNames.length > 0
      ? competitorNames.join(", ")
      : state.competitors.noDirect
        ? "Tidak ada pesaing langsung. Audit membandingkan dengan alternatif dalam kategori Anda."
        : "Belum dikonfirmasi";

  const factsText = state.facts.text.trim();
  const factsValue =
    factsText.length > 0 ? state.facts.text : "Tidak ditambahkan";

  const brandCard = index.get("s-brand")?.[0];
  const brandValue = state.brandCorrected
    ? `${state.brandCorrected.name}${state.brandCorrected.source !== "" ? ` · ${state.brandCorrected.source}` : ""}`
    : brandCard
      ? `${brandCard.label}${brandCard.detail?.trim() ? ` · ${brandCard.detail.trim()}` : ""}`
      : "Belum dipilih";

  const rows: ReviewRow[] = [
    { key: "brand", label: "Brand", value: brandValue, target: "s-brand" },
    {
      key: "scope",
      label: "Fokus audit",
      value: scopeValue,
      target: "s-scope",
    },
  ];
  if (active("s-branch") || active("s-product")) {
    rows.push({
      key: "target",
      label: "Target audit",
      value: targetValue,
      target: state.scope === "cabang" ? "s-branch" : "s-product",
    });
  }
  rows.push(
    {
      key: "category",
      label: "Kategori",
      value: categoryLabel ?? "Belum dipilih",
      target: "s-category",
    },
    {
      key: "offerings",
      label: "Produk dan layanan",
      value:
        reviewOfferingLabels.length > 0
          ? reviewOfferingLabels.join(", ")
          : "Belum dikonfirmasi",
      target: reviewOfferingTarget,
    },
    {
      key: "customers",
      label: "Alasan pelanggan",
      value:
        customerLabels.length > 0
          ? customerLabels.join(", ")
          : "Tidak ditambahkan",
      target: "s-customers",
    },
    {
      key: "service",
      label: "Cara layanan",
      value:
        serviceLabels.length > 0 ? serviceLabels.join(", ") : "Belum dipilih",
      target: "s-service",
    },
    { key: "market", label: "Pasar", value: marketValue, target: "s-market" },
    {
      key: "competitors",
      label: "Pembanding",
      value: competitorValue,
      target: "s-competitors",
    },
    {
      key: "facts",
      label: "Hal yang wajib benar",
      value: factsValue,
      target: "s-facts",
    },
  );

  const reviewScreen = readFixtureScreen(fixture, "s-review");
  if (reviewScreen) {
    for (const item of reviewScreen.prepared) {
      if (!/^row-conflict/.test(item.id)) continue;
      if (!reviewScreen.selected.includes(item.id)) continue;
      rows.push({
        key: item.id,
        label: "Perbedaan sumber",
        value: item.label,
        target: "s-brand",
        advisory: true,
      });
    }
  }
  return rows;
}

/* ── Fact-version state (data contract §3 materiality) ── */

/**
 * Stable summary of committed output. Anything that does not change this
 * string is non-material (UI-only, staged drafts, empty↔empty edits); the
 * fact version survives all of those untouched.
 */
export function summarizeCommittedAnswers(
  state: IntakeState,
  fixture?: unknown,
): string {
  const index = buildPreparedLabelIndex(fixture);
  const semanticSingle = (
    screenId: "s-branch" | "s-product",
    answer: SingleSelectAnswer,
  ) => singleLabel(index, screenId, answer) ?? answer.selectedId;
  const semanticMulti = (
    screenId: IntakeScreenId,
    answer: MultiSelectAnswer,
  ) => {
    const custom = new Map(answer.custom.map((item) => [item.id, item.label]));
    return [
      ...new Set(
        answer.onIds
          .map(
            (id) =>
              custom.get(id)?.trim() ?? labelFor(index, screenId, id) ?? id,
          )
          .filter(Boolean),
      ),
    ].sort();
  };
  const branch = semanticSingle("s-branch", state.branch);
  const product = semanticSingle("s-product", state.product);
  const target =
    state.scope === "cabang"
      ? branch
      : state.scope === "produk"
        ? product
        : null;
  const category =
    state.category.selectedId?.startsWith("category-custom") === true &&
    state.category.customLabel !== null
      ? state.category.customLabel.trim()
      : state.category.selectedId
        ? (labelFor(index, "s-category", state.category.selectedId) ??
          state.category.selectedId)
        : null;
  const competitorNames = deriveCompetitorNames(state, fixture);

  return JSON.stringify({
    scope: state.scope,
    brandCorrected: state.brandCorrected
      ? {
          name: state.brandCorrected.name.trim(),
          source: state.brandCorrected.source.trim(),
        }
      : null,
    target,
    category,
    offerings:
      state.scope === "produk" && product
        ? [product]
        : semanticMulti("s-offerings", state.offerings),
    customers: semanticMulti("s-customers", state.customers),
    service: state.service.onIds
      .map((id) => labelFor(index, "s-service", id) ?? id)
      .sort(),
    market: {
      kind: state.market.kind,
      areas: [
        ...state.market.areaIds.map(
          (id) => labelFor(index, "s-market", id) ?? id,
        ),
        ...state.market.customAreas.map((area) => area.trim()),
      ].sort(),
    },
    competitors: {
      names: [...new Set(competitorNames.filter(Boolean))].sort(),
      noDirect: state.competitors.noDirect,
    },
    facts: state.facts.text.trim(),
  });
}

/** True when saving `next` over `prev` changes normalized output. */
export function isMaterialChange(
  prev: IntakeState,
  next: IntakeState,
  fixture?: unknown,
): boolean {
  return (
    summarizeCommittedAnswers(prev, fixture) !==
    summarizeCommittedAnswers(next, fixture)
  );
}

export function withBumpedFactVersion(state: IntakeState): IntakeState {
  return { ...state, factVersion: state.factVersion + 1 };
}

/* ── Scope-change invalidation (journey §8.2) ── */

/**
 * Apply a new scope kind: the old location/product target leaves the active
 * draft, product scope deactivates general offerings, and target-conditioned
 * answers (branch/product, offerings, competitors) reseed from prepared values
 * for re-confirmation. Category, customers, service, market, and facts survive
 * when they remain semantically valid across a scope change.
 */
export function applyScopeChange(
  state: IntakeState,
  fixture: unknown,
  scope: IntakeScopeChoice,
): IntakeState {
  const seeds = createIntakeState(fixture);
  return {
    ...state,
    scope,
    scopeOptionId: scopeOptionIdOfKind(scope),
    scopeCommitted: true,
    branch: seeds.branch,
    product: seeds.product,
    offerings: scope === "produk" ? { onIds: [], custom: [] } : seeds.offerings,
    market: state.market,
    competitors: seeds.competitors,
    confirmedScreens: state.confirmedScreens.filter(
      (screenId) =>
        ![
          "s-scope",
          "s-branch",
          "s-product",
          "s-offerings",
          "s-competitors",
        ].includes(screenId),
    ),
  };
}

/* ── Shell/fallback binding ── */

/**
 * Bind a screen to committed answers. The shell always provides both; slots
 * rendered without them (unit tests) seed an equivalent isolated state from
 * `fixture` and render identically — one code path either way.
 */
export function useIntakeAnswers(
  fixture: unknown,
  answers?: IntakeState,
  updateAnswer?: IntakeAnswerUpdater,
): [IntakeState, IntakeAnswerUpdater] {
  const [fallback, setFallback] = useState(() => createIntakeState(fixture));
  return [answers ?? fallback, updateAnswer ?? setFallback];
}
