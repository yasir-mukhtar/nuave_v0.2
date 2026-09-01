import {
  businessBriefSchema,
  type BusinessBrief,
  type ExtractionDraft,
} from "./types";
import {
  isValidSimilarBusinessUrl,
  normalizeSimilarBusinesses,
  similarBusinessDisplayName,
} from "./similar-businesses";
import { parseSourceInput } from "./source-input";

export const WORKFLOW_SCHEMA_VERSION = 9 as const;

export const INTAKE_SCREENS = [
  "brand-confirm",
  "source-correction",
  "scope",
  "branch",
  "product",
  "category",
  "market",
  "customer-reasons",
  "offerings",
  "comparison-target",
  "facts",
  "review",
] as const;
export type IntakeScreen = (typeof INTAKE_SCREENS)[number];

export const SCOPE_KINDS = ["whole-brand", "branch", "product"] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

export type ComparisonTargetProposal = {
  kind: "suggestion" | "category_fallback";
  name: string;
  scope: string;
  source_url: string;
};

export type ComparisonStatus = "pending" | "confirmed" | "needs_reconfirmation";

export type WorkflowMeta = {
  intakeScreen: IntakeScreen;
  scopeKind: ScopeKind;
  scopeValue: string;
  comparisonProposal: ComparisonTargetProposal | null;
  comparisonStatus: ComparisonStatus;
  marketInvalidated: boolean;
  customerEditedFields: string[];
  identityUnverified: boolean;
};

/** R-12's one source of truth for ownership, reachability, and invalidation. */
export const FIELD_OWNERSHIP = {
  brand_name: {
    owner: "extracted",
    screen: "brand-confirm",
    required: true,
    invalidatedBy: "none",
  },
  official_sources: {
    owner: "submitted-source",
    screen: "brand-confirm",
    required: true,
    invalidatedBy: "source-change",
  },
  entity_scope: {
    owner: "scope-and-conditional",
    screen: "scope",
    required: true,
    invalidatedBy: "scope-kind-change",
  },
  brand_type: {
    owner: "extracted",
    screen: "scope",
    required: true,
    invalidatedBy: "none",
  },
  category: {
    owner: "extracted-choice",
    screen: "category",
    required: true,
    invalidatedBy: "none",
  },
  market_context: {
    owner: "extracted",
    screen: "market",
    required: true,
    invalidatedBy: "scope-change",
  },
  target_customer: {
    owner: "extracted",
    screen: "customer-reasons",
    required: true,
    invalidatedBy: "none",
  },
  verified_offerings: {
    owner: "extracted-chips",
    screen: "offerings",
    required: true,
    invalidatedBy: "scope-to-product",
  },
  verified_customer_needs: {
    owner: "extracted-chips",
    screen: "customer-reasons",
    required: true,
    invalidatedBy: "none",
  },
  verified_decision_criteria: {
    owner: "extracted-chips",
    screen: "customer-reasons",
    required: true,
    invalidatedBy: "none",
  },
  verified_competitor: {
    owner: "proposal-and-customer",
    screen: "comparison-target",
    required: true,
    invalidatedBy: "scope-or-category-change",
  },
  similar_businesses: {
    owner: "extracted-suggestions",
    screen: "comparison-target",
    required: false,
    invalidatedBy: "category-change",
  },
  usp: {
    owner: "extracted",
    screen: "facts",
    required: false,
    invalidatedBy: "none",
  },
  customer_supplied_facts: {
    owner: "customer",
    screen: "facts",
    required: false,
    invalidatedBy: "none",
  },
  brand_name_variants: {
    owner: "derived-editable",
    screen: "review",
    required: false,
    invalidatedBy: "brand-name-change",
  },
  priority_offering: {
    owner: "derived",
    screen: null,
    required: false,
    invalidatedBy: "offerings-change",
  },
  conversion_action: {
    owner: "deterministic-default",
    screen: null,
    required: false,
    invalidatedBy: "category-change",
  },
  regulated_category_notes: {
    owner: "deterministic-default",
    screen: null,
    required: false,
    invalidatedBy: "category-change",
  },
  known_accuracy_questions: {
    owner: "not-collected",
    screen: null,
    required: false,
    invalidatedBy: "none",
  },
  agency_name: {
    owner: "not-collected",
    screen: null,
    required: false,
    invalidatedBy: "none",
  },
  agency_logo_data_url: {
    owner: "not-collected",
    screen: null,
    required: false,
    invalidatedBy: "none",
  },
  language: {
    owner: "frozen-default",
    screen: null,
    required: false,
    invalidatedBy: "none",
  },
} as const satisfies Record<keyof BusinessBrief, unknown>;

export function intakeScreenSequence(scopeKind: ScopeKind): IntakeScreen[] {
  return [
    "brand-confirm",
    "scope",
    ...(scopeKind === "branch" ? ["branch" as const] : []),
    ...(scopeKind === "product" ? ["product" as const] : []),
    "category",
    "market",
    "customer-reasons",
    "offerings",
    "comparison-target",
    "facts",
    "review",
  ];
}

export function nextIntakeScreen(
  scopeKind: ScopeKind,
  screen: IntakeScreen,
): IntakeScreen {
  if (screen === "source-correction") return "scope";
  const sequence = intakeScreenSequence(scopeKind);
  return sequence[Math.min(sequence.indexOf(screen) + 1, sequence.length - 1)];
}

export function previousIntakeScreen(
  scopeKind: ScopeKind,
  screen: IntakeScreen,
): IntakeScreen {
  if (screen === "source-correction") return "brand-confirm";
  const sequence = intakeScreenSequence(scopeKind);
  return sequence[Math.max(sequence.indexOf(screen) - 1, 0)];
}

export type WorkflowValidationIssue = {
  field: string;
  screen: IntakeScreen;
  message: string;
};

export type WorkflowMutation = {
  brief: BusinessBrief;
  meta: WorkflowMeta;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hasNonEmpty(values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

function supportedOfficialSources(values: string[]) {
  return uniqueStrings(values)
    .map((value) => parseSourceInput(value)?.normalizedUrl || "")
    .filter(Boolean);
}

function fallbackComparisonName(category: string) {
  return `alternatif lain di kategori ${category.trim()}`;
}

function comparisonProposalName(business: {
  name?: string;
  source_url: string;
}): string {
  return (
    business.name?.trim() ||
    similarBusinessDisplayName(business.source_url) ||
    ""
  );
}

/**
 * Deterministic defaults are deliberately derived locally from category text;
 * extraction never owns these fields. The output is stable for a category and
 * changes whenever the category changes.
 */
export function defaultConversionAction(category: string) {
  const value = normalized(category);
  if (/(kopi|kafe|cafe|restoran|kuliner|makanan|minuman)/.test(value)) {
    return "Kunjungi atau hubungi bisnis melalui sumber resmi.";
  }
  if (/(software|saas|aplikasi|platform|teknologi)/.test(value)) {
    return "Minta demo atau hubungi bisnis melalui sumber resmi.";
  }
  if (
    /(klinik|kesehatan|dokter|gigi|hukum|legal|akuntansi|keuangan|bank|asuransi)/.test(
      value,
    )
  ) {
    return "Hubungi bisnis melalui sumber resmi untuk konsultasi.";
  }
  return category.trim()
    ? `Hubungi bisnis melalui sumber resmi tentang ${category.trim()}.`
    : "Hubungi bisnis melalui sumber resmi untuk informasi lebih lanjut.";
}

export function defaultRegulatedCategoryNotes(category: string) {
  const value = normalized(category);
  if (
    /(klinik|kesehatan|dokter|gigi|farmasi|obat|hukum|legal|akuntansi|keuangan|bank|asuransi)/.test(
      value,
    )
  ) {
    return "Gunakan hanya informasi publik yang dapat diverifikasi untuk kategori ini.";
  }
  return "";
}

export function derivePriorityOffering(offerings: string[]) {
  return offerings.find((offering) => offering.trim())?.trim() || "";
}

export function inferScopeSelection(
  brandName: string,
  entityScope: string,
): Pick<WorkflowMeta, "scopeKind" | "scopeValue"> {
  const value = entityScope.trim();
  const branch = value.match(/^Cabang:\s*(.*)$/i);
  if (branch?.[1]?.trim()) {
    return { scopeKind: "branch", scopeValue: branch[1].trim() };
  }
  const product = value.match(/^Produk:\s*(.*)$/i);
  if (product?.[1]?.trim()) {
    return { scopeKind: "product", scopeValue: product[1].trim() };
  }
  return { scopeKind: "whole-brand", scopeValue: "" };
}

export function canonicalEntityScope(
  brandName: string,
  scopeKind: ScopeKind,
  scopeValue = "",
) {
  const brand = brandName.trim();
  const value = scopeValue.trim();
  if (scopeKind === "branch") return value ? `Cabang: ${value}` : "Cabang:";
  if (scopeKind === "product") return value ? `Produk: ${value}` : "Produk:";
  return brand ? `Seluruh brand ${brand}` : "Seluruh brand";
}

export function deriveComparisonProposal(
  brief: Pick<BusinessBrief, "category" | "similar_businesses">,
): ComparisonTargetProposal {
  const candidates = normalizeSimilarBusinesses(
    brief.similar_businesses ?? [],
  ).filter(
    (candidate) =>
      !candidate.source_url || isValidSimilarBusinessUrl(candidate.source_url),
  );
  const first = candidates.find((candidate) =>
    Boolean(comparisonProposalName(candidate)),
  );
  if (first) {
    return {
      kind: "suggestion",
      name: comparisonProposalName(first),
      scope: "",
      source_url: first.source_url,
    };
  }
  return {
    kind: "category_fallback",
    name: fallbackComparisonName(brief.category),
    scope: "",
    source_url: "",
  };
}

export function createWorkflowMeta(
  brief: BusinessBrief,
  options: Partial<WorkflowMeta> = {},
): WorkflowMeta {
  const scope = inferScopeSelection(brief.brand_name, brief.entity_scope);
  const comparisonStatus =
    options.comparisonStatus ??
    (brief.verified_competitor.name.trim() ? "confirmed" : "pending");
  return {
    intakeScreen: options.intakeScreen ?? "brand-confirm",
    scopeKind: options.scopeKind ?? scope.scopeKind,
    scopeValue: options.scopeValue ?? scope.scopeValue,
    comparisonProposal:
      options.comparisonProposal === undefined
        ? deriveComparisonProposal(brief)
        : options.comparisonProposal,
    comparisonStatus,
    marketInvalidated: options.marketInvalidated ?? false,
    customerEditedFields: options.customerEditedFields ?? [],
    identityUnverified: options.identityUnverified ?? !brief.brand_name.trim(),
  };
}

function rederiveBrief(brief: BusinessBrief): BusinessBrief {
  return {
    ...brief,
    priority_offering: derivePriorityOffering(brief.verified_offerings),
    conversion_action: defaultConversionAction(brief.category),
    regulated_category_notes: defaultRegulatedCategoryNotes(brief.category),
    known_accuracy_questions: [],
    agency_name: "",
    agency_logo_data_url: "",
    language: "en-US",
  };
}

function comparisonStatusAfterUpstreamChange(
  brief: BusinessBrief,
): ComparisonStatus {
  return brief.verified_competitor.name.trim()
    ? "needs_reconfirmation"
    : "pending";
}

export function applyScopeSelection(
  brief: BusinessBrief,
  currentMeta: WorkflowMeta,
  scopeKind: ScopeKind,
  scopeValue = "",
): WorkflowMutation {
  const nextValue = scopeKind === "whole-brand" ? "" : scopeValue.trim();
  const scopeChanged =
    currentMeta.scopeKind !== scopeKind ||
    currentMeta.scopeValue !== nextValue ||
    brief.entity_scope !==
      canonicalEntityScope(brief.brand_name, scopeKind, nextValue);
  const productValueChanged =
    scopeKind === "product" &&
    (currentMeta.scopeKind !== "product" ||
      currentMeta.scopeValue !== nextValue);
  const geographyChanged =
    scopeChanged &&
    (currentMeta.scopeKind !== scopeKind ||
      currentMeta.scopeKind === "branch" ||
      scopeKind === "branch");
  const nextBrief = rederiveBrief({
    ...brief,
    entity_scope: canonicalEntityScope(brief.brand_name, scopeKind, nextValue),
    ...(productValueChanged ? { verified_offerings: [] } : {}),
    ...(geographyChanged ? { market_context: "" } : {}),
  });
  const nextMeta = createWorkflowMeta(nextBrief, {
    ...currentMeta,
    scopeKind,
    scopeValue: nextValue,
    comparisonProposal: scopeChanged
      ? deriveComparisonProposal(nextBrief)
      : currentMeta.comparisonProposal,
    comparisonStatus: scopeChanged
      ? comparisonStatusAfterUpstreamChange(nextBrief)
      : currentMeta.comparisonStatus,
    marketInvalidated: geographyChanged || currentMeta.marketInvalidated,
  });
  return { brief: nextBrief, meta: nextMeta };
}

export function applyBriefFieldChange<K extends keyof BusinessBrief>(
  brief: BusinessBrief,
  currentMeta: WorkflowMeta,
  field: K,
  value: BusinessBrief[K],
): WorkflowMutation {
  const edited = new Set(currentMeta.customerEditedFields);
  edited.add(String(field));
  let nextBrief: BusinessBrief = { ...brief, [field]: value };
  let nextMeta: WorkflowMeta = {
    ...currentMeta,
    customerEditedFields: [...edited],
  };

  if (field === "brand_name") {
    nextBrief = {
      ...nextBrief,
      entity_scope:
        currentMeta.scopeKind === "whole-brand"
          ? canonicalEntityScope(String(value), "whole-brand")
          : nextBrief.entity_scope,
      brand_name_variants: [],
    };
  }

  if (field === "category") {
    nextBrief = {
      ...nextBrief,
      category: String(value),
      similar_businesses: [],
    };
    nextMeta = {
      ...nextMeta,
      comparisonProposal: deriveComparisonProposal(nextBrief),
      comparisonStatus: comparisonStatusAfterUpstreamChange(nextBrief),
    };
  }

  if (field === "market_context" && String(value).trim()) {
    nextMeta = { ...nextMeta, marketInvalidated: false };
  }

  nextBrief = rederiveBrief(nextBrief);
  return { brief: nextBrief, meta: createWorkflowMeta(nextBrief, nextMeta) };
}

export type ComparisonTargetInput = {
  kind: "suggestion" | "category_fallback" | "replacement";
  name: string;
  scope?: string;
  source_url?: string;
};

export function acceptComparisonTarget(
  brief: BusinessBrief,
  currentMeta: WorkflowMeta,
  input: ComparisonTargetInput,
): WorkflowMutation {
  const name = input.name.trim();
  const sourceUrl = input.source_url?.trim() || "";
  const nextBrief = rederiveBrief({
    ...brief,
    verified_competitor: {
      name,
      scope: input.scope?.trim() || "",
      source_url: sourceUrl,
    },
  });
  return {
    brief: nextBrief,
    meta: createWorkflowMeta(nextBrief, {
      ...currentMeta,
      comparisonStatus: "confirmed",
      comparisonProposal: currentMeta.comparisonProposal,
      customerEditedFields: [
        ...new Set([
          ...currentMeta.customerEditedFields,
          "verified_competitor",
        ]),
      ],
    }),
  };
}

export function confirmIdentity(
  brief: BusinessBrief,
  currentMeta: WorkflowMeta,
): WorkflowMutation {
  return {
    brief,
    meta: {
      ...currentMeta,
      identityUnverified: false,
      customerEditedFields: [
        ...new Set([...currentMeta.customerEditedFields, "brand_name"]),
      ],
    },
  };
}

export function mergeExtractionIntoBrief(input: {
  currentBrief: BusinessBrief;
  currentMeta: WorkflowMeta;
  draft: ExtractionDraft;
  acceptedSourceUrl: string;
}): WorkflowMutation {
  const { currentBrief, currentMeta, draft, acceptedSourceUrl } = input;
  const edited = new Set(currentMeta.customerEditedFields);
  const similarBusinesses = normalizeSimilarBusinesses(
    draft.similar_businesses ?? [],
  );
  const preserveComparisonTarget =
    edited.has("verified_competitor") &&
    currentBrief.verified_competitor.name.trim().length > 0;
  const sourceUrls = supportedOfficialSources([
    acceptedSourceUrl,
    ...draft.official_sources,
  ]);
  const candidate: BusinessBrief = {
    ...currentBrief,
    brand_name: edited.has("brand_name")
      ? currentBrief.brand_name
      : draft.brand_name,
    entity_scope: edited.has("entity_scope")
      ? currentBrief.entity_scope
      : draft.entity_scope,
    brand_type: edited.has("brand_type")
      ? currentBrief.brand_type
      : draft.brand_type,
    category: edited.has("category") ? currentBrief.category : draft.category,
    market_context: edited.has("market_context")
      ? currentBrief.market_context
      : draft.market_context,
    target_customer: edited.has("target_customer")
      ? currentBrief.target_customer
      : draft.target_customer,
    official_sources: sourceUrls,
    verified_offerings: edited.has("verified_offerings")
      ? currentBrief.verified_offerings
      : draft.verified_offerings,
    verified_customer_needs: edited.has("verified_customer_needs")
      ? currentBrief.verified_customer_needs
      : draft.verified_customer_needs,
    verified_decision_criteria: edited.has("verified_decision_criteria")
      ? currentBrief.verified_decision_criteria
      : draft.verified_decision_criteria,
    verified_competitor: preserveComparisonTarget
      ? currentBrief.verified_competitor
      : { name: "", scope: "", source_url: "" },
    similar_businesses: similarBusinesses,
    brand_name_variants: edited.has("brand_name_variants")
      ? currentBrief.brand_name_variants
      : draft.brand_name_variants,
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: edited.has("customer_supplied_facts")
      ? currentBrief.customer_supplied_facts
      : [],
    known_accuracy_questions: [],
    usp: edited.has("usp") ? currentBrief.usp : draft.usp,
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
  const scope = inferScopeSelection(
    candidate.brand_name,
    candidate.entity_scope,
  );
  const nextBrief = rederiveBrief({
    ...candidate,
    entity_scope: canonicalEntityScope(
      candidate.brand_name,
      scope.scopeKind,
      scope.scopeValue,
    ),
  });
  const nextMeta = createWorkflowMeta(nextBrief, {
    ...currentMeta,
    scopeKind: scope.scopeKind,
    scopeValue: scope.scopeValue,
    comparisonProposal: deriveComparisonProposal(nextBrief),
    comparisonStatus: nextBrief.verified_competitor.name.trim()
      ? "needs_reconfirmation"
      : "pending",
    marketInvalidated: false,
    identityUnverified: !draft.brand_name.trim(),
    intakeScreen: "brand-confirm",
  });
  return { brief: nextBrief, meta: nextMeta };
}

function issue(
  field: string,
  screen: IntakeScreen,
  message: string,
): WorkflowValidationIssue {
  return { field, screen, message };
}

/** Human-facing validation in screen order; never exposes schema paths. */
export function validateBriefForReview(
  brief: BusinessBrief,
  meta: WorkflowMeta,
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  if (!brief.brand_name.trim()) {
    issues.push(issue("brand_name", "brand-confirm", "Isi nama brand Anda."));
  }
  if (!hasNonEmpty(brief.official_sources)) {
    issues.push(
      issue(
        "official_sources",
        "brand-confirm",
        "Tambahkan satu sumber resmi yang dapat dibuka.",
      ),
    );
  }
  if (meta.identityUnverified) {
    issues.push(
      issue(
        "brand_name",
        "brand-confirm",
        "Nuave tidak dapat membaca nama brand dari sumber ini. Konfirmasi atau koreksi nama brand Anda.",
      ),
    );
  }
  if (!brief.entity_scope.trim()) {
    issues.push(issue("entity_scope", "scope", "Pilih cakupan audit."));
  }
  const expectedEntityScope = canonicalEntityScope(
    brief.brand_name,
    meta.scopeKind,
    meta.scopeValue,
  );
  if (brief.entity_scope.trim() && brief.entity_scope !== expectedEntityScope) {
    issues.push(
      issue(
        "entity_scope",
        meta.scopeKind === "whole-brand" ? "scope" : meta.scopeKind,
        "Perbarui cakupan agar sesuai dengan pilihan entitas ini.",
      ),
    );
  }
  if (meta.scopeKind !== "whole-brand" && !meta.scopeValue.trim()) {
    issues.push(
      issue(
        "scopeValue",
        meta.scopeKind === "branch" ? "branch" : "product",
        "Isi nama cabang atau produk yang akan diaudit.",
      ),
    );
  }
  if (!brief.brand_type.trim()) {
    issues.push(issue("brand_type", "scope", "Isi jenis brand."));
  }
  if (!brief.category.trim()) {
    issues.push(
      issue("category", "category", "Pilih atau isi kategori brand."),
    );
  }
  if (!brief.market_context.trim()) {
    issues.push(
      issue(
        "market_context",
        "market",
        "Isi konteks pasar, misalnya nasional atau online di Indonesia.",
      ),
    );
  }
  if (!brief.target_customer.trim()) {
    issues.push(
      issue(
        "target_customer",
        "customer-reasons",
        "Isi pelanggan yang ingin dipahami.",
      ),
    );
  }
  if (!hasNonEmpty(brief.verified_customer_needs)) {
    issues.push(
      issue(
        "verified_customer_needs",
        "customer-reasons",
        "Tambahkan setidaknya satu kebutuhan pelanggan.",
      ),
    );
  }
  if (!hasNonEmpty(brief.verified_decision_criteria)) {
    issues.push(
      issue(
        "verified_decision_criteria",
        "customer-reasons",
        "Tambahkan setidaknya satu pertimbangan keputusan.",
      ),
    );
  }
  if (!hasNonEmpty(brief.verified_offerings)) {
    issues.push(
      issue(
        "verified_offerings",
        "offerings",
        "Tambahkan setidaknya satu produk atau layanan.",
      ),
    );
  }
  if (
    !brief.verified_competitor.name.trim() ||
    meta.comparisonStatus !== "confirmed"
  ) {
    issues.push(
      issue(
        "verified_competitor.name",
        "comparison-target",
        "Konfirmasi satu bisnis pembanding atau alternatif kategori.",
      ),
    );
  }

  const parsed = businessBriefSchema.safeParse(brief);
  if (!parsed.success && issues.length === 0) {
    const first = parsed.error.issues[0];
    const rootField = String(first.path[0] || "brief");
    const field =
      rootField === "verified_competitor" && first.path[1]
        ? `verified_competitor.${String(first.path[1])}`
        : rootField;
    const screenByField: Record<string, IntakeScreen> = {
      brand_name: "brand-confirm",
      official_sources: "brand-confirm",
      entity_scope: "scope",
      brand_type: "scope",
      category: "category",
      market_context: "market",
      target_customer: "customer-reasons",
      verified_customer_needs: "customer-reasons",
      verified_decision_criteria: "customer-reasons",
      verified_offerings: "offerings",
      verified_competitor: "comparison-target",
      "verified_competitor.name": "comparison-target",
      "verified_competitor.scope": "comparison-target",
      "verified_competitor.source_url": "comparison-target",
      similar_businesses: "comparison-target",
      usp: "facts",
      customer_supplied_facts: "facts",
      brand_name_variants: "review",
    };
    const messageByField: Record<string, string> = {
      official_sources:
        "Periksa sumber resmi: gunakan website publik atau profil Instagram yang valid.",
      "verified_competitor.source_url":
        "Periksa URL bisnis pembanding, atau kosongkan jika Anda hanya memiliki namanya.",
      brand_name_variants:
        "Periksa nama brand lain atau kosongkan baris yang tidak digunakan.",
      usp: "Periksa differentiator tambahan atau hapus isian yang terlalu panjang.",
      customer_supplied_facts:
        "Periksa fakta tambahan atau hapus isian yang terlalu panjang.",
    };
    const screen = screenByField[rootField] || "review";
    const message =
      messageByField[field] ||
      messageByField[rootField] ||
      "Periksa kembali informasi di layar ini.";
    issues.push(issue(field, screen, message));
  }
  return issues;
}

export function parseWorkflowStorageState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== WORKFLOW_SCHEMA_VERSION) return null;
  if (typeof record.websiteUrl !== "string") return null;
  if (typeof record.extractedSourceUrl !== "string") return null;
  if (!record.brief || typeof record.brief !== "object") return null;
  if (!record.meta || typeof record.meta !== "object") return null;
  const meta = record.meta as Record<string, unknown>;
  if (
    typeof meta.intakeScreen !== "string" ||
    !INTAKE_SCREENS.includes(meta.intakeScreen as IntakeScreen) ||
    typeof meta.scopeKind !== "string" ||
    !SCOPE_KINDS.includes(meta.scopeKind as ScopeKind) ||
    typeof meta.scopeValue !== "string" ||
    typeof meta.comparisonStatus !== "string" ||
    !["pending", "confirmed", "needs_reconfirmation"].includes(
      meta.comparisonStatus,
    ) ||
    typeof meta.marketInvalidated !== "boolean" ||
    !Array.isArray(meta.customerEditedFields) ||
    meta.customerEditedFields.some((field) => typeof field !== "string") ||
    typeof meta.identityUnverified !== "boolean"
  ) {
    return null;
  }
  const persistedScopeKind = meta.scopeKind as ScopeKind;
  const persistedIntakeScreen = meta.intakeScreen as IntakeScreen;
  if (
    persistedIntakeScreen !== "source-correction" &&
    !intakeScreenSequence(persistedScopeKind).includes(persistedIntakeScreen)
  ) {
    return null;
  }
  const brief = record.brief as Partial<BusinessBrief>;
  const competitor = brief.verified_competitor as
    Partial<BusinessBrief["verified_competitor"]> | undefined;
  const extractedSourceUrl = record.extractedSourceUrl as string;
  const category = brief.category;
  const offerings = brief.verified_offerings;
  const similarBusinesses = brief.similar_businesses;
  const stringFields: (keyof BusinessBrief)[] = [
    "brand_name",
    "entity_scope",
    "brand_type",
    "category",
    "market_context",
    "target_customer",
    "priority_offering",
    "conversion_action",
    "usp",
    "regulated_category_notes",
    "language",
    "agency_name",
    "agency_logo_data_url",
  ];
  const arrayFields: (keyof BusinessBrief)[] = [
    "verified_offerings",
    "verified_customer_needs",
    "verified_decision_criteria",
    "brand_name_variants",
    "customer_supplied_facts",
    "known_accuracy_questions",
  ];
  if (
    stringFields.some((field) => typeof brief[field] !== "string") ||
    arrayFields.some(
      (field) =>
        !Array.isArray(brief[field]) ||
        (brief[field] as unknown[]).some((item) => typeof item !== "string"),
    ) ||
    (extractedSourceUrl && !parseSourceInput(extractedSourceUrl)) ||
    !Array.isArray(brief.official_sources) ||
    brief.official_sources.some(
      (source) => typeof source !== "string" || !parseSourceInput(source),
    ) ||
    !competitor ||
    typeof competitor !== "object" ||
    typeof competitor.name !== "string" ||
    typeof competitor.scope !== "string" ||
    typeof competitor.source_url !== "string" ||
    (competitor.source_url &&
      !isValidSimilarBusinessUrl(competitor.source_url)) ||
    (similarBusinesses !== undefined &&
      (!Array.isArray(similarBusinesses) ||
        similarBusinesses.some(
          (business) =>
            !business ||
            typeof business !== "object" ||
            typeof business.source_url !== "string" ||
            (business.source_url &&
              !isValidSimilarBusinessUrl(business.source_url)),
        ))) ||
    typeof category !== "string" ||
    !Array.isArray(offerings) ||
    typeof brief.entity_scope !== "string" ||
    (brief.entity_scope &&
      brief.entity_scope !==
        canonicalEntityScope(
          typeof brief.brand_name === "string" ? brief.brand_name : "",
          meta.scopeKind as ScopeKind,
          meta.scopeValue,
        )) ||
    (similarBusinesses !== undefined &&
      similarBusinesses.some(
        (business) =>
          typeof business.name !== "undefined" &&
          typeof business.name !== "string",
      )) ||
    !Array.isArray(brief.known_accuracy_questions) ||
    brief.known_accuracy_questions.length > 0 ||
    typeof brief.agency_name !== "string" ||
    typeof brief.agency_logo_data_url !== "string" ||
    brief.agency_name.length > 0 ||
    brief.agency_logo_data_url.length > 0 ||
    brief.language !== "en-US" ||
    (category &&
      (brief.priority_offering !== derivePriorityOffering(offerings) ||
        brief.conversion_action !== defaultConversionAction(category) ||
        brief.regulated_category_notes !==
          defaultRegulatedCategoryNotes(category)))
  ) {
    return null;
  }
  const proposal =
    meta.comparisonProposal as Partial<ComparisonTargetProposal> | null;
  if (
    !proposal ||
    typeof proposal !== "object" ||
    typeof proposal.name !== "string" ||
    typeof proposal.scope !== "string" ||
    typeof proposal.source_url !== "string" ||
    !["suggestion", "category_fallback"].includes(String(proposal.kind))
  ) {
    return null;
  }
  const comparisonName = competitor.name.trim();
  if (
    (meta.comparisonStatus === "confirmed" && !comparisonName) ||
    (meta.comparisonStatus === "pending" && comparisonName) ||
    (meta.comparisonStatus === "needs_reconfirmation" && !comparisonName)
  ) {
    return null;
  }
  const expectedProposal = deriveComparisonProposal({
    category,
    similar_businesses: Array.isArray(similarBusinesses)
      ? similarBusinesses
      : [],
  });
  if (
    proposal.kind !== expectedProposal.kind ||
    proposal.name !== expectedProposal.name ||
    proposal.scope !== expectedProposal.scope ||
    proposal.source_url !== expectedProposal.source_url
  ) {
    return null;
  }
  return value;
}
