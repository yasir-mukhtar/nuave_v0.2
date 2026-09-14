/** Dormant Spec 008 R5 G2 finalizer/fallback prototype (§4.2, §5, §8.1).
 * No runtime consumer: no route, UI, storage, or live provider dispatch
 * imports this module. It evaluates parsed rich/simple responses against the
 * G1 facts/context contract, the R5 P/M/C selection rules, and one shared
 * full-fallback budget. Exact fallback wording remains subject to the
 * packet's independent review; these tests prove mechanics only. */
import { createHash } from "node:crypto";
import {
  AUDIT_MEASUREMENT_MATRIX,
  type CanonicalMeasurementSlot,
} from "./measurement-matrix";
import {
  categoryComparisonFallbackName,
  containsIndonesianComparisonIdentity,
  hasIndonesianComparisonRelationForIdentities,
  INDONESIAN_PRIVATE_DATA_PATTERNS,
  INDONESIAN_PROVIDER_SAFETY_PATTERNS,
  normalizeIndonesianIdentity,
} from "./questions-id";
import {
  hasForbiddenV3Identity,
  projectV3SlotContext,
} from "./question-context-v3";
import {
  parseQuestionFactsV3,
  type Correction,
  type QuestionFactsV3,
} from "./question-facts-v3";
import {
  buildV3ProviderBody,
  buildV3WriterRequest,
  parseV3RichResponse,
  parseV3SimpleResponse,
  V3_EVIDENCE_POLICY_VERSION,
  V3_GUARD_POLICY,
  V3_RICH_INSTRUCTION_VERSION,
  V3_RICH_SCHEMA_VERSION,
  V3_SIMPLE_INSTRUCTION_VERSION,
  V3_SIMPLE_SCHEMA_VERSION,
  V3_WRITER_CONTRACT_VERSION,
  type V3Candidate,
  type V3CandidatePosition,
  type V3RichResponse,
  type V3SimpleResponse,
  type V3WriterVariant,
} from "./question-writer-v3";

export const V3_FINALIZER_VERSION = "nuave.question-finalizer.v3.4";
export const V3_SELECTOR_VERSION = "nuave.question-selector.v3.4";
export const V3_FALLBACK_VERSION = "nuave.question-fallback.v3.4";

const UNNAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "forbidden",
);
const NAMED_SLOTS = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.auditedBrandIdentity === "required",
);
const UNNAMED_MIN_CHARS = 8;

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalize = (value: string) => normalizeIndonesianIdentity(value);
const compact = (value: string) => value.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Compatible-008 mechanical checks (R5 §5)
// ---------------------------------------------------------------------------

export type V3CheckRule =
  | "empty"
  | "unexecutable"
  | "length"
  | "question_form"
  | "identity_leakage"
  | "identity_requirement"
  | "competitor_leakage"
  | "comparison_relation"
  | "unsupported_premise"
  | "known_copy"
  | "private_data"
  | "high_impact_advice"
  | "provider_safety"
  | "references";

export type V3CheckIssue = {
  slotId: string;
  position: V3CandidatePosition | "named";
  rule: V3CheckRule;
};

/** §5.1: one question or direct request; natural terminal ?, ., ! or none.
 * At most one `?`, and when present it must end the trimmed text. */
function formIssue(text: string): boolean {
  const marks = text.match(/\?/g)?.length ?? 0;
  return marks > 1 || (marks === 1 && !text.trimEnd().endsWith("?"));
}

/** Asserted guarantee/outcome tokens remain blocked everywhere (§5.2). */
const V3_GUARANTEE_ASSERTION =
  /\b(?:dijamin|jaminan|dipastikan|pasti\s+(?:sembuh|berhasil|aman|untung))\b/i;
/** Comparative/superlative tokens: lawful as an open consumer preference in an
 * unnamed slot ("mana yang termurah"), still an unsupported premise when a
 * named (identity-required) slot attaches them to an entity, and blocked in
 * confirmed regulated categories where provider ranking on outcome or safety
 * axes is a restricted premise. */
const V3_SUPERLATIVE =
  /\b(?:terbaik|teraman|termurah|terpercaya|terlaris|ternyaman|terlengkap|terpopuler|terunggul)\b|\bpaling\s+(?:baik|aman|murah|tepercaya|terpercaya|lengkap|populer|nyaman|bagus|unggul|cepat)\b|\b(?:nomor\s+?satu|number\s+?one|best|safest|most\s+trusted|top[- ]rated)\b/i;
/** Unsupported lifetime/permanent warranty or guaranteed-outcome premise
 * (§5.2 warranty pair): a consumer may ask which provider offers a work
 * warranty, but generated text may not premise a lifetime or permanent
 * outcome on any provider. */
const V3_LIFETIME_OUTCOME =
  /\b(?:seumur\s*[- ]?\s*hidup|lifetime|selamanya|permanen)\b/i;
/** Promised cure or treatment of a named human condition — restricted in
 * regulated discovery; ordinary service discovery ("klinik yang menyediakan
 * pendaftaran online") does not match. */
const V3_CURE_PROMISE =
  /\b(?:menyembuhkan|dijamin\s+sembuh|jaminan\s+(?:sembuh|kesembuhan)|mengobati\s+(?:penyakit|kanker|tumor|diabetes)|menghilangkan\s+(?:penyakit|kanker|tumor))\b/i;

/** Individualized high-impact advice stays blocked. The diagnosis tokens get
 * the §5.2 equipment distinction: diagnosing equipment damage is an ordinary
 * service-selection criterion; personal or mixed human diagnosis stays
 * blocked even when an equipment token is present. */
const V3_INDIVIDUAL_ADVICE =
  /\b(?:resep\s+obat|dosis|obat\s+(?:untuk|saya)|konsultasi\s+(?:medis|dokter|psikolog|hukum|pajak)|nasihat\s+(?:hukum|medis|keuangan)|perencanaan\s+keuangan\s+pribadi|klaim\s+asuransi|investasi\s+pribadi|somasi|gugatan)\b/i;
const V3_DIAGNOSIS = /\b(?:diagnosa|diagnosis|mendiagnosis)\b/i;
const V3_EQUIPMENT_CONTEXT =
  /\b(?:ac|kulkas|mesin|mobil|motor|laptop|komputer|perangkat|device|printer|cctv|elektronik|gadget|handphone|hp|tv|kipas|pompa|genset|kendaraan|sparepart)\b/i;
const V3_PERSON_CONTEXT =
  /\b(?:saya|pribadi|pasien|keluarga|anak|istri|suami|ibu|bayi|badan|tubuh|kesehatan|mental|jiwa|hamil)\b/i;
/** Human/mixed diagnosis objects: an equipment token such as `perangkat`
 * cannot exempt text that diagnoses a human condition (§5.2). */
const V3_HUMAN_CONDITION =
  /\b(?:kanker|tumor|penyakit|diabetes|jantung|ginjal|hati|paru(?:-paru)?|darah|kulit|mental|jiwa|psiki\w*|kehamilan|hamil|infeksi|virus|bakteri|pasien|alergi|stroke|kolesterol|nyeri|demam|sakit\s+gigi)\b/i;
/** Personal drug/treatment suitability is restricted even without guarantee
 * tokens: a treatment token plus any person context is individualized
 * high-impact advice. */
const V3_PERSONAL_TREATMENT =
  /\b(?:obat|pengobatan|terapi|ramuan|suplemen|vaksin|resep|dosis|kemoterapi|perawatan\s+(?:medis|intensif))\b/i;

/** Digit-bearing tokens are the mechanical marker for copied target prices or
 * specifications. Sources that may lawfully appear as consumer *preferences*
 * (buyer constraints, customer needs) never feed this set — that is the §5.2
 * distinction between a confirmed constraint and a copied target claim. */
function copySpecTokens(facts: QuestionFactsV3): Set<string> {
  const sources = [
    ...facts.offerings,
    ...facts.safeFacts.map((fact) => fact.text),
    facts.entityScope.name,
    facts.entityScope.address,
    facts.entityScope.detail,
    facts.businessType,
    facts.marketContext.description,
  ].filter((value): value is string => Boolean(value));
  return new Set(
    sources
      .flatMap((value) => normalize(value).split(/\s+/))
      .filter((token) => token.length >= 2 && /\d/.test(token)),
  );
}

/** Verbatim copy of a buyer-supplied free-text fact (which has no writer
 * permission) of four or more normalized tokens. */
function copiedSafeFact(text: string, facts: QuestionFactsV3): boolean {
  const normalizedText = ` ${normalize(text)} `;
  return facts.safeFacts.some((fact) => {
    const normalized = normalize(fact.text);
    return (
      normalized.split(/\s+/).length >= 4 &&
      normalizedText.includes(` ${normalized} `)
    );
  });
}

/**
 * The compatible-008 mechanical check for one final text in one slot. This is
 * the evaluation-time candidate gate; it does not change the shipped v2
 * writer or shared validation. Consumer preferences are not assertions about
 * the audited business, so superlatives pass unnamed slots in ordinary
 * categories; guaranteed outcomes, lifetime premises, promised cures, named-
 * slot superlatives, personal treatment suitability, and human/mixed
 * diagnosis remain rejected.
 */
export function checkV3Text(
  text: string,
  slot: CanonicalMeasurementSlot,
  facts: QuestionFactsV3,
): V3CheckRule[] {
  const rules: V3CheckRule[] = [];
  const issue = (rule: V3CheckRule) => rules.push(rule);

  const trimmed = text.trim();
  if (!trimmed) {
    issue("empty");
    return rules;
  }
  if (trimmed.length > 700) issue("length");
  if (compact(trimmed).length < UNNAMED_MIN_CHARS) issue("unexecutable");
  if (formIssue(trimmed)) issue("question_form");

  // Identity: forbidden values in unnamed slots, required values in named.
  const brandRequired = slot.auditedBrandIdentity === "required";
  const brandMentioned = [
    facts.identity.brand,
    ...facts.identity.aliases,
    ...facts.identity.sourceSignals,
  ]
    .filter(Boolean)
    .some((identity) => containsIndonesianComparisonIdentity(text, identity));
  if (brandRequired && !brandMentioned) issue("identity_requirement");
  if (hasForbiddenV3Identity(text, facts, slot)) issue("identity_leakage");

  const comparatorMentioned = facts.identity.comparators.some((identity) =>
    containsIndonesianComparisonIdentity(text, identity),
  );
  if (slot.comparisonTargetIdentity === "forbidden" && comparatorMentioned)
    issue("competitor_leakage");
  if (slot.comparisonTargetIdentity === "required") {
    const comparisonName =
      facts.comparison.kind === "unresolved"
        ? categoryComparisonFallbackName(facts.category)
        : (facts.comparison.name ?? "");
    if (!comparisonName) issue("identity_requirement");
    else if (
      !hasIndonesianComparisonRelationForIdentities(
        text,
        [facts.identity.brand, ...facts.identity.aliases],
        comparisonName,
      )
    )
      issue("comparison_relation");
  }

  // Premise policy (§5.2): preference vs assertion.
  if (V3_GUARANTEE_ASSERTION.test(trimmed)) issue("unsupported_premise");
  if (V3_LIFETIME_OUTCOME.test(trimmed)) issue("unsupported_premise");
  if (V3_CURE_PROMISE.test(trimmed)) issue("unsupported_premise");
  if (brandRequired && V3_SUPERLATIVE.test(trimmed))
    issue("unsupported_premise");
  // Regulated categories: ranking providers on outcome/safety axes is a
  // restricted premise; discovery forms stay allowed.
  if (facts.categorySafety && V3_SUPERLATIVE.test(trimmed))
    issue("unsupported_premise");

  // Copied target material in unnamed slots only (named slots may
  // legitimately check confirmed facts about the audited business).
  if (!brandRequired) {
    const tokens = new Set(normalize(trimmed).split(/\s+/));
    if ([...copySpecTokens(facts)].some((token) => tokens.has(token)))
      issue("known_copy");
    if (copiedSafeFact(trimmed, facts)) issue("known_copy");
  }

  if (INDONESIAN_PRIVATE_DATA_PATTERNS.some((p) => p.test(trimmed)))
    issue("private_data");
  if (V3_INDIVIDUAL_ADVICE.test(trimmed)) issue("high_impact_advice");
  if (V3_PERSONAL_TREATMENT.test(trimmed) && V3_PERSON_CONTEXT.test(trimmed))
    issue("high_impact_advice");
  if (
    V3_DIAGNOSIS.test(trimmed) &&
    !(
      V3_EQUIPMENT_CONTEXT.test(trimmed) &&
      !V3_PERSON_CONTEXT.test(trimmed) &&
      !V3_HUMAN_CONDITION.test(trimmed)
    )
  )
    issue("high_impact_advice");
  if (INDONESIAN_PROVIDER_SAFETY_PATTERNS.some((p) => p.test(trimmed)))
    issue("provider_safety");

  return rules;
}

/** Fields actually supplied to the slot's projected writer context: the
 * permitted∩non-empty subset. A contextRef to an absent or unpermitted field
 * is misleading metadata (F5). */
function suppliedContextFields(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
): Set<string> {
  const projected = projectV3SlotContext(facts, slot.id);
  return new Set(
    Object.entries(projected.context)
      .filter(
        ([, value]) =>
          value !== null && !(Array.isArray(value) && value.length === 0),
      )
      .map(([field]) => field),
  );
}

/**
 * Response-level market validation (§4.1/F5): the market object may assert
 * only the confirmed competitive role and category, and dimension provenance
 * must not claim a confirmed basis that does not exist. Role absence is not
 * permission to invent a required role — an unconfirmed role requires the
 * honest "unknown".
 */
export function checkV3Market(
  market: V3RichResponse["market"],
  facts: QuestionFactsV3,
): string[] {
  const issues: string[] = [];
  const roleOk = facts.entityType
    ? market.entityType === facts.entityType
    : market.entityType === "unknown";
  if (!roleOk)
    issues.push(
      facts.entityType
        ? `market.entityType "${market.entityType}" contradicts the confirmed role "${facts.entityType}"`
        : `market.entityType "${market.entityType}" asserts a role the facts do not confirm`,
    );
  if (normalize(market.category) !== normalize(facts.category))
    issues.push(
      `market.category "${market.category}" contradicts the confirmed category "${facts.category}"`,
    );
  const hasBuyerConstraintBasis =
    facts.buyerConstraints.length > 0 || facts.accessConstraints.length > 0;
  const hasConfirmedBasis =
    hasBuyerConstraintBasis ||
    facts.customerNeeds.length > 0 ||
    facts.offerings.length > 0 ||
    facts.marketContext.areas.length > 0 ||
    Boolean(facts.targetCustomer) ||
    Boolean(facts.entityScope.name);
  for (const dimension of market.dimensions) {
    if (dimension.provenance === "buyer_constraint" && !hasBuyerConstraintBasis)
      issues.push(
        `dimension "${dimension.id}" claims buyer_constraint provenance with no confirmed constraints`,
      );
    if (dimension.provenance === "confirmed_abstraction" && !hasConfirmedBasis)
      issues.push(
        `dimension "${dimension.id}" claims confirmed_abstraction provenance with no confirmed basis`,
      );
  }
  return issues;
}

/** Reference check on a structured candidate (§4.2 step 3): every contextRef
 * must resolve to a field that is both permitted for the slot and actually
 * supplied by the confirmed projection; every dimensionId must resolve. */
export function checkV3Candidate(
  candidate: V3Candidate,
  slot: CanonicalMeasurementSlot,
  facts: QuestionFactsV3,
  market: V3RichResponse["market"],
): V3CheckRule[] {
  const rules = checkV3Text(candidate.text, slot, facts);
  const dimensionIds = new Set(market.dimensions.map((d) => d.id));
  const supplied = suppliedContextFields(facts, slot);
  if (
    candidate.dimensionIds.some((id) => !dimensionIds.has(id)) ||
    candidate.contextRefs.some((ref) =>
      ref === "market.dimensions"
        ? market.dimensions.length === 0
        : !supplied.has(ref),
    )
  )
    rules.push("references");
  return rules;
}

// ---------------------------------------------------------------------------
// Reviewed deterministic v3 fallback (recommendation-eligible, slot-safe)
// ---------------------------------------------------------------------------

/** Everything a fallback text may use, drawn only from the slot's projected
 * writer context — every value here is both permitted and confirmed-safe. */
type FallbackMaterial = {
  category: string;
  entity: string | null;
  entityShort: string | null;
  areaScope: string;
  /** Customer needs projected for this slot (empty when unpermitted). */
  needs: string[];
  offering: string;
  constraints: string[];
  channels: ("on_premise" | "on_customer" | "delivery" | "online")[];
  comparisonName: string | null;
  namedIdentity: string;
  /** The confirmed entity scope is a single offering — the named identity IS
   * the product, so "provides itself" phrasing is wrong. */
  offeringScoped: boolean;
  /** Confirmed competitive role ("" when unconfirmed). */
  role: string;
  regulated: boolean;
  newcomer: string;
  axis: string;
};

const V3_ROLE_NOUN: Record<string, string> = {
  product: "merek",
  platform: "platform",
  professional: "profesional",
  retailer: "toko",
  service: "jasa",
  venue: "tempat",
};
/** When the category already names the entity kind, do not double-prefix. */
const V3_ROLE_ENTITY_PRESENT: Record<string, RegExp> = {
  platform: /\b(platform|aplikasi|sistem|perangkat\s+lunak)\b/i,
  professional:
    /\b(dokter|pengacara|konsultan|akuntan|notaris|arsitek|terapis|psikolog|advokat|agensi)\b/i,
  retailer:
    /\b(toko|gerai|outlet|supermarket|minimarket|dealer|distributor|reseller|marketplace)\b/i,
  service:
    /\b(jasa|servis|service|klinik|bengkel|salon|laundry|cuci|rental|penyedia|agen|studio)\b/i,
  venue:
    /\b(kedai|kafe|cafe|resto|restoran|warung|rumah\s+makan|bar|venue|studio|tempat|kantin|waralaba)\b/i,
};
const V3_ROLE_AXIS: Record<string, string> = {
  product: "harga dan kegunaan",
  platform: "fitur dan biaya",
  professional: "keahlian dan biaya",
  retailer: "harga dan kelengkapan",
  service: "harga dan jangkauan layanan",
  venue: "suasana dan harga",
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Build the permitted fallback material for one slot from its projected
 * context. Returns `missing` when the confirmed facts cannot anchor a safe
 * meaningful text — an insufficiency the caller turns into the established
 * correction outcome rather than fabricating wording.
 */
function fallbackMaterial(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
):
  | { ok: true; material: FallbackMaterial }
  | { ok: false; missing: "category" | "identity" | "comparison" } {
  const projected = projectV3SlotContext(facts, slot.id);
  const ctx = projected.context as Record<string, unknown>;
  const category = typeof ctx.category === "string" ? ctx.category.trim() : "";
  if (!category) return { ok: false, missing: "category" };

  const role = projected.entityType ?? "";
  const short = V3_ROLE_NOUN[role] ?? "pilihan";
  const entityPresent = V3_ROLE_ENTITY_PRESENT[role]?.test(category) ?? false;
  const entity =
    role === "product" || (!role && category)
      ? role === "product"
        ? `merek ${category}`
        : `pilihan ${category}`
      : entityPresent
        ? category
        : `${short} ${category}`;
  const areas = stringList(
    (ctx.marketContext as { areas?: unknown } | null)?.areas,
  );
  const needs = stringList(ctx.customerNeeds);
  const offerings = stringList(ctx.offerings);
  // Constraint entries are {text, provenance} objects in the projection.
  const textOf = (entry: unknown) =>
    typeof entry === "string"
      ? entry
      : entry && typeof entry === "object"
        ? ((entry as { text?: unknown }).text ?? "")
        : "";
  const constraints = [
    ...(Array.isArray(ctx.accessConstraints) ? ctx.accessConstraints : []),
    ...(Array.isArray(ctx.buyerConstraints) ? ctx.buyerConstraints : []),
  ]
    .map(textOf)
    .filter(
      (value): value is string => typeof value === "string" && Boolean(value),
    );
  const channels = stringList(
    ctx.serviceChannels,
  ) as FallbackMaterial["channels"];
  const comparison = ctx.comparison as { name?: string | null } | null;
  const scope = ctx.entityScope as {
    kind?: string;
    name?: string | null;
  } | null;
  const brand = compact(facts.identity.brand);
  const brandRequired = slot.auditedBrandIdentity === "required";
  if (brandRequired && !brand) return { ok: false, missing: "identity" };
  // Named texts carry the scoped identity when it still contains the brand;
  // otherwise the confirmed brand itself.
  const scopedName = scope?.name?.trim() ?? "";
  const namedIdentity =
    scopedName && containsIndonesianComparisonIdentity(scopedName, brand)
      ? compact(scopedName)
      : brand;
  const comparisonName = comparison?.name?.trim() ?? null;
  if (slot.comparisonTargetIdentity === "required" && !comparisonName)
    return { ok: false, missing: "comparison" };
  // Regulated status comes from the shared G1 safetyRestrictions field, which
  // every slot's projection carries — not the per-slot categorySafety context
  // key most slots are not permitted to receive.
  const regulated = Boolean(
    typeof projected.safetyRestrictions === "string" &&
    projected.safetyRestrictions.trim(),
  );
  const newcomer =
    /klinik|dokter|rumah\s+sakit|puskesmas|apotek|laboratorium|fisioterapi|optik|bidan/i.test(
      category,
    )
      ? "pasien baru"
      : "pelanggan baru";

  return {
    ok: true,
    material: {
      category,
      entity,
      entityShort: short,
      areaScope: areas.length ? ` di ${areas.join(" atau ")}` : "",
      needs,
      offering: offerings[0] ?? "",
      constraints,
      channels,
      comparisonName,
      namedIdentity,
      offeringScoped: scope?.kind === "offering",
      role,
      regulated,
      newcomer,
      axis: V3_ROLE_AXIS[role] ?? "kebutuhan masing-masing",
    },
  };
}

/** A need that already reads like an occasion or desire keeps its wording. */
const V3_OCCASION_MARKERS =
  /^(?:saat|ketika|kalau|sedang|butuh|perlu|ingin|mau|mencari|cari|membutuhkan|memerlukan|punya|mempunyai)\b/i;
/** A need already carrying its own occasion frame ("Saat bekerja dari
 * kafe") — it must never gain a second "Saat" prefix. */
const V3_ALREADY_FRAMED = /^(?:saat|ketika|kalau|sedang)\b/i;
/** A leading situation/emotion word that turns the rest of the need into a
 * task topic ("bingung lapor pajak tahunan" → "lapor pajak tahunan"). */
const V3_NEED_SITUATION_OPENER =
  /^(?:bingung|khawatir|cemas|kesulitan|kewalahan|pusing|repot|ribet)\s+(?:akan|dengan|soal|untuk)?\s*/i;
/** A need written as a problem/situation statement ("AC di rumah tidak
 * dingin") rather than a desired thing — it frames the occasion directly and
 * must never sit after "membutuhkan". */
const V3_STATEMENT_MARKERS =
  /\b(?:tidak|belum|lambat|rusak|bingung|sulit|susah|boros|bocor|macet|mampet|error|gagal|mati|bermasalah|menumpuk|sering|harus|perlu|terlalu|kurang|penuh|habis|kosong|ketinggalan|tertunda|ribet|repot)\b/i;
/** A constraint phrased as a provider capability ("menerima pasien baru") —
 * usable as a "yang {constraint}" qualifier, never as a comparison axis. */
const V3_CAPABILITY_START =
  /^(?:menerima|menyediakan|melayani|bisa|memiliki|punya|menawarkan|tersedia|mengirim|menjemput|menangani|membuka|menjual)\b/i;
/** A scope limitation ("hanya tersedia sebagai layanan online") — describes a
 * reach limit, not a consumer criterion; never used as a choice axis. */
const V3_LIMITATION_START =
  /^(?:hanya|tidak|tanpa|belum|maksimal|maks\.|maksimum)\b/i;
/** The newcomer-acceptance criterion regulated slot 1 already uses; later
 * regulated slots pick a different constraint so decisions stay distinct. */
const V3_NEWCOMER_CONSTRAINT = /^menerima\s+(?:pasien|pelanggan)\s+baru\b/i;

/** Hypothetical ordinary occasions for the role's category — permitted by R5
 * as a category-level occasion; never asserts the target provides it. */
const V3_ROLE_OCCASION: Record<string, string> = {
  product: "dibawa beraktivitas",
  platform: "mengelola pekerjaan atau usaha",
  professional: "mengurus kebutuhan administrasi atau legal",
  retailer: "belanja kebutuhan sehari-hari",
  service: "perbaikan atau perawatan rutin",
  venue: "berkumpul atau bekerja di luar",
};
/** Ordinary category use cases for offering/use-case slots when the confirmed
 * offering name is itself identity-bearing and excluded from the context. */
const V3_ROLE_USE_CASE: Record<string, string> = {
  product: "pemakaian harian",
  platform: "pekerjaan operasional",
  professional: "kebutuhan administrasi",
  retailer: "kebutuhan belanja rutin",
  service: "kebutuhan perawatan",
  venue: "mampir atau bekerja",
};

function needIsStatement(need: string): boolean {
  const t = need.trim();
  return !V3_OCCASION_MARKERS.test(t) && V3_STATEMENT_MARKERS.test(t);
}

/** Natural occasion framing for a confirmed need: supplied problems and
 * occasion phrases keep their wording ("Saat AC di rumah tidak dingin"); a
 * need already carrying an occasion frame is kept as-is (never "Saat Saat
 * …"); a desired thing becomes "Saat membutuhkan X" only when X is a
 * desired thing. */
function occasionFrame(need: string): string {
  const t = need.trim();
  if (V3_ALREADY_FRAMED.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
  return V3_OCCASION_MARKERS.test(t) || V3_STATEMENT_MARKERS.test(t)
    ? `Saat ${t}`
    : `Saat membutuhkan ${t}`;
}

/** The need as a noun-phrase topic for "Untuk X" frames: leading desire
 * markers strip to the desired thing; a leading situation/emotion word
 * strips to the underlying task ("bingung lapor pajak tahunan" → "lapor
 * pajak tahunan"). `task` marks the stripped-task form so the channel can be
 * attached as an adverb ("untuk X secara online") rather than as a provider
 * qualifier. Still statement-shaped text cannot serve as a topic. */
function needTopic(need: string): { text: string; task: boolean } | null {
  const t = need.trim();
  const task = t.replace(V3_NEED_SITUATION_OPENER, "");
  if (task !== t && task && !needIsStatement(task))
    return { text: task, task: true };
  const thing = t.replace(
    /^(?:butuh|perlu|ingin|mau|mencari|cari|membutuhkan|memerlukan)\s+/i,
    "",
  );
  if (thing && !needIsStatement(thing) && !V3_OCCASION_MARKERS.test(thing))
    return { text: thing, task: false };
  return null;
}

/** A confirmed channel as a second qualifying criterion — it qualifies the
 * consumer's choice, it never claims an order was placed. Platforms are
 * already online so "online" adds no distinguishing criterion there; an
 * on-premise-only channel is the default assumption, not a criterion. */
function channelQualifier(
  role: string,
  channels: FallbackMaterial["channels"],
): string | null {
  for (const channel of ["delivery", "on_customer", "online"] as const) {
    if (!channels.includes(channel)) continue;
    if (channel === "delivery") return "juga melayani pesan antar";
    if (channel === "on_customer")
      return "juga bisa datang ke lokasi pelanggan";
    if (role !== "platform")
      return role === "product" || role === "retailer"
        ? "juga bisa dipesan secara online"
        : "juga bisa melayani secara online";
  }
  return null;
}

/** A constraint usable as a consumer criterion, classified by how it reads. */
function criterionConstraint(
  m: FallbackMaterial,
): { kind: "capability" | "noun"; text: string } | null {
  const capability = m.constraints.find((c) => V3_CAPABILITY_START.test(c));
  if (capability) return { kind: "capability", text: capability };
  const noun = m.constraints.find((c) => !V3_LIMITATION_START.test(c));
  if (noun) return { kind: "noun", text: noun };
  return null;
}

/** The canonical measurement purpose each slot's fallback text must serve —
 * the record an independent reviewer judges exact wording against. This is
 * deliberately NOT a keyword gate: regex presence cannot prove a text serves
 * the purpose, and a truthful reviewed form must not be rejected solely
 * because one chosen keyword is absent. Mechanical revalidation of any
 * built or reviewed form is `checkV3Text`; wording quality stays with
 * independent review of the exact text. */
export const V3_SLOT_FALLBACK_CONTRACT: Record<
  CanonicalMeasurementSlot["category"],
  { purpose: string }
> = {
  category_recommendation: {
    purpose: "which options exist in this category and context",
  },
  situation: {
    purpose: "a real occasion that leads someone to look",
  },
  need_fit: {
    purpose: "a specific need and what suits it",
  },
  offering_use_case: {
    purpose: "one concrete offering or use case",
  },
  shortlist: {
    purpose: "a short list a customer would consider",
  },
  open_comparison: {
    purpose: "comparison among realistic unnamed options",
  },
  brand_fit: {
    purpose: "whether the business suits a stated need",
  },
  explicit_recommendation: {
    purpose: "whether the business is explicitly recommended",
  },
  direct_comparison: {
    purpose: "the business against the comparison target",
  },
  fit_misfit: {
    purpose: "who it suits, who it does not, trade-offs",
  },
};

/**
 * One reviewed deterministic fallback text per slot: entity-seeking forms
 * built only from the slot's permitted, confirmed-safe context. A reviewed
 * per-slot override may supply a category-specific form; overrides are
 * checked like any other text, so an unsafe reviewed form can never pass
 * silently. When the confirmed facts cannot anchor a safe meaningful text,
 * `text` is null and `missing` names the deficient fact field.
 */
export function v3SlotFallback(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
  reviewed?: string,
): { text: string | null; missing: string | null } {
  const built = fallbackMaterial(facts, slot);
  if (!built.ok) return { text: null, missing: built.missing };
  if (reviewed?.trim()) return { text: compact(reviewed), missing: null };
  const m = built.material;
  const E = m.entity ?? `pilihan ${m.category}`;
  // The bare role noun avoids echoing the category when the surrounding text
  // already names it ("Saat membutuhkan botol minum, merek mana yang
  // cocok?") — but a fallback must never lose the category entirely, so the
  // full entity noun is used whenever the rest of the text doesn't name it.
  const eNoun = m.entityShort ?? "pilihan";
  const categoryNamed = (text: string) =>
    normalize(text).includes(normalize(m.category));
  const seeker = (text: string) => (categoryNamed(text) ? eNoun : E);
  const inScope = m.areaScope;

  const need0 = m.needs[0] ?? "";
  const useCase = V3_ROLE_USE_CASE[m.role] ?? `kebutuhan ${m.category}`;
  switch (slot.category) {
    case "category_recommendation":
      return {
        text: m.regulated
          ? `${E} mana saja yang menerima ${m.newcomer}${inScope}?`
          : `${E} apa saja yang layak dipertimbangkan${inScope}?`,
        missing: null,
      };
    case "situation": {
      if (m.regulated) {
        // A confirmed need is a real occasion even in a regulated category —
        // it states the consumer's situation and never asserts the provider
        // treats it. With no confirmed need, use an explicitly hypothetical
        // ordinary category occasion, not a bare restatement of demand.
        const occasion = need0
          ? occasionFrame(need0)
          : `Saat memerlukan ${m.category} untuk ${V3_ROLE_OCCASION[m.role] ?? "perawatan rutin"}`;
        return {
          text: `${occasion}, ${seeker(occasion)} mana yang tersedia${inScope}?`,
          missing: null,
        };
      }
      if (need0) {
        const occasion = occasionFrame(need0);
        return {
          text: `${occasion}, ${seeker(occasion)} mana yang cocok${inScope}?`,
          missing: null,
        };
      }
      // No confirmed need: an ordinary hypothetical category occasion —
      // permitted by R5 and never asserts the target provides it.
      return {
        text: `Saat membutuhkan ${m.category} untuk ${V3_ROLE_OCCASION[m.role] ?? "kebutuhan rutin"}, ${eNoun} mana yang cocok${inScope}?`,
        missing: null,
      };
    }
    case "need_fit": {
      // "A specific need and what suits it" — a materially different consumer
      // decision from the slot-2 occasion, never the same need re-prefixed.
      if (m.regulated) {
        const admin = m.constraints.find(
          (c) => V3_CAPABILITY_START.test(c) && !V3_NEWCOMER_CONSTRAINT.test(c),
        );
        return {
          text: admin
            ? `${seeker(admin)} mana yang ${admin}${inScope}?`
            : `${E} apa yang bisa dihubungi untuk layanan ${m.category}${inScope}?`,
          missing: null,
        };
      }
      const secondNeed = m.needs[1];
      if (secondNeed)
        return {
          text: `${occasionFrame(secondNeed)}, ${E} apa yang cocok${inScope}?`,
          missing: null,
        };
      // The need as a decision topic: the desired thing ("tempat nugas yang
      // nyaman") or the underlying task ("lapor pajak tahunan") — never the
      // same occasion frame slot 2 already leads with.
      const topic = need0 ? needTopic(need0) : null;
      const criterion = criterionConstraint(m);
      if (criterion?.kind === "capability")
        return {
          text: `${E} mana yang ${criterion.text}${inScope}?`,
          missing: null,
        };
      if (criterion?.kind === "noun" && topic)
        return {
          text: `Untuk ${topic.text} dengan ${criterion.text}, ${E} apa yang cocok${inScope}?`,
          missing: null,
        };
      const channelQ = channelQualifier(m.role, m.channels);
      const remoteChannel =
        m.channels.includes("delivery") || m.channels.includes("online");
      // A venue's presence-need ("tempat nugas yang nyaman") is about being
      // there — qualifying it with a delivery/online channel pairs two
      // contradictory premises and is not a real decision.
      if (
        channelQ &&
        topic &&
        !topic.task &&
        !(m.role === "venue" && remoteChannel)
      )
        return {
          text: `Untuk ${topic.text} yang ${channelQ}, ${E} apa yang cocok${inScope}?`,
          missing: null,
        };
      // A situation-word need ("bingung lapor pajak tahunan") abstracts to
      // choosing a provider who explains the task's steps — a different
      // decision from slot 4's concrete service offering, not the same
      // provider-for-the-same-service through the same channel.
      if (topic?.task)
        return {
          text: `Untuk memahami ${topic.text}, ${E} apa yang cocok${inScope}?`,
          missing: null,
        };
      if (criterion?.kind === "noun")
        return {
          text: `Untuk ${useCase}, ${E} apa yang cocok dengan ${criterion.text}${inScope}?`,
          missing: null,
        };
      // A venue the consumer reaches remotely: the coherent decision is
      // ordering the category when one cannot visit — never joining a
      // presence need ("mampir atau bekerja") with a delivery channel.
      if (m.role === "venue" && remoteChannel && channelQ)
        return {
          text: `Saat tidak bisa datang langsung, ${E} apa yang cocok yang ${channelQ}${inScope}?`,
          missing: null,
        };
      if (channelQ)
        return {
          text: `Untuk ${useCase}, ${E} apa yang cocok dan ${channelQ}${inScope}?`,
          missing: null,
        };
      return {
        text: `Untuk ${topic?.text ?? useCase}, ${E} apa yang cocok dengan ${m.axis} yang sesuai${inScope}?`,
        missing: null,
      };
    }
    case "offering_use_case": {
      if (m.offering) {
        if (m.regulated)
          return {
            text: `${seeker(m.offering)} mana yang menyediakan ${m.offering}${inScope}?`,
            missing: null,
          };
        if (projectedEntityIsProduct(m))
          return {
            text: `${eNoun} mana yang menawarkan produk seperti ${m.offering}${inScope}?`,
            missing: null,
          };
        // Software functionality is not accepting an order: a platform's
        // offering is a feature it provides, not a purchase channel.
        if (m.role === "platform")
          return {
            text: `${E} mana yang menyediakan fitur ${m.offering}?`,
            missing: null,
          };
        const serve =
          m.role === "retailer"
            ? "menjual"
            : m.role === "service" || m.role === "professional"
              ? "melayani"
              : "menyediakan";
        // A confirmed channel qualifies the choice as a second criterion; it
        // never composes an order onto an offering that cannot be ordered.
        const channelTail =
          serve === "melayani"
            ? m.channels.includes("online")
              ? " secara online"
              : m.channels.includes("on_customer")
                ? " di lokasi pelanggan"
                : m.channels.includes("delivery")
                  ? " dengan layanan antar-jemput"
                  : ""
            : m.channels.includes("delivery")
              ? " dan bisa melayani pesan antar"
              : m.channels.includes("online")
                ? " dan bisa menerima pesanan secara online"
                : m.channels.includes("on_customer")
                  ? " dan bisa melayani di lokasi pelanggan"
                  : "";
        return {
          text: `${E} mana yang ${serve} ${m.offering}${channelTail}${inScope}?`,
          missing: null,
        };
      }
      // The confirmed offering name can itself be identity-bearing (a scoped
      // product) and absent from the unnamed context; an ordinary category
      // use case still anchors a concrete decision without implying the
      // target's availability.
      return {
        text: projectedEntityIsProduct(m)
          ? `${eNoun} mana yang menawarkan ${m.category} untuk ${useCase}${inScope}?`
          : `${eNoun} mana yang menyediakan layanan ${m.category}${inScope}?`,
        missing: null,
      };
    }
    case "shortlist": {
      if (m.regulated)
        return {
          text: `${E} mana saja yang masuk daftar pilihan berdasarkan layanan yang tersedia${inScope}?`,
          missing: null,
        };
      const criterion = criterionConstraint(m);
      return {
        text:
          criterion?.kind === "capability"
            ? `${E} mana saja yang ${criterion.text} dan layak masuk daftar pilihan${inScope}?`
            : `${E} mana saja yang layak masuk daftar pilihan ${criterion?.kind === "noun" ? `dengan ${criterion.text}` : `berdasarkan ${criterion?.text ?? m.axis}`}${inScope}?`,
        missing: null,
      };
    }
    case "open_comparison": {
      if (m.regulated)
        return {
          text: `Sebutkan dan bandingkan beberapa ${E}${inScope} berdasarkan layanan yang tersedia.`,
          missing: null,
        };
      const criterion = criterionConstraint(m);
      return {
        text:
          criterion?.kind === "capability"
            ? `Sebutkan dan bandingkan beberapa ${E} yang ${criterion.text}${inScope}.`
            : `Sebutkan dan bandingkan beberapa ${E}${inScope} ${criterion?.kind === "noun" ? `dengan ${criterion.text}` : `berdasarkan ${criterion?.text ?? m.axis}`}.`,
        missing: null,
      };
    }
    case "brand_fit": {
      if (m.regulated)
        return {
          text: `Apakah ${m.namedIdentity} menerima ${m.newcomer} untuk ${m.offering || `layanan ${m.category}`}${inScope}?`,
          missing: null,
        };
      if (m.offeringScoped)
        // The scoped identity IS the offering — it cannot provide itself;
        // brand fit becomes fit for an ordinary use of the category.
        return {
          text: `Apakah ${m.namedIdentity} cocok untuk ${useCase}?`,
          missing: null,
        };
      return {
        text: `Apakah ${m.namedIdentity} ${
          m.role === "platform"
            ? `memiliki fitur ${m.offering || `untuk ${m.category}`}`
            : m.role === "product"
              ? `menawarkan ${m.offering || `produk ${m.category}`}`
              : `menyediakan ${m.offering || `layanan ${m.category}`}`
        }${inScope}?`,
        missing: null,
      };
    }
    case "explicit_recommendation":
      // Regulated cases still test explicit recommendation — on the provider
      // as a service choice, never on therapy outcome or safety.
      return {
        text: m.regulated
          ? `Apakah ${m.namedIdentity} layak direkomendasikan untuk layanan ${m.category}${inScope}?`
          : `Apakah ${m.namedIdentity} layak dipertimbangkan untuk ${m.category}${inScope}?`,
        missing: null,
      };
    case "direct_comparison": {
      // A comparison needs an axis a consumer can weigh — a provider
      // capability or a scope limit is not one; regulated discovery compares
      // administrative availability only.
      const axis = m.regulated ? "layanan yang tersedia" : m.axis;
      return {
        text: `Bandingkan ${m.namedIdentity} dengan ${m.comparisonName} berdasarkan ${axis}.`,
        missing: null,
      };
    }
    case "fit_misfit":
      return {
        text: m.regulated
          ? `Apa saja layanan yang ${m.namedIdentity} sediakan, dan kapan pelanggan memilih ${m.category} lain${inScope}?`
          : `Untuk kebutuhan apa ${m.namedIdentity} cocok, dan kapan pelanggan memilih ${m.category} lain${inScope}?`,
        missing: null,
      };
    default:
      return { text: null, missing: "category" };
  }
}

function projectedEntityIsProduct(m: FallbackMaterial): boolean {
  return m.entityShort === "merek";
}

/** The usable fallback for one slot: the reviewed override when it passes the
 * same mechanical checks, else the code-owned deterministic form. An unsafe
 * reviewed override never passes silently, but it also cannot destroy an
 * otherwise-safe built-in. `issues` are the checks for the returned text. */
function usableSlotFallback(
  facts: QuestionFactsV3,
  slot: CanonicalMeasurementSlot,
  reviewed?: string,
): { text: string | null; missing: string | null; issues: V3CheckRule[] } {
  const usable = (text: string | null) => {
    if (!text) return null;
    // Mechanical revalidation only: form, identity, safety, and feasibility
    // guards. Whether the exact wording serves the slot's canonical purpose
    // is independent review's judgment — regex keyword presence is not
    // semantic proof either way.
    const issues = checkV3Text(text, slot, facts);
    return issues.length ? null : issues;
  };
  const first = v3SlotFallback(facts, slot, reviewed);
  if (!first.text) return { ...first, issues: [] };
  const firstIssues = usable(first.text);
  if (firstIssues) return { ...first, issues: firstIssues };
  const builtin = v3SlotFallback(facts, slot);
  if (builtin.text && builtin.text !== first.text) {
    const builtinIssues = usable(builtin.text);
    if (builtinIssues)
      return { text: builtin.text, missing: null, issues: builtinIssues };
  }
  // Neither the reviewed override nor the built-in is usable: report the
  // reviewed form's failure so the attempt records an invalid fallback, not
  // a silently safe-looking pack.
  return {
    text: first.text,
    missing: null,
    issues: checkV3Text(first.text, slot, facts).length
      ? checkV3Text(first.text, slot, facts)
      : ["unexecutable"],
  };
}

// ---------------------------------------------------------------------------
// Selection and finalization (§4.2, §8.1 P/M/C)
// ---------------------------------------------------------------------------

export type V3Origin =
  "primary" | "reserve" | "slot_fallback" | "full_fallback";
export type V3SelectionPolicy = "primary" | "default" | "coverage";

type SlotOption = {
  position: V3CandidatePosition;
  text: string;
  candidate?: V3Candidate;
  issues: V3CheckRule[];
};

/** A named slot's resolvable options in preference order: the response text
 * first, then at most one reviewed fallback. Selection between them is part
 * of portfolio evaluation so a named text conflicting with another selected
 * text is repaired locally, never by a full pack replacement. */
type NamedChoice = {
  slot: CanonicalMeasurementSlot;
  options: {
    text: string;
    origin: "primary" | "slot_fallback";
    issues: V3CheckRule[];
  }[];
};

type PickedNamed = {
  slot: CanonicalMeasurementSlot;
  text: string;
  origin: "primary" | "slot_fallback";
  originalIssues: V3CheckRule[];
};

type Portfolio = { unnamed: SlotOption[]; named: PickedNamed[] };

function namedChoices(
  facts: QuestionFactsV3,
  namedTexts: Map<string, string>,
  fallbacks: Partial<Record<string, string>>,
): NamedChoice[] {
  return NAMED_SLOTS.map((slot) => {
    const original = namedTexts.get(slot.id) ?? "";
    const options: NamedChoice["options"] = [
      {
        text: original,
        origin: "primary",
        issues: checkV3Text(original, slot, facts),
      },
    ];
    const fallback = usableSlotFallback(facts, slot, fallbacks[slot.id]);
    if (fallback.text)
      options.push({
        text: fallback.text,
        origin: "slot_fallback",
        issues: fallback.issues,
      });
    return { slot, options };
  });
}

/** Lexicographic score comparison; equal scores keep the earlier enumeration
 * order, so ties resolve to the canonical slot/candidate order. */
function scoreBeats(candidate: number[], best: number[]) {
  for (let k = 0; k < candidate.length; k++) {
    if (candidate[k] !== best[k]) return candidate[k] < best[k];
  }
  return false;
}

/**
 * Resolve the named picks for one unnamed combination with bounded
 * backtracking (each named slot carries at most two options — the response
 * text and its one reviewed fallback — so at most 2⁴ paths are tried). When
 * a later named slot's options all collide with an earlier pick, the earlier
 * slot's own fallback is substituted; a conflict is repaired locally, never
 * by discarding the pack.
 */
function resolveNamed(
  named: NamedChoice[],
  used: Set<string>,
): PickedNamed[] | null {
  const localUsed = new Set(used);
  const picked: PickedNamed[] = [];
  const go = (k: number): boolean => {
    if (k === named.length) return true;
    const choice = named[k];
    for (const option of choice.options) {
      const key = normalize(option.text);
      if (option.issues.length === 0 && !localUsed.has(key)) {
        localUsed.add(key);
        picked.push({
          slot: choice.slot,
          text: option.text,
          origin: option.origin,
          originalIssues: choice.options[0].issues,
        });
        if (go(k + 1)) return true;
        localUsed.delete(key);
        picked.pop();
      }
    }
    return false;
  };
  return go(0) ? picked : null;
}

/**
 * Evaluate one enumerated combination: all unnamed options valid and
 * pairwise-distinct, then named slots resolve by bounded backtracking so a
 * later conflict can substitute an earlier slot's safe fallback.
 */
function evaluateCombo(
  combo: SlotOption[],
  named: NamedChoice[],
): Portfolio | null {
  if (combo.some((option) => option.issues.length > 0)) return null;
  const used = new Set(combo.map((option) => normalize(option.text)));
  if (used.size !== combo.length) return null;
  const picked = resolveNamed(named, used);
  if (!picked) return null;
  return { unnamed: combo, named: picked };
}

/** Enumerate option combinations in a fixed canonical order; the score
 * vector then picks the best deterministically. Returns the best portfolio
 * plus how many combinations were evaluated. */
function selectPortfolio(
  optionLists: SlotOption[][],
  named: NamedChoice[],
  score: (combo: SlotOption[]) => number[],
): { portfolio: Portfolio | null; evaluated: number } {
  let best: { portfolio: Portfolio; key: number[] } | null = null;
  let evaluated = 0;
  const index = new Array(optionLists.length).fill(0);
  const total = optionLists.reduce((n, list) => n * list.length, 1);
  for (let i = 0; i < total; i++) {
    const combo = optionLists.map((list, j) => list[index[j]]);
    evaluated += 1;
    const portfolio = evaluateCombo(combo, named);
    if (portfolio) {
      const key = score(combo);
      if (!best || scoreBeats(key, best.key)) best = { portfolio, key };
    }
    // Advance the odometer: the last slot varies fastest, so earlier
    // positions in the canonical slot order win ties deterministically.
    for (let j = optionLists.length - 1; j >= 0; j--) {
      index[j] += 1;
      if (index[j] < optionLists[j].length) break;
      index[j] = 0;
    }
  }
  return { portfolio: best?.portfolio ?? null, evaluated };
}

/**
 * Maximum bipartite matching over "each demand node needs one distinct
 * normalized text" — the exact feasibility structure of portfolio selection
 * (the only cross-slot constraint is text distinctness). This is bounded
 * conflict analysis, not portfolio enumeration: it costs no
 * `portfoliosEvaluated` budget and never re-runs the option space.
 */
function maxTextMatching(adjacency: Set<string>[]): {
  /** text → demand node it is matched to. */
  match: Map<string, number>;
  size: number;
} {
  const match = new Map<string, number>();
  const assign = (node: number, seen: Set<string>): boolean => {
    for (const text of adjacency[node]) {
      if (seen.has(text)) continue;
      seen.add(text);
      const current = match.get(text);
      if (current === undefined || assign(current, seen)) {
        match.set(text, node);
        return true;
      }
    }
    return false;
  };
  let size = 0;
  for (let node = 0; node < adjacency.length; node++)
    if (assign(node, new Set())) size++;
  return { match, size };
}

/**
 * The demand nodes that can be left unmatched in SOME maximum matching —
 * reached from an initially free node by alternating paths (non-matching
 * edge node→text, matching edge text→node). These are exactly the slots
 * participating in the infeasibility: a slot outside every alternating
 * component is always matched, so it is a bystander, never affected.
 */
function freeableDemandNodes(
  adjacency: Set<string>[],
  match: Map<string, number>,
): Set<number> {
  const matchedNodes = new Set(match.values());
  const seenTexts = new Set<string>();
  const reached = new Set<number>();
  const queue: number[] = [];
  for (let node = 0; node < adjacency.length; node++)
    if (!matchedNodes.has(node)) {
      reached.add(node);
      queue.push(node);
    }
  while (queue.length) {
    const node = queue.shift()!;
    for (const text of adjacency[node]) {
      if (seenTexts.has(text)) continue;
      const holder = match.get(text);
      if (holder === node) continue; // the matching edge is text→node only
      seenTexts.add(text);
      if (holder !== undefined && !reached.has(holder)) {
        reached.add(holder);
        queue.push(holder);
      }
    }
  }
  return reached;
}

/**
 * Affected slots (§4.2 step 5): a slot earns its single reviewed fallback
 * when every visible option is individually invalid, or when it actually
 * participates in the cross-slot infeasibility — it can be left unmatched in
 * some maximum matching of the slot↔text graph, over resolvable unnamed
 * slots and resolvable named choices together. All defect kinds are found
 * in one pass: an early invalid slot never hides an unrelated conflict
 * group, and a bystander is never marked merely because no complete global
 * solution exists. Unaffected slots keep their selected text exactly; a
 * named slot with no valid option is a named failure the caller's
 * full-fallback path handles.
 */
function affectedSlotIndexes(
  optionLists: SlotOption[][],
  named: NamedChoice[],
): number[] {
  const affected = new Set<number>();
  const resolvable: number[] = [];
  optionLists.forEach((list, i) => {
    if (list.some((option) => option.issues.length === 0)) resolvable.push(i);
    else affected.add(i);
  });
  if (!resolvable.length) return [...affected].sort((a, b) => a - b);
  const namedResolvable = named.filter((choice) =>
    choice.options.some((option) => option.issues.length === 0),
  );
  // A named slot with no valid option cannot be repaired by unnamed
  // fallbacks; the infeasibility belongs to the caller's full-fallback path.
  if (namedResolvable.length !== named.length)
    return [...affected].sort((a, b) => a - b);

  // Demand nodes: each resolvable unnamed slot and each resolvable named
  // choice, each adjacent to its valid options' normalized texts. The node
  // index is the adjacency position — `unnamedNode` maps node → original
  // slot so unmatched demand nodes translate back to the right slot even
  // when invalid slots were omitted from the graph.
  const adjacency: Set<string>[] = [];
  const unnamedNode = new Map<number, number>();
  for (const i of resolvable) {
    unnamedNode.set(adjacency.length, i);
    adjacency.push(
      new Set(
        optionLists[i]
          .filter((option) => option.issues.length === 0)
          .map((option) => normalize(option.text)),
      ),
    );
  }
  for (const choice of namedResolvable) {
    adjacency.push(
      new Set(
        choice.options
          .filter((option) => option.issues.length === 0)
          .map((option) => normalize(option.text)),
      ),
    );
  }
  const { match, size } = maxTextMatching(adjacency);
  if (size === adjacency.length) return [...affected].sort((a, b) => a - b);
  for (const node of freeableDemandNodes(adjacency, match)) {
    const unnamed = unnamedNode.get(node);
    if (unnamed !== undefined) affected.add(unnamed);
  }
  return [...affected].sort((a, b) => a - b);
}

/** Score vectors compared lexicographically (lower is better). The final
 * component is the slot-order position vector flattened implicitly by
 * enumeration order, so ties are stable and deterministic. */
function mScore(combo: SlotOption[]): number[] {
  return [
    combo.filter((o) => o.position === "slot_fallback").length,
    combo.filter((o) => o.position === "reserve").length,
  ];
}
function cScore(combo: SlotOption[]): number[] {
  const dimensions = new Set(
    combo.flatMap((o) => o.candidate?.dimensionIds ?? []),
  );
  return [
    combo.filter((o) => o.position === "slot_fallback").length,
    -dimensions.size,
    combo.filter((o) => o.position === "reserve").length,
  ];
}
/** §8.1 P: primary-only, ignoring reserves and coverage. */
function pOptions(
  options: SlotOption[][],
  includeFallback: boolean,
): SlotOption[][] {
  return options.map((list) =>
    list.filter(
      (o) =>
        o.position === "primary" ||
        (includeFallback && o.position === "slot_fallback"),
    ),
  );
}

export type V3FinalizeDiagnostics = {
  selection: V3SelectionPolicy;
  portfoliosEvaluated: number;
  pass: "primary_selection" | "fallback_selection" | "full_fallback";
  /** Slots that earned a reviewed fallback option (all-invalid or genuinely
   * conflicted); unaffected slots keep their selected text exactly. */
  affectedSlots: string[];
  /** One shared deterministic full-fallback budget; consumed at most once. */
  fullFallbackUsed: boolean;
  /** Raw serialization/failure record, separate from usable recovery. */
  serialization: {
    responseReceived: boolean;
    serializationComplete: boolean;
    finishReason: string | null;
  };
  guardOutcomes: {
    slotId: string;
    position: V3CandidatePosition | "named";
    issues: V3CheckRule[];
  }[];
  failedAttempts: { stage: string; reason: string }[];
};

export type V3SlotResult = {
  slotId: string;
  order: number;
  category: CanonicalMeasurementSlot["category"];
  measurementPurpose: string;
  reportAssessmentClass: CanonicalMeasurementSlot["reportAssessmentClass"];
  auditedBrandIdentity: CanonicalMeasurementSlot["auditedBrandIdentity"];
  comparisonTargetIdentity: CanonicalMeasurementSlot["comparisonTargetIdentity"];
  text: string;
  origin: V3Origin;
};

export type V3FinalizeResult =
  | {
      status: "completed";
      prompts: V3SlotResult[];
      evidence: V3QuestionEvidence;
      diagnostics: V3FinalizeDiagnostics;
    }
  | {
      status: "input_correction_required";
      issues: Correction[];
      diagnostics: V3FinalizeDiagnostics;
    }
  | {
      status: "generation_temporarily_unavailable";
      diagnostics: V3FinalizeDiagnostics;
    };

type V3QuestionEvidence = {
  evidencePolicyVersion: typeof V3_EVIDENCE_POLICY_VERSION;
  binding: QuestionFactsV3["binding"];
  versions: {
    writerContract: string;
    instruction: string;
    schema: string;
    projection: string;
    context: string;
    guardPolicy: typeof V3_GUARD_POLICY;
    selector: string;
    fallback: string;
    finalizer: string;
  };
  fingerprints: { pack: string; perSlot: Record<string, string> };
  origins: Record<string, V3Origin>;
  contextProvenance: Record<
    string,
    { suppliedFields: string[]; permittedFields: readonly string[] }
  >;
  writerHints: Record<
    string,
    { choice: string; dimensionIds: string[]; contextRefs: string[] }
  >;
  semanticEvaluations: {
    naturalness: "not_evaluated";
    standaloneRequest: "not_evaluated";
    inputAdherence: "not_evaluated";
  };
};

function buildEvidence(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
  prompts: V3SlotResult[],
  hints: Record<string, V3Candidate | undefined>,
): V3QuestionEvidence {
  const contextProvenance: V3QuestionEvidence["contextProvenance"] = {};
  for (const slot of AUDIT_MEASUREMENT_MATRIX) {
    const projected = projectV3SlotContext(facts, slot.id);
    const supplied = Object.entries(projected.context)
      .filter(
        ([, value]) =>
          value !== null && !(Array.isArray(value) && value.length === 0),
      )
      .map(([field]) => field);
    contextProvenance[slot.id] = {
      suppliedFields: supplied,
      permittedFields: projected.permissions.fields,
    };
  }
  const perSlot: Record<string, string> = {};
  for (const prompt of prompts)
    perSlot[prompt.slotId] = hash([prompt.slotId, prompt.text]);
  return {
    evidencePolicyVersion: V3_EVIDENCE_POLICY_VERSION,
    binding: facts.binding,
    versions: {
      writerContract: V3_WRITER_CONTRACT_VERSION,
      instruction:
        variant === "rich"
          ? V3_RICH_INSTRUCTION_VERSION
          : V3_SIMPLE_INSTRUCTION_VERSION,
      schema:
        variant === "rich" ? V3_RICH_SCHEMA_VERSION : V3_SIMPLE_SCHEMA_VERSION,
      projection: facts.version,
      context: "nuave.question-context.v3.1",
      guardPolicy: V3_GUARD_POLICY,
      selector: V3_SELECTOR_VERSION,
      fallback: V3_FALLBACK_VERSION,
      finalizer: V3_FINALIZER_VERSION,
    },
    fingerprints: {
      pack: hash([
        facts.binding.factsFingerprint,
        prompts.map((prompt) => [prompt.slotId, prompt.text]),
      ]),
      perSlot,
    },
    origins: Object.fromEntries(
      prompts.map((prompt) => [prompt.slotId, prompt.origin]),
    ),
    contextProvenance,
    writerHints: Object.fromEntries(
      Object.entries(hints)
        .filter((entry): entry is [string, V3Candidate] => Boolean(entry[1]))
        .map(([slotId, candidate]) => [
          slotId,
          {
            choice: candidate.choice,
            dimensionIds: candidate.dimensionIds,
            contextRefs: candidate.contextRefs,
          },
        ]),
    ),
    semanticEvaluations: {
      naturalness: "not_evaluated",
      standaloneRequest: "not_evaluated",
      inputAdherence: "not_evaluated",
    },
  };
}

/**
 * The one shared full-fallback attempt (§4.2 steps 2 and 6): the reviewed
 * deterministic pack is built and rechecked once whether reached from a
 * transport/serialization failure or an exhausted selection. An insufficient
 * safe basis returns the correction outcome; an unsafe build returns the
 * unavailability outcome — neither is ever reported as a usable pack.
 */
function buildFullFallbackPack(
  facts: QuestionFactsV3,
  reviewed: Partial<Record<string, string>>,
):
  | { outcome: "pack"; prompts: V3SlotResult[] }
  | { outcome: "insufficient"; issues: Correction[] }
  | { outcome: "invalid" } {
  const issues: Correction[] = [];
  let insufficient = false;
  let invalid = false;
  const prompts: V3SlotResult[] = [];
  for (const slot of AUDIT_MEASUREMENT_MATRIX) {
    const fallback = usableSlotFallback(facts, slot, reviewed[slot.id]);
    if (!fallback.text) {
      insufficient = true;
      issues.push({
        field: fallback.missing ?? "category",
        code: "missing",
        target: null,
      });
      continue;
    }
    if (fallback.issues.length) invalid = true;
    prompts.push({
      slotId: slot.id,
      order: slot.order,
      category: slot.category,
      measurementPurpose: slot.measurementPurpose,
      reportAssessmentClass: slot.reportAssessmentClass,
      auditedBrandIdentity: slot.auditedBrandIdentity,
      comparisonTargetIdentity: slot.comparisonTargetIdentity,
      text: fallback.text,
      origin: "full_fallback",
    });
  }
  if (insufficient) return { outcome: "insufficient", issues };
  if (
    invalid ||
    new Set(prompts.map((p) => normalize(p.text))).size !== prompts.length
  )
    return { outcome: "invalid" };
  return { outcome: "pack", prompts };
}

function assembleResult(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
  portfolio: Portfolio | null,
  diagnostics: V3FinalizeDiagnostics,
  reviewed: Partial<Record<string, string>>,
): V3FinalizeResult {
  const prompts: V3SlotResult[] = [];
  const hints: Record<string, V3Candidate | undefined> = {};

  if (portfolio) {
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      if (slot.auditedBrandIdentity === "forbidden") {
        const option = portfolio.unnamed[UNNAMED_SLOTS.indexOf(slot)];
        prompts.push({
          slotId: slot.id,
          order: slot.order,
          category: slot.category,
          measurementPurpose: slot.measurementPurpose,
          reportAssessmentClass: slot.reportAssessmentClass,
          auditedBrandIdentity: slot.auditedBrandIdentity,
          comparisonTargetIdentity: slot.comparisonTargetIdentity,
          text: option.text,
          origin:
            option.position === "slot_fallback"
              ? "slot_fallback"
              : option.position,
        });
        hints[slot.id] = option.candidate;
      } else {
        const picked = portfolio.named.find((n) => n.slot.id === slot.id)!;
        prompts.push({
          slotId: slot.id,
          order: slot.order,
          category: slot.category,
          measurementPurpose: slot.measurementPurpose,
          reportAssessmentClass: slot.reportAssessmentClass,
          auditedBrandIdentity: slot.auditedBrandIdentity,
          comparisonTargetIdentity: slot.comparisonTargetIdentity,
          text: picked.text,
          origin: picked.origin === "primary" ? "primary" : "slot_fallback",
        });
      }
    }
    return {
      status: "completed",
      prompts,
      evidence: buildEvidence(facts, variant, prompts, hints),
      diagnostics,
    };
  }

  // One shared full-fallback budget, consumed exactly once.
  diagnostics.pass = "full_fallback";
  diagnostics.fullFallbackUsed = true;
  const built = buildFullFallbackPack(facts, reviewed);
  if (built.outcome === "insufficient")
    return {
      status: "input_correction_required",
      issues: built.issues,
      diagnostics,
    };
  if (built.outcome === "invalid")
    return { status: "generation_temporarily_unavailable", diagnostics };
  return {
    status: "completed",
    prompts: built.prompts,
    evidence: buildEvidence(facts, variant, built.prompts, {}),
    diagnostics,
  };
}

function newDiagnostics(
  selection: V3SelectionPolicy,
  failedAttempts: { stage: string; reason: string }[] | undefined,
  serialization?: Partial<V3FinalizeDiagnostics["serialization"]>,
): V3FinalizeDiagnostics {
  return {
    selection,
    portfoliosEvaluated: 0,
    pass: "primary_selection",
    affectedSlots: [],
    fullFallbackUsed: false,
    serialization: {
      responseReceived: serialization?.responseReceived ?? true,
      serializationComplete: serialization?.serializationComplete ?? true,
      finishReason: serialization?.finishReason ?? null,
    },
    guardOutcomes: [],
    failedAttempts: [...(failedAttempts ?? [])],
  };
}

/**
 * The provider/structural-failure path (§4.2 step 2): no portfolio selection
 * is attempted and no primary origins are reported — the shared full-fallback
 * pack is built directly and tagged exactly once.
 */
function finalizeFullFallbackOnly(
  facts: QuestionFactsV3,
  variant: V3WriterVariant,
  options: {
    selection?: V3SelectionPolicy;
    reviewedSlotFallbacks?: Partial<Record<string, string>>;
    failedAttempts?: { stage: string; reason: string }[];
    serialization?: Partial<V3FinalizeDiagnostics["serialization"]>;
  },
): V3FinalizeResult {
  const diagnostics = newDiagnostics(
    options.selection ?? "default",
    options.failedAttempts,
    options.serialization,
  );
  return assembleResult(
    facts,
    variant,
    null,
    diagnostics,
    options.reviewedSlotFallbacks ?? {},
  );
}

/**
 * Finalize one parsed rich response under a fixed selection policy
 * (§4.2): candidate + market checks → ≤64 primary/reserve portfolios →
 * one reviewed fallback per genuinely affected slot → ≤729 portfolios →
 * the shared full-fallback attempt. No recursive repair and no provider
 * retry.
 */
export function finalizeV3RichResponse(
  facts: QuestionFactsV3,
  response: V3RichResponse,
  options: {
    selection?: V3SelectionPolicy;
    reviewedSlotFallbacks?: Partial<Record<string, string>>;
    failedAttempts?: { stage: string; reason: string }[];
    serialization?: Partial<V3FinalizeDiagnostics["serialization"]>;
  } = {},
): V3FinalizeResult {
  const selection = options.selection ?? "default";
  const fallbacks = options.reviewedSlotFallbacks ?? {};
  const diagnostics = newDiagnostics(
    selection,
    options.failedAttempts,
    options.serialization,
  );
  const guardOutcomes = diagnostics.guardOutcomes;

  // Response-level market binding (F5): a market object contradicting the
  // confirmed role/category, or claiming a confirmed basis that does not
  // exist, invalidates the grounding of every candidate.
  const marketIssues = checkV3Market(response.market, facts);

  const namedTexts = new Map(
    response.named.map((entry) => [entry.slotId, entry.text]),
  );
  const named = namedChoices(facts, namedTexts, fallbacks);
  for (const slot of NAMED_SLOTS) {
    const choice = named.find((n) => n.slot.id === slot.id)!;
    for (const option of choice.options)
      guardOutcomes.push({
        slotId: slot.id,
        position: option.origin === "primary" ? "named" : "slot_fallback",
        issues: option.issues,
      });
  }

  const optionLists: SlotOption[][] = UNNAMED_SLOTS.map((slot) => {
    const entry = response.unnamed.find((e) => e.slotId === slot.id)!;
    return (
      [
        ["primary", entry.primary],
        ["reserve", entry.reserve],
      ] as const
    ).map(([position, candidate]) => {
      const issues = checkV3Candidate(candidate, slot, facts, response.market);
      if (marketIssues.length) issues.push("references");
      guardOutcomes.push({ slotId: slot.id, position, issues });
      return { position, text: candidate.text, candidate, issues };
    });
  });

  const scorer = selection === "coverage" ? cScore : mScore;
  // P evaluates the primary-only option space: affected detection and the
  // fallback pass both see only primaries plus earned fallbacks.
  const visible =
    selection === "primary" ? pOptions(optionLists, false) : optionLists;

  const first = selectPortfolio(visible, named, scorer);
  diagnostics.portfoliosEvaluated += first.evaluated;
  if (first.portfolio) {
    diagnostics.pass = "primary_selection";
    return assembleResult(
      facts,
      "rich",
      first.portfolio,
      diagnostics,
      fallbacks,
    );
  }

  const affected = affectedSlotIndexes(visible, named);
  diagnostics.affectedSlots = affected.map((i) => UNNAMED_SLOTS[i].id);
  if (affected.length) {
    const withFallbacks = visible.map((list, i) => {
      if (!affected.includes(i)) return list;
      const fallback = usableSlotFallback(
        facts,
        UNNAMED_SLOTS[i],
        fallbacks[UNNAMED_SLOTS[i].id],
      );
      if (!fallback.text) return list;
      const option: SlotOption = {
        position: "slot_fallback",
        text: fallback.text,
        issues: fallback.issues,
      };
      guardOutcomes.push({
        slotId: UNNAMED_SLOTS[i].id,
        position: "slot_fallback",
        issues: option.issues,
      });
      return [...list, option];
    });
    const second = selectPortfolio(
      selection === "primary" ? pOptions(withFallbacks, true) : withFallbacks,
      named,
      scorer,
    );
    diagnostics.portfoliosEvaluated += second.evaluated;
    if (second.portfolio) {
      diagnostics.pass = "fallback_selection";
      return assembleResult(
        facts,
        "rich",
        second.portfolio,
        diagnostics,
        fallbacks,
      );
    }
  }
  return assembleResult(facts, "rich", null, diagnostics, fallbacks);
}

/** The simple control: ten final strings with the same per-slot mechanical
 * checks, the same one-fallback-per-affected-slot repair, and the same shared
 * full-fallback budget. No reserves and no returned market/decision metadata. */
export function finalizeV3SimpleResponse(
  facts: QuestionFactsV3,
  response: V3SimpleResponse,
  options: {
    reviewedSlotFallbacks?: Partial<Record<string, string>>;
    failedAttempts?: { stage: string; reason: string }[];
    serialization?: Partial<V3FinalizeDiagnostics["serialization"]>;
  } = {},
): V3FinalizeResult {
  const fallbacks = options.reviewedSlotFallbacks ?? {};
  const diagnostics = newDiagnostics(
    "primary",
    options.failedAttempts,
    options.serialization,
  );
  const guardOutcomes = diagnostics.guardOutcomes;

  // The simple response carries ten strings in canonical slot order;
  // questions[i] belongs to matrix order i+1.
  const textsByOrder = new Map(response.questions.map((q, i) => [i + 1, q]));
  const namedTexts = new Map(
    NAMED_SLOTS.map((slot) => [slot.id, textsByOrder.get(slot.order) ?? ""]),
  );
  const named = namedChoices(facts, namedTexts, fallbacks);
  for (const slot of NAMED_SLOTS) {
    const choice = named.find((n) => n.slot.id === slot.id)!;
    for (const option of choice.options)
      guardOutcomes.push({
        slotId: slot.id,
        position: option.origin === "primary" ? "named" : "slot_fallback",
        issues: option.issues,
      });
  }

  const optionLists: SlotOption[][] = UNNAMED_SLOTS.map((slot) => {
    const text = textsByOrder.get(slot.order) ?? "";
    const issues = checkV3Text(text, slot, facts);
    guardOutcomes.push({ slotId: slot.id, position: "primary", issues });
    return [{ position: "primary" as const, text, issues }];
  });

  const first = selectPortfolio(optionLists, named, mScore);
  diagnostics.portfoliosEvaluated += first.evaluated;
  if (first.portfolio) {
    diagnostics.pass = "primary_selection";
    return assembleResult(
      facts,
      "simple",
      first.portfolio,
      diagnostics,
      fallbacks,
    );
  }

  const affected = affectedSlotIndexes(optionLists, named);
  diagnostics.affectedSlots = affected.map((i) => UNNAMED_SLOTS[i].id);
  if (affected.length) {
    const withFallbacks = optionLists.map((list, i) => {
      if (!affected.includes(i)) return list;
      const fallback = usableSlotFallback(
        facts,
        UNNAMED_SLOTS[i],
        fallbacks[UNNAMED_SLOTS[i].id],
      );
      if (!fallback.text) return list;
      const option: SlotOption = {
        position: "slot_fallback",
        text: fallback.text,
        issues: fallback.issues,
      };
      guardOutcomes.push({
        slotId: UNNAMED_SLOTS[i].id,
        position: "slot_fallback",
        issues: option.issues,
      });
      return [...list, option];
    });
    const second = selectPortfolio(withFallbacks, named, mScore);
    diagnostics.portfoliosEvaluated += second.evaluated;
    if (second.portfolio) {
      diagnostics.pass = "fallback_selection";
      return assembleResult(
        facts,
        "simple",
        second.portfolio,
        diagnostics,
        fallbacks,
      );
    }
  }
  return assembleResult(facts, "simple", null, diagnostics, fallbacks);
}

// ---------------------------------------------------------------------------
// Dormant orchestration over an injected transport (§4.2 steps 1–7)
// ---------------------------------------------------------------------------

export type V3Transport = (body: unknown) => Promise<unknown>;

export type V3GenerationOutcome =
  | { status: "invalid_request" }
  | { status: "input_correction_required"; issues: Correction[] }
  | {
      status: "completed";
      pack: Extract<V3FinalizeResult, { status: "completed" }>;
      attempts: number;
    }
  | {
      status: "generation_temporarily_unavailable";
      diagnostics: V3FinalizeDiagnostics;
      attempts: number;
    };

const V3_TRUNCATING_FINISH_REASONS = new Set([
  "length",
  "max_output_tokens",
  "incomplete",
  "content_filter",
]);

/** The injected transport may return the decoded response directly or a
 * `{value, finishReason}` envelope; a truncating finish reason is a
 * serialization failure, kept separate from usable recovery. */
function unwrapTransport(raw: unknown): {
  value: unknown;
  finishReason: string | null;
} {
  if (raw && typeof raw === "object" && "value" in raw) {
    const envelope = raw as { value: unknown; finishReason?: unknown };
    return {
      value: envelope.value,
      finishReason:
        typeof envelope.finishReason === "string"
          ? envelope.finishReason
          : null,
    };
  }
  return { value: raw, finishReason: null };
}

/**
 * §4.2 orchestration for the dormant prototype: correction outcome before any
 * call, at most one primary transport call, provider/structural failure to
 * the single shared full-fallback attempt, then bounded selection. The
 * transport is always injected — there is no default live transport, no
 * credential loading, and no retries.
 */
export async function runV3Generation(input: {
  factsInput: unknown;
  variant: V3WriterVariant;
  transport: V3Transport;
  selection?: V3SelectionPolicy;
  reviewedSlotFallbacks?: Partial<Record<string, string>>;
}): Promise<V3GenerationOutcome> {
  const factsResult = parseQuestionFactsV3(input.factsInput);
  if (factsResult.status === "INVALID_REQUEST")
    return { status: "invalid_request" };
  if (factsResult.status === "INPUT_CORRECTION_REQUIRED")
    return {
      status: "input_correction_required",
      issues: factsResult.issues,
    };
  const facts = factsResult.facts;
  const failedAttempts: { stage: string; reason: string }[] = [];

  const request = buildV3WriterRequest(facts, input.variant);
  const body = buildV3ProviderBody(request);
  let received: { value: unknown; finishReason: string | null };
  try {
    received = unwrapTransport(await input.transport(body));
  } catch (error) {
    failedAttempts.push({
      stage: "transport",
      reason: error instanceof Error ? error.message : "transport failed",
    });
    return finish(
      finalizeFullFallbackOnly(facts, input.variant, {
        ...input,
        failedAttempts,
        serialization: {
          responseReceived: false,
          serializationComplete: false,
          finishReason: null,
        },
      }),
    );
  }

  if (
    received.finishReason &&
    V3_TRUNCATING_FINISH_REASONS.has(received.finishReason)
  ) {
    failedAttempts.push({
      stage: "serialization",
      reason: `truncated response (finishReason=${received.finishReason})`,
    });
    return finish(
      finalizeFullFallbackOnly(facts, input.variant, {
        ...input,
        failedAttempts,
        serialization: {
          responseReceived: true,
          serializationComplete: false,
          finishReason: received.finishReason,
        },
      }),
    );
  }

  const serialization = {
    responseReceived: true,
    finishReason: received.finishReason,
  };
  if (input.variant === "rich") {
    const parsed = parseV3RichResponse(received.value);
    if (!parsed.ok) {
      failedAttempts.push({
        stage: "parse",
        reason: `${parsed.failure}: ${parsed.detail}`,
      });
      return finish(
        finalizeFullFallbackOnly(facts, "rich", {
          ...input,
          failedAttempts,
          serialization: { ...serialization, serializationComplete: false },
        }),
      );
    }
    return finish(
      finalizeV3RichResponse(facts, parsed.response, {
        ...input,
        failedAttempts,
        serialization: { ...serialization, serializationComplete: true },
      }),
    );
  }

  const parsed = parseV3SimpleResponse(received.value);
  if (!parsed.ok) {
    failedAttempts.push({
      stage: "parse",
      reason: `${parsed.failure}: ${parsed.detail}`,
    });
    return finish(
      finalizeFullFallbackOnly(facts, "simple", {
        ...input,
        failedAttempts,
        serialization: { ...serialization, serializationComplete: false },
      }),
    );
  }
  return finish(
    finalizeV3SimpleResponse(facts, parsed.response, {
      ...input,
      failedAttempts,
      serialization: { ...serialization, serializationComplete: true },
    }),
  );

  function finish(result: V3FinalizeResult): V3GenerationOutcome {
    if (result.status === "completed")
      return { status: "completed", pack: result, attempts: 1 };
    if (result.status === "input_correction_required")
      return { status: "input_correction_required", issues: result.issues };
    return {
      status: "generation_temporarily_unavailable",
      diagnostics: result.diagnostics,
      attempts: 1,
    };
  }
}

/** §8.1 P/M/C derivation: run the same response through the three frozen
 * selection policies offline. Each result keeps its own diagnostics and pack
 * fingerprint so attribution binds to the exact attempt and portfolio. */
export function deriveV3Attribution(
  facts: QuestionFactsV3,
  response: V3RichResponse,
  reviewedSlotFallbacks?: Partial<Record<string, string>>,
) {
  const P = finalizeV3RichResponse(facts, response, {
    selection: "primary",
    reviewedSlotFallbacks,
  });
  const M = finalizeV3RichResponse(facts, response, {
    selection: "default",
    reviewedSlotFallbacks,
  });
  const C = finalizeV3RichResponse(facts, response, {
    selection: "coverage",
    reviewedSlotFallbacks,
  });
  const fingerprint = (result: V3FinalizeResult) =>
    result.status === "completed" ? result.evidence.fingerprints.pack : null;
  // The record-ready capture shape: canonical final texts, per-slot origins,
  // and the pack fingerprint under the shared hash convention — exactly the
  // fields a G2Attribution row's `captures` must carry.
  const capture = (result: V3FinalizeResult) =>
    result.status === "completed"
      ? {
          packFingerprint: result.evidence.fingerprints.pack,
          finalTexts: AUDIT_MEASUREMENT_MATRIX.map(
            (slot) =>
              result.prompts.find((prompt) => prompt.slotId === slot.id)!.text,
          ),
          origins: AUDIT_MEASUREMENT_MATRIX.map(
            (slot) =>
              result.prompts.find((prompt) => prompt.slotId === slot.id)!
                .origin,
          ),
        }
      : null;
  return {
    P,
    M,
    C,
    captures: { P: capture(P), M: capture(M), C: capture(C) },
    fingerprints: { P: fingerprint(P), M: fingerprint(M), C: fingerprint(C) },
  };
}
