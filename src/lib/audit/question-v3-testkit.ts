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
import {
  G2_FROZEN_INPUT_MANIFEST,
  g2EnvelopeFingerprint,
  type G2Attribution,
  type G2AttemptRecord,
  type G2TextJudgment,
} from "./question-eval-g2";

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

/** The frozen input index evaluators bind against: inputId → envelope hash.
 * Pilot inputIds resolve through the manifest's intentional aliases to the
 * development envelopes they reuse. In tests the envelopes come from the
 * committed fixture; synthetic records may instead carry their own declared
 * envelope hash. */
export function g2InputIndex(
  envelopes: Record<string, unknown>,
): Record<string, { envelopeSha256: string }> {
  const index = Object.fromEntries(
    Object.entries(envelopes).map(([inputId, envelope]) => [
      inputId,
      { envelopeSha256: g2EnvelopeFingerprint(envelope) },
    ]),
  );
  const aliases = G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases as Record<
    string,
    string
  >;
  for (const [pilotId, envelopeId] of Object.entries(aliases)) {
    const envelope = envelopes[envelopeId];
    if (envelope)
      index[pilotId] = { envelopeSha256: g2EnvelopeFingerprint(envelope) };
  }
  return index;
}

/** Envelope hash used by a scheduled attempt under the pilot alias rules. */
export function g2EnvelopeHashForInput(
  inputId: string,
  envelopes: Record<string, unknown>,
): string {
  const aliases = G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases as Record<
    string,
    string
  >;
  const envelopeId = aliases[inputId] ?? inputId;
  const envelope = envelopes[envelopeId];
  if (!envelope) throw new Error(`no frozen envelope for ${inputId}`);
  return g2EnvelopeFingerprint(envelope);
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
    textFingerprint: g2Hash(text),
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

/** A completed, usable, fully-judged synthetic attempt record. */
export function attemptRecord(
  scheduled: {
    inputId: string;
    variant: "rich" | "simple" | "v2";
    pass: 1 | 2;
  },
  envelopes: Record<string, unknown>,
  extra: Partial<G2AttemptRecord> = {},
): G2AttemptRecord {
  const manifest = G2_FROZEN_INPUT_MANIFEST.inputs.find(
    (entry) => entry.inputId === scheduled.inputId,
  );
  if (!manifest) throw new Error(`unfrozen input ${scheduled.inputId}`);
  const texts = extra.texts === undefined ? passingJudgments() : extra.texts;
  return {
    inputId: scheduled.inputId,
    businessKey: manifest.businessKey,
    set: manifest.set as G2AttemptRecord["set"],
    variant: scheduled.variant,
    pass: scheduled.pass,
    status: "completed",
    serializationComplete: true,
    fullFallback: false,
    inputFingerprint: g2EnvelopeHashForInput(scheduled.inputId, envelopes),
    factsFingerprint: "test-facts-fingerprint",
    packFingerprint: "test-pack-fingerprint",
    texts,
    distinctUnnamedDecisions: 6,
    implicitOpportunityWithoutFormula: 2,
    namedPurposeIntact: true,
    usage: { inputTokens: 4000, cachedInputTokens: 0, outputTokens: 600 },
    latencyMs: 8_000,
    ...extra,
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
  envelopes: Record<string, unknown>,
  extra: Partial<G2AttemptRecord> = {},
): G2AttemptRecord {
  return attemptRecord(scheduled, envelopes, {
    status: "generation_temporarily_unavailable",
    serializationComplete: false,
    packFingerprint: null,
    texts: null,
    distinctUnnamedDecisions: 0,
    implicitOpportunityWithoutFormula: 0,
    namedPurposeIntact: false,
    ...extra,
  });
}

export function attributionRecord(
  inputId: string,
  pass: 1 | 2 = 1,
  extra: Partial<G2Attribution> = {},
): G2Attribution {
  const manifest = G2_FROZEN_INPUT_MANIFEST.inputs.find(
    (entry) => entry.inputId === inputId,
  );
  return {
    inputId,
    businessKey: manifest?.businessKey ?? inputId,
    pass,
    variant: "rich",
    packFingerprints: { P: "p", M: "m", C: "c" },
    pToMRescuedSlots: 0,
    mCausedFinalRegression: false,
    mMechanicallyValid: true,
    cOverMMaterialGains: 0,
    cOverMLabelOnlyChanges: 0,
    cCausedFinalRegression: false,
    ...extra,
  };
}
