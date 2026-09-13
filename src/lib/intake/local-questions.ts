/** Offline preview boundary. Never imports a provider or executes an audit. */
import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import {
  buildDeterministicIndonesianPack,
  categoryComparisonFallbackName,
  containsIndonesianComparisonIdentity,
  indonesianPackBlockers,
  normalizeIndonesianIdentity,
  validateCanonicalIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "../audit/questions-id";
import { parseSourceInput } from "../audit/source-input";
import { promptPackSchema, type PromptPack } from "../audit/types";
import type { PreparedItem } from "./fixtures";
import type { IntakeScreenId } from "./screens";
import {
  buildPreparedLabelIndex,
  deriveReviewRowsFromState,
  isReviewApprovable,
  type IntakeState,
  type ReviewRow,
} from "./state";

export const LOCAL_INTAKE_INPUT_VERSION = "nuave-local-intake-input-v1";
export const LOCAL_QUESTION_PACK_VERSION = "nuave-local-questions-v1";

const SERVICE_CHANNELS = {
  "service-location": "on_premise",
  "service-customer": "on_customer",
  "service-delivery": "delivery",
  "service-online": "online",
} as const;
type ServiceChannel = (typeof SERVICE_CHANNELS)[keyof typeof SERVICE_CHANNELS];

/** Exact customer-confirmed meanings, independent of the older engine brief.
 * In particular optional reasons stay empty, and channels / comparators stay
 * arrays. Nothing is invented merely to satisfy BusinessBrief's older minima.
 */
export type FrozenLocalIntake = {
  version: typeof LOCAL_INTAKE_INPUT_VERSION;
  factVersion: number;
  fingerprint: string;
  reviewRows: ReviewRow[];
  confirmed: {
    brand: { name: string; primarySource: string };
    scope: IntakeState["scope"];
    target: { name: string; detail: string } | null;
    category: string;
    offerings: string[];
    customerReasons: string[];
    serviceChannels: { channel: ServiceChannel; label: string }[];
    market: {
      reach: NonNullable<IntakeState["market"]["kind"]>;
      areas: string[];
    };
    comparators: { mode: "named" | "category-alternatives"; names: string[] };
    publicFact: string;
  };
};

export type LocalQuestionPack = {
  version: typeof LOCAL_QUESTION_PACK_VERSION;
  factVersion: number;
  inputFingerprint: string;
  revision: number;
  input: FrozenLocalIntake;
  /** Existing validator/generator input; the full snapshot above is retained. */
  generationInput: MinimizedIndonesianBrief;
  promptPack: PromptPack;
  originals: string[];
  generation: {
    kind: "deterministic-local";
    providerCalls: 0;
    auditExecuted: false;
  };
};

export type LocalStartHandoff = {
  version: "nuave-local-start-v1";
  mode: "local-simulation";
  auditExecuted: false;
  providerCalls: 0;
  input: FrozenLocalIntake;
  questions: LocalQuestionPack;
};

function immutable<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

/** Deterministic equality key, deliberately collision-free rather than a hash.
 * It stays local with the snapshot, never in URLs, events, logs, or analytics. */
function fingerprintOf(
  input: Pick<FrozenLocalIntake, "confirmed" | "reviewRows">,
) {
  return JSON.stringify({
    confirmed: input.confirmed,
    reviewRows: input.reviewRows,
  });
}

export function freezeLocalIntake(
  state: IntakeState,
  fixture: unknown,
  activePath: readonly IntakeScreenId[],
): FrozenLocalIntake {
  if (!isReviewApprovable(state, activePath)) {
    throw new Error(
      "Konfirmasi kembali informasi bisnis sebelum membuat pertanyaan.",
    );
  }
  const index = buildPreparedLabelIndex(fixture);
  const selected = (
    screen: IntakeScreenId,
    id: string,
    custom: PreparedItem[] = [],
  ) => {
    const item =
      custom.find((entry) => entry.id === id) ??
      index.get(screen)?.find((entry) => entry.id === id);
    if (!item?.label.trim())
      throw new Error("Ada jawaban yang perlu dikonfirmasi kembali.");
    return item;
  };
  const labels = (
    screen: IntakeScreenId,
    ids: string[],
    custom: PreparedItem[] = [],
  ) => ids.map((id) => selected(screen, id, custom).label.trim());
  const brandCard = index.get("s-brand")?.[0];
  const brand = state.brandCorrected ?? {
    name: brandCard?.label ?? "",
    source: brandCard?.detail ?? "",
  };
  if (!brand.name.trim() || !parseSourceInput(brand.source)) {
    throw new Error(
      "Konfirmasi nama dan sumber brand sebelum membuat pertanyaan.",
    );
  }
  let target: FrozenLocalIntake["confirmed"]["target"] = null;
  if (state.scope !== "brand") {
    const owner = state.scope === "cabang" ? "s-branch" : "s-product";
    const answer = state.scope === "cabang" ? state.branch : state.product;
    const item = selected(owner, answer.selectedId ?? "", answer.custom);
    target = { name: item.label.trim(), detail: item.detail?.trim() ?? "" };
  }
  const category =
    state.category.customLabel &&
    state.category.selectedId?.startsWith("category-custom")
      ? state.category.customLabel.trim()
      : selected("s-category", state.category.selectedId ?? "").label.trim();
  const serviceChannels = state.service.onIds.map((id) => {
    const channel = SERVICE_CHANNELS[id as keyof typeof SERVICE_CHANNELS];
    if (!channel)
      throw new Error("Konfirmasi kembali cara layanan bisnis Anda.");
    return { channel, label: selected("s-service", id).label.trim() };
  });
  const reach = state.market.kind;
  if (!reach) throw new Error("Konfirmasi jangkauan pasar Anda.");
  const areaBased = reach === "sekitar" || reach === "beberapa";
  const areas = areaBased
    ? [
        ...labels("s-market", state.market.areaIds),
        ...state.market.customAreas.map((area) => area.trim()),
      ]
    : [];
  const names = state.competitors.noDirect
    ? []
    : [
        ...labels("s-competitors", state.competitors.keptIds),
        ...state.competitors.custom.map((name) => name.trim()),
      ];
  const confirmed: FrozenLocalIntake["confirmed"] = {
    brand: { name: brand.name.trim(), primarySource: brand.source.trim() },
    scope: state.scope,
    target,
    category,
    // Product is carried by the target; a general-offerings row is inactive.
    offerings:
      state.scope === "produk"
        ? []
        : labels("s-offerings", state.offerings.onIds, state.offerings.custom),
    customerReasons: labels(
      "s-customers",
      state.customers.onIds,
      state.customers.custom,
    ),
    serviceChannels,
    market: { reach, areas },
    comparators: {
      mode: state.competitors.noDirect ? "category-alternatives" : "named",
      names,
    },
    publicFact: state.facts.text.trim(),
  };
  const reviewRows = deriveReviewRowsFromState(state, fixture, activePath).map(
    (row) => ({ ...row }),
  );
  return immutable({
    version: LOCAL_INTAKE_INPUT_VERSION,
    factVersion: state.factVersion,
    fingerprint: fingerprintOf({ confirmed, reviewRows }),
    confirmed,
    reviewRows,
  });
}

function marketText(input: FrozenLocalIntake) {
  const market = input.confirmed.market;
  if (market.reach === "seluruh") return "seluruh Indonesia";
  if (market.reach === "luar") return "Indonesia dan luar negeri";
  return market.areas.join(" dan ");
}

function targetText(input: FrozenLocalIntake) {
  const target = input.confirmed.target;
  return target
    ? `${target.name}${input.confirmed.scope === "cabang" && target.detail ? ` — ${target.detail}` : ""}`
    : "";
}

function generationInputOf(input: FrozenLocalIntake): MinimizedIndonesianBrief {
  const facts = input.confirmed;
  const source = parseSourceInput(facts.brand.primarySource)!;
  const categoryTokens = new Set(
    normalizeIndonesianIdentity(facts.category).split(" "),
  );
  const distinctiveBrandTokens = normalizeIndonesianIdentity(facts.brand.name)
    .split(" ")
    .filter((token) => token.length > 3 && !categoryTokens.has(token));
  const brandedOfferings = [
    ...facts.offerings,
    ...(facts.target && facts.scope === "produk" ? [facts.target.name] : []),
  ].filter((name) => {
    const tokens = normalizeIndonesianIdentity(name).split(" ");
    return distinctiveBrandTokens.some((token) => tokens.includes(token));
  });
  return {
    brand_name: facts.brand.name,
    brand_name_variants: [
      ...brandedOfferings,
      ...(source.sourceType === "instagram"
        ? [new URL(source.normalizedUrl).pathname.replace(/^\//, "")]
        : []),
    ],
    // Geography is allowed in unnamed questions; entity names are not.
    scope: marketText(input),
    category: facts.category,
    offerings:
      facts.scope === "produk" ? [facts.target!.name] : [...facts.offerings],
    customer_context: "",
    customer_needs: [...facts.customerReasons],
    decision_considerations: [],
    differentiator: "",
    comparison_business: {
      // All selected names are one comparison group within the fixed slot.
      name:
        facts.comparators.mode === "named"
          ? facts.comparators.names.join(" dan ")
          : categoryComparisonFallbackName(facts.category),
      scope: marketText(input),
      source_url: "",
    },
    known_accuracy_questions: [],
    conversion_action: "",
    official_source_urls: [
      parseSourceInput(facts.brand.primarySource)!.normalizedUrl,
    ],
  };
}

function questionIssues(pack: LocalQuestionPack): string[] {
  const texts = pack.promptPack.prompts.map((prompt) => prompt.question);
  const issues = validateCanonicalIndonesianQuestionPack(
    texts,
    pack.generationInput,
  ).map((issue) => issue.message);
  if (indonesianPackBlockers(texts, pack.generationInput).length > 0) {
    issues.push(
      "Gunakan pertanyaan tentang bisnis dan keputusan pelanggan, tanpa informasi pribadi atau sensitif.",
    );
  }
  const target = pack.input.confirmed.target;
  const brandTokens = normalizeIndonesianIdentity(
    pack.input.confirmed.brand.name,
  ).split(" ");
  const brandedProduct =
    target &&
    pack.input.confirmed.scope === "produk" &&
    brandTokens.some(
      (token) =>
        token.length > 3 &&
        normalizeIndonesianIdentity(target.name).split(" ").includes(token),
    );
  texts.forEach((text, index) => {
    const slot = AUDIT_MEASUREMENT_MATRIX[index];
    if (
      slot?.comparisonTargetIdentity === "forbidden" &&
      pack.input.confirmed.comparators.names.some((name) =>
        containsIndonesianComparisonIdentity(text, name),
      )
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut bisnis pembanding.`,
      );
    }
    if (
      slot?.auditedBrandIdentity === "forbidden" &&
      target &&
      pack.input.confirmed.scope === "cabang" &&
      containsIndonesianComparisonIdentity(text, target.name)
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut nama cabang. Gunakan area yang sudah dikonfirmasi.`,
      );
    }
    if (
      slot?.auditedBrandIdentity === "forbidden" &&
      target &&
      brandedProduct &&
      containsIndonesianComparisonIdentity(text, target.name)
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut nama produk yang mengungkap brand Anda.`,
      );
    }
    const prompt = pack.promptPack.prompts[index];
    if (
      !slot ||
      prompt.prompt_id !== slot.id ||
      prompt.category !== slot.category ||
      prompt.role !== slot.generatorSlotDescription ||
      prompt.branded !== (slot.auditedBrandIdentity === "required")
    ) {
      issues.push(
        "Tujuan dan urutan pertanyaan harus tetap sesuai paket Nuave.",
      );
    }
  });
  if (!promptPackSchema.safeParse(pack.promptPack).success)
    issues.push("Paket pertanyaan belum lengkap.");
  if (
    pack.promptPack.summary.unbranded_prompts !== 6 ||
    pack.promptPack.summary.branded_prompts !== 4 ||
    JSON.stringify(pack.generationInput) !==
      JSON.stringify(generationInputOf(pack.input))
  )
    issues.push(
      "Paket pertanyaan tidak cocok dengan informasi yang dikonfirmasi.",
    );
  return [...new Set(issues)];
}

/** Uses the existing deterministic templates and matrix; all sources are local.
 * Full reasons/offerings/channels remain in input. Slot wording selects examples
 * from that set; it does not assert every fact in each independent question.
 */
export function prepareLocalQuestions(
  input: FrozenLocalIntake,
): LocalQuestionPack {
  if (input.fingerprint !== fingerprintOf(input))
    throw new Error(
      "Informasi bisnis berubah. Konfirmasi kembali sebelum membuat pertanyaan.",
    );
  const generationInput = generationInputOf(input);
  const facts = input.confirmed;
  const privacyIdentities = [facts.brand.name, ...facts.comparators.names];
  const isSafeContext = (value: string) =>
    !privacyIdentities.some((name) =>
      containsIndonesianComparisonIdentity(value, name),
    );
  const safeReasons = facts.customerReasons.filter(isSafeContext);
  const serviceContext = facts.serviceChannels
    .map(
      ({ channel }) =>
        ({
          on_premise: "layanan di lokasi bisnis",
          on_customer: "layanan di lokasi pelanggan",
          delivery: "pengiriman ke pelanggan",
          online: "penggunaan secara online",
        })[channel],
    )
    .join(" atau ");
  const wordingInput = {
    ...generationInput,
    customer_needs: safeReasons,
    customer_context: `pelanggan yang memerlukan ${serviceContext}`,
  };
  const texts = buildDeterministicIndonesianPack(wordingInput);
  // Exact target context belongs only in named questions. Generic category and
  // confirmed geography keep unnamed questions sensitive to the active target.
  if (facts.target) {
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      if (slot.auditedBrandIdentity === "required") {
        const qualifier =
          facts.scope === "cabang"
            ? `cabang ${targetText(input)}`
            : `produk atau layanan ${facts.target.name}`;
        texts[slot.order - 1] = texts[slot.order - 1].replace(
          facts.brand.name,
          `${facts.brand.name} (${qualifier})`,
        );
      }
    }
  }
  // An exact target may be a branded product whose word order differs from the
  // brand. It is never used as an unnamed offering; use its confirmed category.
  if (facts.scope === "produk") {
    const productInput = { ...wordingInput, offerings: [facts.category] };
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      if (slot.auditedBrandIdentity === "forbidden") {
        texts[slot.order - 1] =
          buildDeterministicIndonesianPack(productInput)[slot.order - 1];
      }
    }
  }
  const pack: LocalQuestionPack = {
    version: LOCAL_QUESTION_PACK_VERSION,
    factVersion: input.factVersion,
    inputFingerprint: input.fingerprint,
    revision: 0,
    input,
    generationInput,
    originals: [...texts],
    generation: {
      kind: "deterministic-local",
      providerCalls: 0,
      auditExecuted: false,
    },
    promptPack: {
      status: "draft_for_review",
      prompt_pack_version: `${LOCAL_QUESTION_PACK_VERSION}:f${input.factVersion}:r0`,
      language: "id-ID",
      target_product: "ChatGPT",
      brand: {
        brand_name: facts.brand.name,
        entity_scope:
          facts.scope === "brand"
            ? `Seluruh brand ${facts.brand.name}`
            : `${facts.scope === "cabang" ? "Cabang" : "Produk"}: ${targetText(input)}`,
        brand_type: "",
        category: facts.category,
        market_context: marketText(input),
        target_customer: facts.customerReasons.join("; "),
      },
      summary: { total_prompts: 10, unbranded_prompts: 6, branded_prompts: 4 },
      prompts: AUDIT_MEASUREMENT_MATRIX.map((slot) => ({
        prompt_id: slot.id,
        category: slot.category,
        role: slot.generatorSlotDescription,
        branded: slot.auditedBrandIdentity === "required",
        question: texts[slot.order - 1],
        rationale: slot.measurementPurpose,
        inputs_used: [...slot.allowedContextFields],
        review_status: "needs_human_review",
      })),
      self_check: {
        ten_prompts: true,
        one_prompt_per_slot: true,
        canonical_composition: true,
        no_brand_leakage: true,
        verified_inputs_only: true,
        verified_competitor_only: true,
        single_entity_scope: true,
        category_safety_pass: true,
        independent_natural_questions: true,
      },
      warnings: [
        "Simulasi lokal: pertanyaan disiapkan tanpa panggilan AI; audit belum dijalankan.",
      ],
    },
  };
  const issues = questionIssues(pack);
  if (issues.length) throw new Error(issues.join(" "));
  return immutable(pack);
}

export function updateLocalQuestion(
  pack: LocalQuestionPack,
  slotId: string,
  wording: string,
): { ok: true; pack: LocalQuestionPack } | { ok: false; issues: string[] } {
  const slot = AUDIT_MEASUREMENT_MATRIX.find((entry) => entry.id === slotId);
  if (!slot)
    return {
      ok: false,
      issues: ["Pertanyaan tidak ditemukan dalam paket ini."],
    };
  const revision = pack.revision + 1;
  const next: LocalQuestionPack = {
    ...pack,
    revision,
    promptPack: {
      ...pack.promptPack,
      prompt_pack_version: `${LOCAL_QUESTION_PACK_VERSION}:f${pack.factVersion}:r${revision}`,
      prompts: pack.promptPack.prompts.map((prompt) =>
        prompt.prompt_id === slotId
          ? { ...prompt, question: wording.trim() }
          : { ...prompt },
      ),
    },
  };
  const issues = questionIssues(next);
  return issues.length
    ? { ok: false, issues }
    : { ok: true, pack: immutable(next) };
}

/** Session restore uses the same fixed metadata / wording checks as start.
 * Derive the generation context again; stored convenience data has no authority.
 */
export function parseLocalQuestionPack(
  value: unknown,
  input: FrozenLocalIntake,
): LocalQuestionPack | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  if (
    stored.version !== LOCAL_QUESTION_PACK_VERSION ||
    stored.factVersion !== input.factVersion ||
    stored.inputFingerprint !== input.fingerprint ||
    !Number.isInteger(stored.revision) ||
    (stored.revision as number) < 0
  )
    return null;
  const parsed = promptPackSchema.safeParse(stored.promptPack);
  if (
    !parsed.success ||
    parsed.data.prompt_pack_version !==
      `${LOCAL_QUESTION_PACK_VERSION}:f${input.factVersion}:r${stored.revision}`
  )
    return null;
  try {
    const original = prepareLocalQuestions(input);
    if (
      JSON.stringify(parsed.data.brand) !==
      JSON.stringify(original.promptPack.brand)
    )
      return null;
    const pack = {
      ...original,
      revision: stored.revision as number,
      promptPack: parsed.data,
    };
    if (questionIssues(pack).length || !isLocalQuestionPackCurrent(pack, input))
      return null;
    return immutable(pack);
  } catch {
    return null;
  }
}

export function isLocalQuestionPackCurrent(
  pack: LocalQuestionPack | null | undefined,
  input: FrozenLocalIntake,
): boolean {
  return (
    !!pack &&
    pack.version === LOCAL_QUESTION_PACK_VERSION &&
    pack.factVersion === input.factVersion &&
    pack.inputFingerprint === input.fingerprint &&
    pack.inputFingerprint === fingerprintOf(pack.input) &&
    input.fingerprint === fingerprintOf(input)
  );
}

export function createLocalStartHandoff(
  pack: LocalQuestionPack,
  input: FrozenLocalIntake,
): LocalStartHandoff {
  if (!isLocalQuestionPackCurrent(pack, input))
    throw new Error(
      "Informasi bisnis sudah berubah. Buat dan periksa pertanyaan baru sebelum melanjutkan.",
    );
  const issues = questionIssues(pack);
  if (issues.length) throw new Error(issues.join(" "));
  return immutable({
    version: "nuave-local-start-v1",
    mode: "local-simulation",
    auditExecuted: false,
    providerCalls: 0,
    input,
    questions: pack,
  });
}
