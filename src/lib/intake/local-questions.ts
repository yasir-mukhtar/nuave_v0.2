/** Offline preview boundary. Never imports a provider or executes an audit.
 * GLM branches validate wording only: the Spec 009 direct-ten pack answers to
 * the flat unnamed-text rules; the dormant glm-slots pack keeps the v3 slot
 * rules for its historical data. Preparation requests go through the server
 * adapter, never here. */
import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import { DIRECT_TEN_PROMPT_IDS } from "../audit/locked-question-pack";

// The locating ids live in the audit lock boundary; re-exported so existing
// intake-side imports keep one definition.
export { DIRECT_TEN_PROMPT_IDS };
import {
  buildDeterministicIndonesianPack,
  categoryComparisonFallbackName,
  containsIndonesianComparisonIdentity,
  indonesianPackBlockers,
  normalizeIndonesianIdentity,
  validateCanonicalIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "../audit/questions-id";
import type { QuestionFactsV3 } from "../audit/question-facts-v3";
import { validateIndonesianQuestionPackV3 } from "../audit/questions-id-glm";
import { validateDirectTenQuestionPack } from "../audit/questions-id-direct-ten";
import { parseSourceInput } from "../audit/source-input";
import {
  businessBriefSchema,
  promptPackSchema,
  type BusinessBrief,
  type PromptPack,
} from "../audit/types";
import { z } from "zod";
import type { PreparedItem } from "./fixtures";
import type { IntakeScreenId } from "./screens";
import {
  buildPreparedLabelIndex,
  deriveReviewRowsFromState,
  isReviewApprovable,
  type IntakeState,
} from "./state";
import {
  fingerprintOf,
  isLocalIntakeFingerprintValid,
  LOCAL_INTAKE_INPUT_VERSION,
  SERVICE_CHANNEL_LABELS,
  SERVICE_CHANNELS,
  type FrozenLocalIntake,
} from "./frozen-intake";

export { isLocalIntakeFingerprintValid, LOCAL_INTAKE_INPUT_VERSION };
export type { FrozenLocalIntake };
export const LOCAL_QUESTION_PACK_VERSION = "nuave-local-questions-v1";

/** Provenance the GLM experiment keeps verbatim: both model identifiers stay
 * distinct, a mismatch verdict is never relabeled as acceptance, and no
 * prefix stripping is applied anywhere. */
export type GlmPackProvenance = {
  requestId: string;
  /** The generation method this pack came from — explicit, never inferred. */
  method: "direct-ten" | "glm-slots";
  requestedModel: string;
  returnedModel: string | null;
  responseId: string | null;
  /** `returnedModel !== requestedModel`; inspection is not acceptance. */
  modelMismatch: boolean;
  transport: "synthetic-stub" | "cheaper-inference";
};

/** Server preparation outcome consumed by the questions effect. `synthetic`
 * stays explicit so a stub response is never mistaken for provider output. */
export type GlmQuestionsOutcome =
  | {
      status: "ok";
      questions: string[];
      facts: QuestionFactsV3;
      provenance: GlmPackProvenance;
      cost: { billedUsd: number | null; available: boolean };
      /** Provider-side sections preserved for inspection (direct-ten only). */
      examination?: {
        marketInterpretation: string;
        selfCritique: string;
        intentLabels: (string | null)[];
      };
    }
  | {
      status: "validation_failed";
      questions: string[];
      issues: string[];
      provenance: GlmPackProvenance;
      cost: { billedUsd: number | null; available: boolean };
      examination?: {
        marketInterpretation: string;
        selfCritique: string;
        intentLabels: (string | null)[];
      };
    }
  | {
      status: "correction_required";
      issues: { field: string; code: string; target: string | null }[];
    }
  | {
      status: "invalid_request";
      detail: string;
    }
  | {
      status: "failed";
      reason: string;
      detail: string;
      provenance: GlmPackProvenance;
      /** Spec 010 R-06 accounting: how far this attempt reached against the
       * provider — "responded": an HTTP response came back, success or HTTP
       * failure (a confirmed provider call); "sent": the transport was
       * invoked but nothing returned (execution unknown, like a dropped
       * client response); "none": rejected before any provider work. Absent
       * on legacy-shaped records. */
      providerContact?: "responded" | "sent" | "none";
      /** Provider-reported billed cost when the failed response carried
       * billing data — the attempt keeps it for accounting; otherwise null. */
      cost?: { billedUsd: number | null; available: boolean };
    };

export type GlmPackGeneration = {
  kind: "glm-experimental-local" | "glm-direct-ten-local";
  /** Real provider calls made for this pack. A synthetic stub made none. */
  providerCalls: 0 | 1;
  auditExecuted: false;
  provenance: GlmPackProvenance;
  billedCostUsd: number | null;
  /** The projected facts this pack was validated against (safe fields only). */
  facts: QuestionFactsV3;
};

/** The approved v3 contract omits `self_check` for GLM packs: mechanical
 * validation cannot prove those claims, so the object is absent rather than
 * stamped with booleans no check established. Deterministic packs keep the
 * legacy self_check shape unchanged. */
export type GlmLocalPromptPack = Omit<PromptPack, "self_check">;
const glmPromptPackSchema = promptPackSchema.omit({ self_check: true });

/** Spec 009 direct-ten pack boundary: ten purpose-free texts with stable
 * locating IDs. Prompt entries carry NO category, role, rationale, branded
 * flag or inputs_used — stamping legacy matrix metadata onto the new texts
 * would fake a contract they never had. The method version is explicit so
 * downstream boundaries never mistake this for a slot pack. */
export const DIRECT_TEN_METHOD_VERSION = "nuave-glm-direct-ten-v1" as const;
const directTenPromptPackSchema = z.object({
  status: z.literal("draft_for_review"),
  prompt_pack_version: z.string(),
  method: z.literal(DIRECT_TEN_METHOD_VERSION),
  language: z.literal("id-ID"),
  target_product: z.literal("ChatGPT"),
  brand: promptPackSchema.shape.brand,
  summary: z.object({
    total_prompts: z.literal(10),
    unbranded_prompts: z.literal(10),
    branded_prompts: z.literal(0),
  }),
  prompts: z
    .array(
      z.object({
        prompt_id: z.string(),
        question: z.string().trim().min(1).max(700),
        review_status: z.literal("needs_human_review"),
      }),
    )
    .length(10),
  warnings: z.array(z.string()),
});
export type DirectTenPromptPack = z.infer<typeof directTenPromptPackSchema>;

export type LocalQuestionPack = {
  version: typeof LOCAL_QUESTION_PACK_VERSION;
  factVersion: number;
  inputFingerprint: string;
  revision: number;
  input: FrozenLocalIntake;
  /** Existing validator/generator input; the full snapshot above is retained. */
  generationInput: MinimizedIndonesianBrief;
  promptPack: PromptPack | GlmLocalPromptPack | DirectTenPromptPack;
  /** The exact generated texts, kept separately from edited wording. */
  originals: string[];
  generation:
    | {
        kind: "deterministic-local";
        providerCalls: 0;
        auditExecuted: false;
      }
    | GlmPackGeneration;
};

export type LocalStartHandoff = {
  version: "nuave-local-start-v1";
  mode: "local-simulation" | "glm-experimental-local" | "glm-direct-ten-local";
  auditExecuted: false;
  providerCalls: number;
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
    const prepared = index.get("s-service")?.find((entry) => entry.id === id);
    const label =
      prepared?.label.trim() ||
      SERVICE_CHANNEL_LABELS[id as keyof typeof SERVICE_CHANNEL_LABELS] ||
      selected("s-service", id).label.trim();
    return { channel, label };
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
  const issues: string[] = [];
  const generation = pack.generation;
  const directTen = generation.kind === "glm-direct-ten-local";
  if (directTen) {
    // Direct-ten packs answer only to the flat rules: ten unnamed texts,
    // retained safety/identity protections, no purpose or composition gate.
    issues.push(
      ...validateDirectTenQuestionPack(texts, generation.facts).map(
        (issue) => issue.message,
      ),
    );
  } else if (generation.kind === "glm-experimental-local") {
    // GLM packs answer to the same v3 rules as generation output; the v2
    // terminal-question-mark gate does not apply. Private-data, high-impact
    // and provider-safety checks run inside the v3 validator.
    issues.push(
      ...validateIndonesianQuestionPackV3(texts, generation.facts).map(
        (issue) => issue.message,
      ),
    );
  } else {
    issues.push(
      ...validateCanonicalIndonesianQuestionPack(
        texts,
        pack.generationInput,
      ).map((issue) => issue.message),
    );
    if (indonesianPackBlockers(texts, pack.generationInput).length > 0) {
      issues.push(
        "Gunakan pertanyaan tentang bisnis dan keputusan pelanggan, tanpa informasi pribadi atau sensitif.",
      );
    }
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
    // Direct-ten: every text is unnamed — the comparator and scoped-identity
    // checks apply to all ten, not only to slots that forbid them.
    const unnamedApplies =
      directTen ||
      AUDIT_MEASUREMENT_MATRIX[index]?.comparisonTargetIdentity === "forbidden";
    if (
      unnamedApplies &&
      pack.input.confirmed.comparators.names.some((name) =>
        containsIndonesianComparisonIdentity(text, name),
      )
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut bisnis pembanding.`,
      );
    }
    const brandForbidden =
      directTen ||
      AUDIT_MEASUREMENT_MATRIX[index]?.auditedBrandIdentity === "forbidden";
    if (
      brandForbidden &&
      target &&
      pack.input.confirmed.scope === "cabang" &&
      containsIndonesianComparisonIdentity(text, target.name)
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut nama cabang. Gunakan area yang sudah dikonfirmasi.`,
      );
    }
    if (
      brandForbidden &&
      target &&
      brandedProduct &&
      containsIndonesianComparisonIdentity(text, target.name)
    ) {
      issues.push(
        `Pertanyaan ${index + 1} tidak boleh menyebut nama produk yang mengungkap brand Anda.`,
      );
    }
    if (directTen) {
      const prompt = pack.promptPack.prompts[index];
      if (prompt.prompt_id !== DIRECT_TEN_PROMPT_IDS[index]) {
        issues.push(
          "Urutan dan identitas pertanyaan harus tetap sesuai paket Nuave.",
        );
      }
    } else {
      const slot = AUDIT_MEASUREMENT_MATRIX[index];
      const prompt = pack.promptPack.prompts[index] as
        (typeof pack.promptPack.prompts)[number] | undefined;
      if (
        !slot ||
        !prompt ||
        prompt.prompt_id !== slot.id ||
        (prompt as { category?: string }).category !== slot.category ||
        (prompt as { role?: string }).role !== slot.generatorSlotDescription ||
        (prompt as { branded?: boolean }).branded !==
          (slot.auditedBrandIdentity === "required")
      ) {
        issues.push(
          "Tujuan dan urutan pertanyaan harus tetap sesuai paket Nuave.",
        );
      }
    }
  });
  const packSchema =
    pack.generation.kind === "glm-direct-ten-local"
      ? directTenPromptPackSchema
      : pack.generation.kind === "glm-experimental-local"
        ? glmPromptPackSchema
        : promptPackSchema;
  if (!packSchema.safeParse(pack.promptPack).success)
    issues.push("Paket pertanyaan belum lengkap.");
  const summaryOk = directTen
    ? pack.promptPack.summary.unbranded_prompts === 10 &&
      pack.promptPack.summary.branded_prompts === 0
    : pack.promptPack.summary.unbranded_prompts === 6 &&
      pack.promptPack.summary.branded_prompts === 4;
  if (
    !summaryOk ||
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
  return buildLocalPack(input, texts, {
    kind: "deterministic-local",
    providerCalls: 0,
    auditExecuted: false,
  });
}

/** Shared pack body for both preparation kinds. GLM packs omit `self_check`
 * entirely — no mechanical check established those claims for model output,
 * so the object is absent per the approved v3 contract rather than stamped
 * with unearned booleans. */
function buildLocalPack(
  input: FrozenLocalIntake,
  texts: string[],
  generation: LocalQuestionPack["generation"],
): LocalQuestionPack {
  if (input.fingerprint !== fingerprintOf(input))
    throw new Error(
      "Informasi bisnis berubah. Konfirmasi kembali sebelum membuat pertanyaan.",
    );
  const generationInput = generationInputOf(input);
  const facts = input.confirmed;
  const directTen = generation.kind === "glm-direct-ten-local";
  const glm = generation.kind === "glm-experimental-local";
  const promptPackBase = {
    status: "draft_for_review" as const,
    prompt_pack_version: `${LOCAL_QUESTION_PACK_VERSION}:f${input.factVersion}:r0`,
    language: "id-ID" as const,
    target_product: "ChatGPT" as const,
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
    summary: {
      total_prompts: 10 as const,
      unbranded_prompts: 6,
      branded_prompts: 4,
    },
    prompts: AUDIT_MEASUREMENT_MATRIX.map((slot) => ({
      prompt_id: slot.id,
      category: slot.category,
      role: slot.generatorSlotDescription,
      branded: slot.auditedBrandIdentity === "required",
      question: texts[slot.order - 1],
      rationale: slot.measurementPurpose,
      inputs_used: [...slot.allowedContextFields],
      review_status: "needs_human_review" as const,
    })),
    warnings: [
      glm
        ? generation.provenance.transport === "synthetic-stub"
          ? "Uji coba GLM lokal: pertanyaan berasal dari respons sintetis berlabel, bukan keluaran provider. Audit belum dijalankan."
          : "Versi uji coba: pertanyaan disiapkan lewat satu panggilan provider; audit belum dijalankan."
        : "Simulasi lokal: pertanyaan disiapkan tanpa panggilan AI; audit belum dijalankan.",
    ],
  };
  const directTenWarning =
    generation.kind === "glm-direct-ten-local"
      ? generation.provenance.transport === "synthetic-stub"
        ? "Uji coba GLM lokal (sepuluh pertanyaan langsung): pertanyaan berasal dari respons sintetis berlabel, bukan keluaran provider. Audit belum dijalankan."
        : "Versi uji coba (sepuluh pertanyaan langsung): pertanyaan disiapkan lewat satu panggilan provider; audit belum dijalankan."
      : null;
  const pack: LocalQuestionPack = {
    version: LOCAL_QUESTION_PACK_VERSION,
    factVersion: input.factVersion,
    inputFingerprint: input.fingerprint,
    revision: 0,
    input,
    generationInput,
    originals: [...texts],
    generation,
    promptPack: directTen
      ? {
          status: "draft_for_review" as const,
          prompt_pack_version: `${LOCAL_QUESTION_PACK_VERSION}:f${input.factVersion}:r0`,
          method: DIRECT_TEN_METHOD_VERSION,
          language: "id-ID" as const,
          target_product: "ChatGPT" as const,
          brand: promptPackBase.brand,
          summary: {
            total_prompts: 10 as const,
            unbranded_prompts: 10 as const,
            branded_prompts: 0 as const,
          },
          prompts: DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
            prompt_id,
            question: texts[index]!,
            review_status: "needs_human_review" as const,
          })),
          warnings: [directTenWarning!],
        }
      : glm
        ? promptPackBase
        : {
            ...promptPackBase,
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
          },
  };
  const issues = questionIssues(pack);
  if (issues.length) throw new Error(issues.join(" "));
  return immutable(pack);
}

/** Build a local pack from a successful experimental-GLM server outcome.
 * The client revalidates the returned texts under the same v3 rules — a pack
 * only forms when the pack contract actually passes. */
export function prepareGlmLocalPack(
  input: FrozenLocalIntake,
  outcome: Extract<GlmQuestionsOutcome, { status: "ok" }>,
): LocalQuestionPack {
  return buildLocalPack(input, outcome.questions, {
    kind:
      outcome.provenance.method === "direct-ten"
        ? "glm-direct-ten-local"
        : "glm-experimental-local",
    providerCalls: outcome.provenance.transport === "synthetic-stub" ? 0 : 1,
    auditExecuted: false,
    provenance: outcome.provenance,
    billedCostUsd: outcome.cost.billedUsd,
    facts: outcome.facts,
  });
}

export function updateLocalQuestion(
  pack: LocalQuestionPack,
  slotId: string,
  wording: string,
): { ok: true; pack: LocalQuestionPack } | { ok: false; issues: string[] } {
  // Direct-ten texts are located by their stable pack ID; legacy packs keep
  // the matrix slot lookup. Both still revalidate the whole pack below.
  const found =
    pack.generation.kind === "glm-direct-ten-local"
      ? pack.promptPack.prompts.some((prompt) => prompt.prompt_id === slotId)
      : AUDIT_MEASUREMENT_MATRIX.some((entry) => entry.id === slotId);
  if (!found)
    return {
      ok: false,
      issues: ["Pertanyaan tidak ditemukan dalam paket ini."],
    };
  const revision = pack.revision + 1;
  const next: LocalQuestionPack = {
    ...pack,
    revision,
    // The prompt union spreads to a mixed shape; only question text and the
    // version change here, and questionIssues revalidates immediately after.
    promptPack: {
      ...pack.promptPack,
      prompt_pack_version: `${LOCAL_QUESTION_PACK_VERSION}:f${pack.factVersion}:r${revision}`,
      prompts: pack.promptPack.prompts.map((prompt) =>
        prompt.prompt_id === slotId
          ? { ...prompt, question: wording.trim() }
          : { ...prompt },
      ),
    } as LocalQuestionPack["promptPack"],
  };
  const issues = questionIssues(next);
  return issues.length
    ? { ok: false, issues }
    : { ok: true, pack: immutable(next) };
}

/** Bounded structural check on a stored GLM generation record. The pack's
 * wording is revalidated by the shared checks afterwards; this only confirms
 * the provenance fields are present, self-consistent, and tied to the frozen
 * input they were projected from. */
function parseGlmGeneration(
  value: unknown,
  input: FrozenLocalIntake,
): GlmPackGeneration | null {
  if (!value || typeof value !== "object") return null;
  const generation = value as Record<string, unknown>;
  const provenance = generation.provenance;
  const facts = generation.facts;
  if (
    (generation.kind !== "glm-experimental-local" &&
      generation.kind !== "glm-direct-ten-local") ||
    generation.auditExecuted !== false ||
    (generation.providerCalls !== 0 && generation.providerCalls !== 1) ||
    !(
      generation.billedCostUsd === null ||
      typeof generation.billedCostUsd === "number"
    ) ||
    !provenance ||
    typeof provenance !== "object" ||
    !facts ||
    typeof facts !== "object"
  )
    return null;
  const prov = provenance as Record<string, unknown>;
  // Kind/method consistency is part of the boundary: a stored record whose
  // provenance method does not match its generation kind is rejected rather
  // than silently reinterpreted.
  const expectedMethod =
    generation.kind === "glm-direct-ten-local" ? "direct-ten" : "glm-slots";
  if (
    prov.method !== expectedMethod ||
    typeof prov.requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(prov.requestId) ||
    typeof prov.requestedModel !== "string" ||
    !prov.requestedModel.trim() ||
    !(prov.returnedModel === null || typeof prov.returnedModel === "string") ||
    !(prov.responseId === null || typeof prov.responseId === "string") ||
    prov.modelMismatch !==
      (prov.returnedModel !== null &&
        prov.returnedModel !== prov.requestedModel) ||
    (prov.transport !== "synthetic-stub" &&
      prov.transport !== "cheaper-inference") ||
    // Provenance consistency: the stub never made a provider call; a live
    // transport record claims exactly one.
    (prov.transport === "synthetic-stub"
      ? generation.providerCalls !== 0
      : generation.providerCalls !== 1)
  )
    return null;
  const identity = (facts as Record<string, unknown>).identity;
  if (
    !identity ||
    typeof identity !== "object" ||
    (identity as Record<string, unknown>).brand !== input.confirmed.brand.name
  )
    return null;
  return generation as unknown as GlmPackGeneration;
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
  const generationKind =
    stored.generation && typeof stored.generation === "object"
      ? (stored.generation as Record<string, unknown>).kind
      : undefined;
  // GLM packs parse under their own contracts — self_check absent by design;
  // deterministic packs keep the legacy schema. An unknown kind is rejected
  // outright rather than parsed under a legacy contract.
  const schemaFor =
    generationKind === "glm-direct-ten-local"
      ? directTenPromptPackSchema
      : generationKind === "glm-experimental-local"
        ? glmPromptPackSchema
        : generationKind === "deterministic-local"
          ? promptPackSchema
          : null;
  if (!schemaFor) return null;
  const parsed = schemaFor.safeParse(stored.promptPack);
  if (
    !parsed.success ||
    parsed.data.prompt_pack_version !==
      `${LOCAL_QUESTION_PACK_VERSION}:f${input.factVersion}:r${stored.revision}`
  )
    return null;
  if (
    generationKind === "glm-experimental-local" ||
    generationKind === "glm-direct-ten-local"
  ) {
    const generation = parseGlmGeneration(stored.generation, input);
    if (!generation) return null;
    const directTen = generationKind === "glm-direct-ten-local";
    // A GLM pack cannot be re-derived deterministically; restore the exact
    // stored wording (schema-checked above) and revalidate under its method's
    // rules. Direct-ten texts are located by their stable pack IDs.
    const texts = directTen
      ? DIRECT_TEN_PROMPT_IDS.map(
          (promptId) =>
            parsed.data.prompts.find((prompt) => prompt.prompt_id === promptId)
              ?.question ?? "",
        )
      : AUDIT_MEASUREMENT_MATRIX.map(
          (slot) =>
            parsed.data.prompts.find((prompt) => prompt.prompt_id === slot.id)
              ?.question ?? "",
        );
    if (texts.some((text) => !text)) return null;
    // The generated originals persist separately from edited wording — a
    // restore must never rebuild them from the current texts.
    const originals =
      Array.isArray(stored.originals) &&
      stored.originals.length === 10 &&
      stored.originals.every(
        (text) => typeof text === "string" && text.trim().length > 0,
      )
        ? (stored.originals as string[])
        : null;
    if (
      !originals ||
      (directTen
        ? validateDirectTenQuestionPack(originals, generation.facts).length
        : validateIndonesianQuestionPackV3(originals, generation.facts).length)
    )
      return null;
    try {
      const rebuilt = buildLocalPack(input, texts, generation);
      if (
        JSON.stringify(parsed.data.brand) !==
        JSON.stringify(rebuilt.promptPack.brand)
      )
        return null;
      const pack = {
        ...rebuilt,
        revision: stored.revision as number,
        promptPack: parsed.data,
        originals,
      };
      if (
        questionIssues(pack).length ||
        !isLocalQuestionPackCurrent(pack, input)
      )
        return null;
      return immutable(pack);
    } catch {
      return null;
    }
  }
  if (generationKind !== "deterministic-local") return null;
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
  const glm = pack.generation.kind === "glm-experimental-local";
  const directTen = pack.generation.kind === "glm-direct-ten-local";
  return immutable({
    version: "nuave-local-start-v1",
    // The experimental pack is never relabeled as the deterministic
    // zero-provider-call simulation.
    mode: directTen
      ? "glm-direct-ten-local"
      : glm
        ? "glm-experimental-local"
        : "local-simulation",
    auditExecuted: false,
    providerCalls: pack.generation.providerCalls,
    input,
    questions: pack,
  });
}

/** Honest projection of this session's confirmed intake into the verified
 * brief shape the audit boundaries require. Every field derives from the
 * frozen confirmed record — nothing is hardcoded per business. Fields the
 * founder explicitly left unconfirmed stay explicit rather than being filled
 * with plausible text; schema-required fields fall back to confirmed values
 * only (target, category, confirmed channels or reach). */
export function sessionConfirmedBrief(
  confirmed: FrozenLocalIntake["confirmed"],
): BusinessBrief {
  const unconfirmed = confirmed.publicFact
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.includes("belum dikonfirmasi"));
  const marketContext =
    confirmed.market.reach === "seluruh"
      ? "seluruh Indonesia"
      : confirmed.market.reach === "luar"
        ? "Indonesia dan luar negeri"
        : confirmed.market.areas.join(", ") || "area sekitar bisnis";
  const reasons = confirmed.customerReasons;
  const targetCustomer =
    reasons[0] ?? `pelanggan ${confirmed.category} di ${marketContext}`;
  const channelLabels = confirmed.serviceChannels.map(({ label }) => label);
  const decisionCriteria =
    reasons.length > 1
      ? reasons.slice(1)
      : channelLabels.length
        ? channelLabels
        : [targetCustomer];
  const offerings = confirmed.offerings.length
    ? confirmed.offerings
    : confirmed.target
      ? [confirmed.target.name]
      : [confirmed.category];
  const competitorName =
    confirmed.comparators.names[0] ??
    `alternatif lain di kategori ${confirmed.category}`;
  // `primarySource` is the raw entered text; the brief requires the
  // normalized public URL. Intake validation guarantees it parses — an
  // unparseable value fails closed at the schema rather than sneaking a bad
  // URL into the audit boundaries.
  const primarySource =
    parseSourceInput(confirmed.brand.primarySource)?.normalizedUrl ??
    confirmed.brand.primarySource;
  return businessBriefSchema.parse({
    brand_name: confirmed.brand.name,
    entity_scope:
      confirmed.scope === "brand"
        ? `Seluruh brand ${confirmed.brand.name}`
        : confirmed.target
          ? `${confirmed.scope === "cabang" ? "Cabang" : "Produk"}: ${confirmed.target.name}${confirmed.target.detail ? ` — ${confirmed.target.detail}` : ""}`
          : confirmed.scope,
    // Derived only from the confirmed category; no legal form is asserted.
    brand_type: confirmed.category.includes("Advisori")
      ? "Firma advisori"
      : confirmed.category,
    category: confirmed.category,
    market_context: marketContext,
    target_customer: targetCustomer,
    official_sources: [primarySource],
    verified_offerings: offerings,
    verified_customer_needs: reasons.length ? reasons : [targetCustomer],
    verified_decision_criteria: decisionCriteria,
    verified_competitor: {
      name: competitorName,
      scope: "",
      source_url: "",
    },
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: confirmed.publicFact ? [confirmed.publicFact] : [],
    known_accuracy_questions: unconfirmed,
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  });
}
