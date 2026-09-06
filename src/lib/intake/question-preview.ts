import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import {
  buildDeterministicIndonesianPack,
  indonesianPackBlockers,
  validateCanonicalIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "../audit/questions-id";
import { parseSourceInput } from "../audit/source-input";
import type { PreparedItem } from "./fixtures";
import type { IntakeScreenId } from "./screens";
import {
  buildPreparedLabelIndex,
  containsSensitiveData,
  deriveCompetitorNames,
  deriveReviewRowsFromState,
  isReviewApprovable,
  type IntakeState,
  type MultiSelectAnswer,
  type ReviewRow,
  type SingleSelectAnswer,
} from "./state";

export type QuestionPreviewInput = {
  factVersion: number;
  /** Exact immutable Review rows sent across the preview adapter boundary. */
  review: ReviewRow[];
  brief: MinimizedIndonesianBrief;
};

export type QuestionPreviewSlot = {
  number: number;
  intent: string;
  unbranded: boolean;
  text: string;
};

export type QuestionPreviewPack = {
  factVersion: number;
  brandName: string;
  /** Frozen canonical context used to revalidate customer wording edits. */
  brief: MinimizedIndonesianBrief;
  slots: QuestionPreviewSlot[];
};

export type QuestionPreviewState =
  | { status: "idle" }
  | { status: "pending"; factVersion: number }
  | { status: "ready"; pack: QuestionPreviewPack }
  | { status: "failed"; factVersion: number; message: string };

export type QuestionPreviewRequestGate = {
  begin: () => number | null;
  finish: (requestId: number) => void;
  invalidate: () => void;
  activeRequestId: () => number;
};

export function createQuestionPreviewRequestGate(): QuestionPreviewRequestGate {
  let sequence = 0;
  let active: number | null = null;
  return {
    begin() {
      if (active !== null) return null;
      sequence += 1;
      active = sequence;
      return active;
    },
    finish(requestId) {
      if (active === requestId) active = null;
    },
    invalidate() {
      sequence += 1;
      active = null;
    },
    activeRequestId() {
      return active ?? sequence;
    },
  };
}

export function canReuseQuestionPreview(
  current: QuestionPreviewState,
  factVersion: number,
): current is { status: "ready"; pack: QuestionPreviewPack } {
  return current.status === "ready" && current.pack.factVersion === factVersion;
}

export type QuestionPreviewCompletion = "accept" | "stale" | "invalid";

export function classifyQuestionPreviewCompletion(
  activeRequestId: number,
  completionRequestId: number,
  expectedFactVersion: number,
  receivedFactVersion: number,
): QuestionPreviewCompletion {
  if (activeRequestId !== completionRequestId) return "stale";
  return expectedFactVersion === receivedFactVersion ? "accept" : "invalid";
}

export function questionPreviewAfterMaterialSave(
  current: QuestionPreviewState,
  material: boolean,
): QuestionPreviewState {
  return material ? { status: "idle" } : current;
}

export type QuestionPreviewAdapter = (
  input: QuestionPreviewInput,
) => Promise<QuestionPreviewPack>;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function labelFor(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: IntakeScreenId,
  id: string,
): string | undefined {
  return index
    .get(screenId)
    ?.find((item) => item.id === id)
    ?.label.trim();
}

function singleLabel(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: "s-branch" | "s-product",
  answer: SingleSelectAnswer,
): string | undefined {
  if (answer.selectedId === null) return undefined;
  return (
    answer.custom.find((item) => item.id === answer.selectedId)?.label.trim() ??
    labelFor(index, screenId, answer.selectedId)
  );
}

function selectedLabels(
  index: Map<IntakeScreenId, PreparedItem[]>,
  screenId: IntakeScreenId,
  answer: MultiSelectAnswer,
): string[] {
  const selected = new Set(answer.onIds);
  return [...(index.get(screenId) ?? []), ...answer.custom]
    .filter((item) => selected.has(item.id))
    .map((item) => item.label.trim())
    .filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function marketLabel(
  state: IntakeState,
  index: Map<IntakeScreenId, PreparedItem[]>,
): string {
  if (state.market.kind === "luar") return "Indonesia dan luar negeri";
  if (state.market.kind === "seluruh") return "Seluruh Indonesia";
  const areas = [
    ...state.market.areaIds
      .map((id) => labelFor(index, "s-market", id))
      .filter((label): label is string => Boolean(label)),
    ...state.market.customAreas,
  ];
  return unique(areas).join(", ");
}

function normalizedSource(value: string): string[] {
  const parsed = parseSourceInput(value);
  return parsed ? [parsed.normalizedUrl] : [];
}

/**
 * Freeze the smallest canonical input needed to preview the Indonesian 6/4
 * question pack. Empty optional fields stay empty; this adapter never invents
 * a customer, differentiator, decision criterion, conversion action, or URL.
 */
export function freezeQuestionPreviewInput(
  state: IntakeState,
  fixture: unknown,
  activePath: readonly IntakeScreenId[],
): QuestionPreviewInput {
  if (!isReviewApprovable(state, activePath)) {
    throw new Error("Intake review is not ready for question preview.");
  }
  if (containsSensitiveData(state.facts.text)) {
    throw new Error("Sensitive free text cannot enter question preview.");
  }

  const index = buildPreparedLabelIndex(fixture);
  const review = deriveReviewRowsFromState(state, fixture, activePath);
  const brandCard = index.get("s-brand")?.[0];
  const brandName = (
    state.brandCorrected?.name ??
    brandCard?.label ??
    ""
  ).trim();
  if (!brandName) throw new Error("A confirmed brand name is required.");

  const category =
    state.category.selectedId?.startsWith("category-custom") === true &&
    state.category.customLabel !== null
      ? state.category.customLabel.trim()
      : state.category.selectedId
        ? labelFor(index, "s-category", state.category.selectedId)
        : undefined;
  if (!category) throw new Error("A confirmed category is required.");

  const branch = singleLabel(index, "s-branch", state.branch);
  const product = singleLabel(index, "s-product", state.product);
  const scope =
    state.scope === "cabang"
      ? branch
        ? `Cabang: ${branch}`
        : undefined
      : state.scope === "produk"
        ? product
          ? `Produk: ${product}`
          : undefined
        : `Seluruh brand ${brandName}`;
  if (!scope) throw new Error("A confirmed audit scope is required.");

  const offerings =
    state.scope === "produk" && product
      ? [product]
      : selectedLabels(index, "s-offerings", state.offerings);
  if (offerings.length === 0) {
    throw new Error("At least one confirmed offering is required.");
  }

  const customerNeeds = selectedLabels(index, "s-customers", state.customers);
  const market = marketLabel(state, index);
  if (!market) throw new Error("A confirmed market is required.");

  const competitorNames = deriveCompetitorNames(state, fixture);
  const comparisonName = unique(competitorNames)[0];
  if (!state.competitors.noDirect && !comparisonName) {
    throw new Error(
      "A confirmed comparator or explicit no-direct choice is required.",
    );
  }

  const source = state.brandCorrected?.source ?? brandCard?.detail ?? "";
  const officialSources = normalizedSource(source);
  const mappedText = [
    ...review.flatMap((row) => [row.label, row.value]),
    ...officialSources,
  ];
  if (mappedText.some(containsSensitiveData)) {
    throw new Error("Sensitive intake text cannot enter question preview.");
  }

  const brief: MinimizedIndonesianBrief = {
    brand_name: brandName,
    brand_name_variants: [],
    scope,
    category,
    offerings: unique(offerings).slice(0, 3),
    customer_context: "",
    customer_needs: unique(customerNeeds),
    decision_considerations: [],
    differentiator: "",
    comparison_business: comparisonName
      ? { name: comparisonName, scope: "", source_url: "" }
      : null,
    known_accuracy_questions: [],
    conversion_action: "",
    official_source_urls: officialSources,
  };

  return deepFreeze({ factVersion: state.factVersion, review, brief });
}

/** Offline adapter: canonical matrix + deterministic Indonesian wording only. */
export const deterministicQuestionPreviewAdapter: QuestionPreviewAdapter =
  async (input) => {
    const questions = buildDeterministicIndonesianPack(input.brief);
    const issues = validateCanonicalIndonesianQuestionPack(
      questions,
      input.brief,
    );
    const blockers = indonesianPackBlockers(questions, input.brief);
    if (issues.length > 0 || blockers.length > 0) {
      throw new Error(
        "Canonical Indonesian question preview failed validation.",
      );
    }

    const slots = AUDIT_MEASUREMENT_MATRIX.map((slot, index) => ({
      number: slot.order,
      intent: slot.customerFacingLabel,
      unbranded: slot.auditedBrandIdentity === "forbidden",
      text: questions[index],
    }));

    return deepFreeze({
      factVersion: input.factVersion,
      brandName: input.brief.brand_name,
      brief: input.brief,
      slots,
    });
  };
