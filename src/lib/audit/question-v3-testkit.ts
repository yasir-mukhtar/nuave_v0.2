/** Test-only fixture builders for the dormant v3/G2 prototype. Never imported
 * by runtime code: only *.test.ts files consume this module. */
import { createHash } from "node:crypto";
import {
  parseQuestionFactsV3,
  type QuestionFactsV3,
} from "./question-facts-v3";
import {
  V3_NAMED_SLOT_IDS,
  V3_UNNAMED_SLOT_IDS,
  type V3Candidate,
  type V3RichResponse,
} from "./question-writer-v3";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import {
  G2_FROZEN_INPUT_MANIFEST,
  G2_SELECTION_POLICY,
  g2EnvelopeFingerprint,
  g2PackFingerprint,
  g2RequestConfigFingerprint,
  g2TextFingerprint,
  validateG2FrozenInputs,
  type G2Attribution,
  type G2AttemptRecord,
  type G2PortfolioCapture,
  type G2TextJudgment,
} from "./question-eval-g2";
import {
  V3_FALLBACK_VERSION,
  V3_FINALIZER_VERSION,
  V3_SELECTOR_VERSION,
  type V3Origin,
} from "./question-finalize-v3";
import {
  V3_GUARD_POLICY,
  V3_RICH_INSTRUCTION_VERSION,
  V3_RICH_SCHEMA_VERSION,
  V3_SIMPLE_INSTRUCTION_VERSION,
  V3_SIMPLE_SCHEMA_VERSION,
} from "./question-writer-v3";

export const V3_TEST_SLOT_IDS = [
  "NUAVE-BRAND-NEED-01",
  "NUAVE-BRAND-NEED-02",
  "NUAVE-BRAND-SOLUTION-01",
  "NUAVE-BRAND-SOLUTION-02",
  "NUAVE-BRAND-COMPARISON-01",
  "NUAVE-BRAND-COMPARISON-02",
  "NUAVE-BRAND-VALIDATION-01",
  "NUAVE-BRAND-VALIDATION-02",
  "NUAVE-BRAND-ACTION-01",
  "NUAVE-BRAND-ACTION-02",
] as const;

export function testFactsEnvelope(
  overrides: {
    comparators?: { mode: "named" | "category-alternatives"; names: string[] };
    publicFact?: string;
    factsContext?: Record<string, unknown>;
  } = {},
) {
  return {
    requestId: "g2-test",
    intake: {
      version: "nuave-local-intake-input-v1" as const,
      factVersion: 7,
      confirmed: {
        brand: { name: "Kopi Sudut", primarySource: "kopisudut.id" },
        scope: "brand" as const,
        target: null,
        category: "Kedai kopi",
        offerings: [
          "Kopi Susu Sudut",
          "Americano dan espresso",
          "Biji kopi kemasan 200g",
        ],
        customerReasons: ["Tempat nugas yang nyaman"],
        serviceChannels: [{ channel: "on_premise" }, { channel: "delivery" }],
        market: { reach: "sekitar" as const, areas: ["Jakarta Selatan"] },
        comparators: overrides.comparators ?? {
          mode: "named" as const,
          names: ["Kedai Pagi"],
        },
        publicFact: overrides.publicFact ?? "",
      },
      reviewRows: [] as never[],
    },
    factsContext: {
      entityType: "venue",
      ...(overrides.factsContext ?? {}),
    },
  };
}

export function projectedFacts(
  overrides: Parameters<typeof testFactsEnvelope>[0] = {},
): QuestionFactsV3 {
  const result = parseQuestionFactsV3(testFactsEnvelope(overrides));
  if (result.status !== "projected")
    throw new Error(
      `test fixture did not project: ${JSON.stringify(result.status)}`,
    );
  return result.facts;
}

export function cand(
  text: string,
  extra: Partial<V3Candidate> = {},
): V3Candidate {
  return {
    choice: "pilihan konsumen untuk slot ini",
    contextRefs: [],
    dimensionIds: [],
    text,
    ...extra,
  };
}

export function richResponseOf(
  texts: Partial<Record<string, { primary?: string; reserve?: string }>> = {},
  namedTexts: Partial<Record<string, string>> = {},
): V3RichResponse {
  const defaults: Record<string, { primary: string; reserve: string }> = {
    "NUAVE-BRAND-NEED-01": {
      primary: "Kedai kopi apa saja yang layak dicoba di Jakarta Selatan?",
      reserve: "Kedai kopi mana saja yang buka di Jakarta Selatan?",
    },
    "NUAVE-BRAND-NEED-02": {
      primary: "Saat butuh tempat nugas, kedai kopi mana yang cocok?",
      reserve: "Kalau mau kerja sambil ngopi, ke mana sebaiknya?",
    },
    "NUAVE-BRAND-SOLUTION-01": {
      primary: "Untuk nugas nyaman, kedai kopi apa yang cocok?",
      reserve: "Kedai kopi mana yang nyaman untuk kerja lama?",
    },
    "NUAVE-BRAND-SOLUTION-02": {
      primary: "Di mana bisa pesan latte gula aren untuk diantar?",
      reserve: "Kedai kopi mana yang bisa kirim americano?",
    },
    "NUAVE-BRAND-COMPARISON-01": {
      primary: "Kedai kopi mana saja yang layak masuk shortlist nugas?",
      reserve: "Tempat ngopi mana yang cocok masuk daftar pertimbangan?",
    },
    "NUAVE-BRAND-COMPARISON-02": {
      primary: "Bandingkan beberapa kedai kopi untuk tempat nugas.",
      reserve: "Apa beda kedai kopi yang cocok untuk kerja?",
    },
  };
  const named: Record<string, string> = {
    "NUAVE-BRAND-VALIDATION-01":
      "Apakah Kopi Sudut cocok untuk tempat nugas yang nyaman?",
    "NUAVE-BRAND-VALIDATION-02":
      "Apakah Kopi Sudut layak direkomendasikan untuk ngopi harian?",
    "NUAVE-BRAND-ACTION-01":
      "Bandingkan Kopi Sudut dengan Kedai Pagi untuk tempat nugas.",
    "NUAVE-BRAND-ACTION-02":
      "Siapa yang cocok memilih Kopi Sudut, dan siapa yang kurang cocok?",
    ...namedTexts,
  };
  return {
    market: {
      entityType: "venue",
      category: "Kedai kopi",
      dimensions: [
        {
          id: "nugas",
          label: "Kenyamanan untuk bekerja",
          provenance: "confirmed_abstraction",
        },
        {
          id: "harga",
          label: "Harga harian",
          provenance: "category_inference",
        },
      ],
    },
    unnamed: V3_UNNAMED_SLOT_IDS.map((slotId) => ({
      slotId,
      primary: cand(texts[slotId]?.primary ?? defaults[slotId].primary, {
        dimensionIds: ["nugas"],
      }),
      reserve: cand(texts[slotId]?.reserve ?? defaults[slotId].reserve),
    })),
    named: V3_NAMED_SLOT_IDS.map((slotId) => ({
      slotId,
      text: named[slotId],
    })),
  };
}

export const V3_SIMPLE_VALID_QUESTIONS = [
  "Kedai kopi apa saja yang layak dicoba di Jakarta Selatan?",
  "Saat butuh tempat nugas, kedai kopi mana yang cocok?",
  "Untuk nugas nyaman, kedai kopi apa yang cocok?",
  "Di mana bisa pesan latte gula aren untuk diantar?",
  "Kedai kopi mana saja yang layak masuk shortlist nugas?",
  "Bandingkan beberapa kedai kopi untuk tempat nugas.",
  "Apakah Kopi Sudut cocok untuk tempat nugas yang nyaman?",
  "Apakah Kopi Sudut layak direkomendasikan untuk ngopi harian?",
  "Bandingkan Kopi Sudut dengan Kedai Pagi untuk tempat nugas.",
  "Siapa yang cocok memilih Kopi Sudut, dan siapa yang kurang cocok?",
];

// ---------------------------------------------------------------------------
// Evaluation-record builders (synthetic — define the contract, not evidence)
// ---------------------------------------------------------------------------

export const g2Hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** The frozen input index evaluators bind against: inputId → the
 * manifest-declared envelope hash plus the canonical projected-facts
 * fingerprint. The manifest hash is the frozen contract — attempts bind to
 * it, and `validateG2FrozenInputs` proves the committed fixture still hashes
 * to the declared values (called here so a drifted fixture fails loudly in
 * tests rather than silently rebinding). Pilot inputIds resolve through the
 * manifest's intentional aliases to the development envelopes they reuse. */
export function g2InputIndex(
  envelopes: Record<string, unknown>,
): Record<string, { envelopeSha256: string; factsFingerprint: string }> {
  const manifestErrors = validateG2FrozenInputs(envelopes);
  if (manifestErrors.length)
    throw new Error(`frozen input drift: ${manifestErrors.join("; ")}`);
  const factsFingerprintFor = (envelope: unknown) => {
    const facts = parseQuestionFactsV3(envelope);
    if (facts.status !== "projected")
      throw new Error("test fixture envelope does not project");
    return facts.facts.binding.factsFingerprint;
  };
  const index: Record<
    string,
    { envelopeSha256: string; factsFingerprint: string }
  > = {};
  for (const entry of G2_FROZEN_INPUT_MANIFEST.inputs) {
    if (entry.set === "pilot") continue;
    index[entry.inputId] = {
      envelopeSha256: entry.envelopeSha256,
      factsFingerprint: factsFingerprintFor(envelopes[entry.inputId]),
    };
  }
  const aliases = G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases as Record<
    string,
    string
  >;
  for (const [pilotId, envelopeId] of Object.entries(aliases)) {
    const envelope = envelopes[envelopeId];
    if (envelope)
      index[pilotId] = {
        envelopeSha256: g2EnvelopeFingerprint(envelope),
        factsFingerprint: factsFingerprintFor(envelope),
      };
  }
  return index;
}

const JUDGED_SLOT_IDS = [...V3_UNNAMED_SLOT_IDS, ...V3_NAMED_SLOT_IDS] as const;

/** One fully passing judgment for a text — every §2.1 property true on
 * unnamed slots, naturalness 3, no flags. Named slots keep purpose/adherence
 * flags; the §2.1 properties are recorded but only unnamed values are gated. */
export function passingJudgment(
  slotId: string,
  text: string,
  extra: Partial<G2TextJudgment> = {},
): G2TextJudgment {
  return {
    slotId,
    textFingerprint: g2TextFingerprint(slotId, text),
    naturalness: 3,
    commercialChoice: true,
    entityDemand: true,
    roleScopeFit: true,
    fairOpenness: true,
    singleUnderstandableRequest: true,
    criteriaDiscipline: true,
    adheresInput: true,
    selectedTextFlagged: false,
    modelWritten: true,
    ...extra,
  };
}

/** A complete passing judgment list over the ten canonical texts. */
export function passingJudgments(
  texts: string[] = V3_SIMPLE_VALID_QUESTIONS,
  naturalness = 3,
): G2TextJudgment[] {
  return JUDGED_SLOT_IDS.map((slotId, i) =>
    passingJudgment(slotId, texts[i] ?? `teks ${slotId}`, { naturalness }),
  );
}

/** The frozen v3 version pins an attempt record must declare (evaluator
 * compares them exactly). */
export function g2V3AttemptVersions(
  variant: "rich" | "simple",
): Record<string, string> {
  return {
    instruction:
      variant === "rich"
        ? V3_RICH_INSTRUCTION_VERSION
        : V3_SIMPLE_INSTRUCTION_VERSION,
    schema:
      variant === "rich" ? V3_RICH_SCHEMA_VERSION : V3_SIMPLE_SCHEMA_VERSION,
    guardPolicy: V3_GUARD_POLICY,
    selector: V3_SELECTOR_VERSION,
    fallback: V3_FALLBACK_VERSION,
    finalizer: V3_FINALIZER_VERSION,
  };
}

const CANONICAL_SLOT_ORDER = AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.id);

/** A completed, usable, fully-judged synthetic attempt record with real
 * bindings: the envelope hash and canonical facts fingerprint come from the
 * frozen input index, and the pack/text fingerprints resolve to the exact
 * final texts supplied — the same convention the finalizer's evidence
 * records use. */
export function attemptRecord(
  scheduled: {
    inputId: string;
    variant: "rich" | "simple" | "v2";
    pass: 1 | 2;
  },
  index: Record<string, { envelopeSha256: string; factsFingerprint: string }>,
  extra: Partial<G2AttemptRecord> & {
    finalTexts?: string[] | null;
    naturalness?: number;
  } = {},
): G2AttemptRecord {
  const manifest = G2_FROZEN_INPUT_MANIFEST.inputs.find(
    (entry) => entry.inputId === scheduled.inputId,
  );
  if (!manifest) throw new Error(`unfrozen input ${scheduled.inputId}`);
  const binding = index[scheduled.inputId];
  if (!binding) throw new Error(`no index entry for ${scheduled.inputId}`);
  const {
    finalTexts: finalTextsOption,
    naturalness,
    texts: textsOption,
    finalOrigins: finalOriginsOption,
    ...rest
  } = extra;
  const finalTexts =
    finalTextsOption === undefined
      ? V3_SIMPLE_VALID_QUESTIONS
      : finalTextsOption;
  const finalOrigins =
    finalOriginsOption === undefined
      ? finalTexts
        ? (CANONICAL_SLOT_ORDER.map(() => "primary") as V3Origin[])
        : null
      : finalOriginsOption;
  const factsFingerprint = rest.factsFingerprint ?? binding.factsFingerprint;
  const texts =
    textsOption === undefined
      ? finalTexts
        ? CANONICAL_SLOT_ORDER.map((slotId, i) =>
            passingJudgment(slotId, finalTexts[i], {
              naturalness: naturalness ?? 3,
            }),
          )
        : null
      : textsOption;
  return {
    inputId: scheduled.inputId,
    businessKey: manifest.businessKey,
    set: manifest.set as G2AttemptRecord["set"],
    variant: scheduled.variant,
    pass: scheduled.pass,
    status: "completed",
    serializationComplete: true,
    fullFallback: false,
    inputFingerprint: binding.envelopeSha256,
    factsFingerprint,
    packFingerprint: finalTexts
      ? g2PackFingerprint(factsFingerprint, finalTexts)
      : null,
    finalTexts,
    finalOrigins,
    texts,
    selectionPolicy:
      scheduled.variant === "rich"
        ? G2_SELECTION_POLICY
        : scheduled.variant === "simple"
          ? "primary"
          : "v2-actual",
    requestConfigFingerprint:
      scheduled.variant === "v2"
        ? g2Hash(["v2-actual-request-config", scheduled.inputId])
        : g2RequestConfigFingerprint(scheduled.variant),
    versions:
      scheduled.variant === "v2"
        ? { writer: "question-writer-v2" }
        : g2V3AttemptVersions(scheduled.variant),
    distinctUnnamedDecisions: 6,
    implicitOpportunityWithoutFormula: 2,
    namedPurposeIntact: true,
    usage: {
      inputTokens: 4000,
      cachedReadInputTokens: 0,
      cachedWriteInputTokens: 0,
      outputTokens: 600,
    },
    latencyMs: 8_000,
    ...rest,
  };
}

/** A missing-pack record: no texts, no pack, zero telemetry telemetry
 * still recorded because the attempt was made. */
export function missingAttemptRecord(
  scheduled: {
    inputId: string;
    variant: "rich" | "simple" | "v2";
    pass: 1 | 2;
  },
  index: Record<string, { envelopeSha256: string; factsFingerprint: string }>,
  extra: Partial<G2AttemptRecord> & { naturalness?: number } = {},
): G2AttemptRecord {
  return attemptRecord(scheduled, index, {
    status: "generation_temporarily_unavailable",
    serializationComplete: false,
    packFingerprint: null,
    finalTexts: null,
    texts: null,
    distinctUnnamedDecisions: 0,
    implicitOpportunityWithoutFormula: 0,
    namedPurposeIntact: false,
    ...extra,
  });
}

/** A replay-capture record: the exact final texts, per-slot origins, and
 * the pack fingerprint they hash to under the attempt's facts — internally
 * consistent by construction, never a bare label hash. */
export function portfolioCapture(
  attempt: G2AttemptRecord,
  finalTexts: string[],
  origins: V3Origin[] = finalTexts.map(() => "primary" as V3Origin),
): G2PortfolioCapture {
  return {
    packFingerprint: g2PackFingerprint(attempt.factsFingerprint, finalTexts),
    finalTexts,
    origins,
  };
}

/** An attribution row bound to an actual rich attempt: M is the recorded
 * pack under the frozen selection policy — the same texts and origins the
 * attempt itself recorded. P and C default to an internally consistent
 * replay of the same texts (all-primary origins): identical portfolios
 * that can honestly claim no component credit. */
export function attributionRecord(
  attempt: G2AttemptRecord,
  extra: Partial<G2Attribution> = {},
): G2Attribution {
  const mCapture = attempt.finalTexts
    ? portfolioCapture(
        attempt,
        attempt.finalTexts,
        attempt.finalOrigins ?? undefined,
      )
    : null;
  return {
    inputId: attempt.inputId,
    businessKey: attempt.businessKey,
    pass: attempt.pass,
    variant: "rich",
    captures: {
      P: attempt.finalTexts
        ? portfolioCapture(attempt, attempt.finalTexts)
        : null,
      M: mCapture,
      C: attempt.finalTexts
        ? portfolioCapture(attempt, attempt.finalTexts)
        : null,
    },
    pToMRescuedSlots: [],
    mCausedFinalRegression: false,
    mMechanicallyValid: attempt.finalTexts !== null,
    cOverMMaterialGains: [],
    cOverMLabelOnlyChanges: 0,
    cCausedFinalRegression: false,
    ...extra,
  };
}

/** A genuine mechanical-rescue attribution row: the attempt's own M record
 * kept original text at `slotId` while the P replay capture shows the same
 * slot falling back to `pFallbackText`. To model the reserve doing the
 * work, build the attempt with `finalOrigins` marking the slot "reserve". */
export function rescueAttribution(
  attempt: G2AttemptRecord,
  slotId: string,
  pFallbackText: string,
): G2Attribution {
  const i = (CANONICAL_SLOT_ORDER as readonly string[]).indexOf(slotId);
  if (i < 0 || i >= 6 || !attempt.finalTexts)
    throw new Error("rescue needs an unnamed slot on a packed attempt");
  const pTexts = [...attempt.finalTexts];
  pTexts[i] = pFallbackText;
  const pOrigins = (attempt.finalOrigins ?? []).map((origin, j) =>
    j === i ? ("slot_fallback" as V3Origin) : origin,
  ) as V3Origin[];
  const row = attributionRecord(attempt);
  row.captures.P = portfolioCapture(attempt, pTexts, pOrigins);
  row.pToMRescuedSlots = [slotId];
  return row;
}

/** A genuine independently-reviewed C–M material gain: the C replay capture
 * carries `cText` at `slotId` where M kept the attempt's recorded text, and
 * the gain row binds the two real text fingerprints and the review record. */
export function gainAttribution(
  attempt: G2AttemptRecord,
  slotId: string,
  cText: string,
  reviewRef: string,
): G2Attribution {
  const i = (CANONICAL_SLOT_ORDER as readonly string[]).indexOf(slotId);
  if (i < 0 || i >= 6 || !attempt.finalTexts)
    throw new Error("gain needs an unnamed slot on a packed attempt");
  const cTexts = [...attempt.finalTexts];
  cTexts[i] = cText;
  const row = attributionRecord(attempt);
  row.captures.C = portfolioCapture(attempt, cTexts);
  row.cOverMMaterialGains = [
    {
      slotId,
      mTextFingerprint: g2TextFingerprint(slotId, attempt.finalTexts[i]),
      cTextFingerprint: g2TextFingerprint(slotId, cText),
      reviewRef,
    },
  ];
  return row;
}
