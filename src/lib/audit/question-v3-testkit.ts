/** Test-only fixture builders for the dormant v3/G2 prototype. Never imported
 * by runtime code: only *.test.ts files consume this module. */
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
    ...(overrides.factsContext ? { factsContext: overrides.factsContext } : {}),
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
