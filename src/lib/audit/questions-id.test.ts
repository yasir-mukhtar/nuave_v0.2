import { describe, expect, it } from "vitest";
import type { BusinessBrief } from "./types";
import {
  INDONESIAN_CLASSIFICATION_LABELS,
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_PACK_VERSION,
  INDONESIAN_QUESTION_RECORD_VERSION,
  INDONESIAN_SLOT_MATRIX,
  IndonesianApprovalBlockedError,
  IndonesianPackAlreadyApprovedError,
  applyIndonesianQuestionEdits,
  approveIndonesianQuestionPack,
  buildDeterministicIndonesianPack,
  buildIndonesianGenerationRequest,
  classifyIndonesianQuestion,
  deterministicIndonesianQuestion,
  generateIndonesianQuestionPack,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  parseNumberedIndonesianQuestions,
  replayIndonesianQuestionPack,
  repairIndonesianSuggestion,
  validateIndonesianQuestionPack,
  type IndonesianQuestionProvider,
  type MinimizedIndonesianBrief,
} from "./questions-id";

// ---------------------------------------------------------------------------
// Frozen fixture context: NVA-FIKTIF-001 (fictional Kopi Taman Senja),
// docs/drafts/00-journey-fixtures.md — the ten strings of
// NVA-FIKTIF-001.questions.v1 and the confirmed facts of facts.v1.
// ---------------------------------------------------------------------------

const kopiBrief: MinimizedIndonesianBrief = {
  brand_name: "Kopi Taman Senja",
  brand_name_variants: [],
  scope: "Dago, Bandung",
  category: "Kedai kopi",
  offerings: ["Kopi lokal", "Ruang kerja", "Makanan ringan"],
  customer_context:
    "Pekerja remote, mahasiswa, dan komunitas kecil di Bandung.",
  customer_needs: [
    "Tempat untuk bekerja atau bertemu dengan Wi-Fi, makanan, dan minuman.",
  ],
  decision_considerations: ["Lokasi, suasana, fasilitas, harga, dan jam buka."],
  differentiator:
    "Menggunakan kopi dari produsen lokal sekaligus menyediakan area untuk bekerja dan pertemuan kecil.",
  comparison_business: {
    name: "Kopi Ruang Pagi",
    scope: "Dago, Bandung",
    source_url: "https://kopiruangpagi.example",
  },
  known_accuracy_questions: [],
  conversion_action: "",
  official_source_urls: [
    "https://kopitamansenja.example",
    "https://maps.example/kopi-taman-senja",
    "https://instagram.example/kopitamansenja",
  ],
};

const frozenTen = [
  "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
  "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?",
  "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?",
  "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?",
  "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
  "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.",
  "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?",
  "Di mana alamat Kopi Taman Senja? Buka jam berapa?",
  "Cariin kontak Kopi Taman Senja.",
  "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?",
];

const frozenClassifications = [
  "tanpa_menyebut_bisnis_anda",
  "tanpa_menyebut_bisnis_anda",
  "tanpa_menyebut_bisnis_anda",
  "tanpa_menyebut_bisnis_anda",
  "tanpa_menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
  "menyebut_bisnis_anda",
] as const;

function stubProvider(
  output:
    | { kind: "structured"; questions: string[] }
    | { kind: "text"; text: string },
): IndonesianQuestionProvider {
  return { generate: async () => output };
}

const frozenGenerationMeta = {
  system: "Google Gemini API",
  requested_model: "gemini-3.5-flash-lite",
  returned_model: "gemini-3.5-flash-lite",
  pricing_version: "gemini-flash-lite-v1",
};

// ---------------------------------------------------------------------------
// R-37 — frozen fixture pack compliance
// ---------------------------------------------------------------------------

describe("frozen fixture pack compliance (R-37)", () => {
  it("passes the same mechanical safety rules as the live path", () => {
    expect(validateIndonesianQuestionPack(frozenTen, kopiBrief)).toEqual([]);
    expect(indonesianPackBlockers(frozenTen, kopiBrief)).toEqual([]);
  });

  it("classifies each frozen question exactly as the fixture record does", () => {
    frozenTen.forEach((question, index) => {
      expect(classifyIndonesianQuestion(question, kopiBrief)).toBe(
        frozenClassifications[index],
      );
    });
    expect(
      frozenTen.map((question) =>
        classifyIndonesianQuestion(question, kopiBrief),
      ),
    ).toEqual([
      ...Array(5).fill("tanpa_menyebut_bisnis_anda"),
      ...Array(5).fill("menyebut_bisnis_anda"),
    ]);
    expect(INDONESIAN_CLASSIFICATION_LABELS).toMatchObject({
      tanpa_menyebut_bisnis_anda: "Tanpa menyebut bisnis Anda",
      menyebut_bisnis_anda: "Menyebut bisnis Anda",
    });
  });

  it("keeps the frozen pack distinct, non-empty, and executable", () => {
    expect(new Set(frozenTen).size).toBe(10);
    frozenTen.forEach((question) => {
      expect(question.trim().length).toBeGreaterThan(0);
      expect(question.trim().length).toBeGreaterThanOrEqual(8);
    });
  });
});

// ---------------------------------------------------------------------------
// Stub-provider success (AC-23)
// ---------------------------------------------------------------------------

describe("generation boundary — stub provider success", () => {
  it("turns ten structured strings into a classified suggestion without a call", async () => {
    const provider = stubProvider({ kind: "structured", questions: frozenTen });
    const now = () => "2026-08-17T01:45:00.000Z";
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      provider,
      { generationMeta: frozenGenerationMeta, now },
    );

    expect(suggestion.pack_version).toBe(INDONESIAN_QUESTION_PACK_VERSION);
    expect(suggestion.language).toBe("id-ID");
    expect(suggestion.source).toBe("model");
    expect(suggestion.warnings).toEqual([]);
    expect(suggestion.generation).toMatchObject({
      system: "Google Gemini API",
      requested_model: "gemini-3.5-flash-lite",
      returned_model: "gemini-3.5-flash-lite",
      instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
      generated_at: "2026-08-17T01:45:00.000Z",
      fallback_used: false,
    });

    expect(suggestion.questions).toHaveLength(10);
    suggestion.questions.forEach((item, index) => {
      expect(item.order).toBe(index + 1);
      expect(item.text).toBe(frozenTen[index]);
      expect(item.original_suggestion).toBe(frozenTen[index]);
      expect(item.edited).toBe(false);
      expect(item.suggested_category).toBe(
        INDONESIAN_SLOT_MATRIX[index].suggested_category,
      );
    });
    expect(suggestion.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
    expect(
      validateIndonesianQuestionPack(
        suggestion.questions.map((item) => item.text),
        kopiBrief,
      ),
    ).toEqual([]);
  });

  it("builds the minimized generation request with no search", () => {
    const request = buildIndonesianGenerationRequest(kopiBrief);
    expect(request.web_search).toBe(false);
    expect(request.language).toBe("id-ID");
    expect(request.instruction_version).toBe(
      INDONESIAN_QUESTION_INSTRUCTION_VERSION,
    );
    expect(request.brief).toBe(kopiBrief);
    expect(JSON.stringify(request)).not.toMatch(/email|payment|password/i);
  });

  it("projects the existing English verified brief onto the minimized shape", () => {
    const brief: BusinessBrief = {
      brand_name: "Nuave Test",
      entity_scope: "Nuave Test Indonesia",
      brand_type: "B2B service",
      category: "AI visibility audit",
      market_context: "Indonesia",
      target_customer: "marketing agency",
      official_sources: ["https://example.com"],
      verified_offerings: ["one-time visibility audit", "evidence export"],
      verified_customer_needs: ["checking how AI answers describe a client"],
      verified_decision_criteria: ["reviewable evidence"],
      verified_competitor: {
        name: "Test Competitor",
        scope: "Indonesia",
        source_url: "https://competitor.example.com",
      },
      brand_name_variants: ["Nuave"],
      priority_offering: "one-time visibility audit",
      conversion_action: "request an audit",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      language: "en-US",
      agency_name: "",
      agency_logo_data_url: "",
    };
    const minimized = minimizeIndonesianBrief(brief);
    expect(minimized).toMatchObject({
      brand_name: "Nuave Test",
      scope: "Nuave Test Indonesia",
      category: "AI visibility audit",
      offerings: ["one-time visibility audit", "evidence export"],
      comparison_business: { name: "Test Competitor" },
    });
  });
});

// ---------------------------------------------------------------------------
// Numbered-list parsing (R-31)
// ---------------------------------------------------------------------------

describe("deterministic numbered-list parsing", () => {
  it("parses an exact 1..10 numbered list, joining wrapped lines", async () => {
    const text = [
      "1. Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
      "2. Tempat rapat kecil di Bandung yang ada makanan, minuman,",
      "dan bisa dipakai kerja di mana ya?",
      "3. Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?",
      "4. Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?",
      "5. Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
      "6. Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.",
      "7. Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?",
      "8. Di mana alamat Kopi Taman Senja? Buka jam berapa?",
      "9. Cariin kontak Kopi Taman Senja.",
      "10. Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?",
    ].join("\n");

    expect(parseNumberedIndonesianQuestions(text)).toEqual(frozenTen);

    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "text", text }),
      { generationMeta: frozenGenerationMeta },
    );
    expect(suggestion.source).toBe("parsed");
    expect(suggestion.generation.fallback_used).toBe(false);
    expect(suggestion.questions.map((item) => item.text)).toEqual(frozenTen);
    expect(suggestion.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
  });

  it("rejects a list that starts at the wrong number", () => {
    const text = frozenTen
      .map((question, index) => `${index + 2}. ${question}`)
      .join("\n");
    expect(parseNumberedIndonesianQuestions(text)).toBeNull();
  });

  it("rejects fewer than ten items, preamble, and empty items", () => {
    expect(
      parseNumberedIndonesianQuestions(
        frozenTen
          .slice(0, 9)
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n"),
      ),
    ).toBeNull();
    expect(
      parseNumberedIndonesianQuestions(
        `Berikut daftar pertanyaannya:\n${frozenTen
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}`,
      ),
    ).toBeNull();
    expect(
      parseNumberedIndonesianQuestions(
        frozenTen.map((q, i) => `${i + 1}. ${q}`).join("\n") + "\n11. ekstra",
      ),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fallback on provider/format failure (R-31, AC-23)
// ---------------------------------------------------------------------------

describe("deterministic Indonesian fallback", () => {
  it("falls back without hard-failing when the provider throws", async () => {
    const provider: IndonesianQuestionProvider = {
      generate: async () => {
        throw new Error("provider outage");
      },
    };
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      provider,
      { generationMeta: frozenGenerationMeta },
    );

    expect(suggestion.source).toBe("fallback");
    expect(suggestion.generation.fallback_used).toBe(true);
    expect(suggestion.warnings).toContain("fallback_used");
    expect(suggestion.questions).toHaveLength(10);
    expect(
      validateIndonesianQuestionPack(
        suggestion.questions.map((item) => item.text),
        kopiBrief,
      ),
    ).toEqual([]);
    expect(
      indonesianPackBlockers(
        suggestion.questions.map((item) => item.text),
        kopiBrief,
      ),
    ).toEqual([]);
  });

  it("falls back when structured output has the wrong count", async () => {
    const provider = stubProvider({
      kind: "structured",
      questions: frozenTen.slice(0, 9),
    });
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      provider,
    );
    expect(suggestion.source).toBe("fallback");
    expect(suggestion.generation.fallback_used).toBe(true);
    expect(suggestion.questions).toHaveLength(10);
  });

  it("falls back when the returned text is not a recoverable numbered list", async () => {
    const provider = stubProvider({
      kind: "text",
      text: "Rekomendasikan tempat ngopi di Dago.\nKedai kopi apa aja di Bandung?",
    });
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      provider,
    );
    expect(suggestion.source).toBe("fallback");
    expect(suggestion.questions).toHaveLength(10);
  });

  it("is deterministic and cannot hard-fail even when every brief value carries the brand", () => {
    const pathological: MinimizedIndonesianBrief = {
      ...kopiBrief,
      category: "Kopi Taman Senja visibility",
      scope: "Kopi Taman Senja Bandung",
      offerings: ["Kopi Taman Senja Pro"],
      customer_context: "Kopi Taman Senja customer",
      customer_needs: ["Kopi Taman Senja need"],
      decision_considerations: ["Kopi Taman Senja criteria"],
    };
    const pack = buildDeterministicIndonesianPack(pathological);

    expect(pack).toHaveLength(10);
    expect(new Set(pack).size).toBe(10);
    expect(validateIndonesianQuestionPack(pack, pathological)).toEqual([]);
    // The five default unbranded questions never reveal the brand.
    pack.slice(0, 5).forEach((question) => {
      expect(classifyIndonesianQuestion(question, pathological)).toBe(
        "tanpa_menyebut_bisnis_anda",
      );
    });
    expect(buildDeterministicIndonesianPack(pathological)).toEqual(pack);
    // Every slot still produces one deterministic question.
    INDONESIAN_SLOT_MATRIX.forEach((slot) => {
      expect(
        deterministicIndonesianQuestion(pathological, slot.order).trim(),
      ).not.toBe("");
    });
  });
});

// ---------------------------------------------------------------------------
// Identity leakage and unsupported premise (R-37)
// ---------------------------------------------------------------------------

describe("identity-leakage and unsupported-premise rules", () => {
  it("rejects a brand name in one of the five default unbranded slots", () => {
    const leaky = [...frozenTen];
    leaky[1] = "Saya cari Kopi Taman Senja di Dago, bagaimana menurut Anda?";
    const issues = validateIndonesianQuestionPack(leaky, kopiBrief);
    expect(issues).toEqual([
      expect.objectContaining({ slot: 2, rule: "identity_leakage" }),
    ]);
  });

  it("rejects a known brand variant in an unbranded slot", () => {
    const brief = { ...kopiBrief, brand_name_variants: ["Taman Senja"] };
    const leaky = [...frozenTen];
    leaky[4] = "Apakah Taman Senja buka sampai malam?";
    expect(validateIndonesianQuestionPack(leaky, brief)).toEqual([
      expect.objectContaining({ slot: 5, rule: "identity_leakage" }),
    ]);
  });

  it("allows the comparison business only in the designated comparison slot", () => {
    const leaky = [...frozenTen];
    leaky[6] = "Apa yang ditawarkan Kopi Ruang Pagi di Dago?";
    expect(validateIndonesianQuestionPack(leaky, kopiBrief)).toEqual([
      expect.objectContaining({ slot: 7, rule: "competitor_leakage" }),
    ]);
    expect(validateIndonesianQuestionPack(frozenTen, kopiBrief)).toEqual([]);
  });

  it("rejects unsupported-premise wording such as superlative claims", () => {
    const assuming = [...frozenTen];
    assuming[3] = "Kedai kopi terbaik di Bandung untuk WFC yang mana?";
    expect(validateIndonesianQuestionPack(assuming, kopiBrief)).toEqual([
      expect.objectContaining({ slot: 4, rule: "unsupported_premise" }),
    ]);
  });

  it("rejects duplicate questions as a distinctness failure", () => {
    const duplicated = [...frozenTen];
    duplicated[8] = duplicated[0];
    expect(validateIndonesianQuestionPack(duplicated, kopiBrief)).toEqual([
      expect.objectContaining({ slot: 9, rule: "distinctness" }),
    ]);
  });

  it("repairs a leaking slot with a safe slot fallback before display", async () => {
    const leaky = [...frozenTen];
    leaky[2] = "Kedai kopi mana yang sebaiknya saya pilih, Kopi Taman Senja?";
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: leaky }),
    );

    expect(suggestion.warnings).toContain("slot_safety_repair:3");
    expect(suggestion.source).toBe("model");
    suggestion.questions.forEach((item, index) => {
      if (index === 2) {
        expect(item.text).not.toMatch(/kopi taman senja/i);
        expect(item.original_suggestion).toBe(leaky[2]);
      } else {
        expect(item.text).toBe(frozenTen[index]);
      }
    });
    // The five default unbranded slots no longer reveal the brand.
    suggestion.questions.slice(0, 5).forEach((item) => {
      expect(classifyIndonesianQuestion(item.text, kopiBrief)).toBe(
        "tanpa_menyebut_bisnis_anda",
      );
    });
    expect(suggestion.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });
  });

  it("rejects the audited business's own domain in an unbranded slot (adversarial review Finding 3)", () => {
    // kopitamansenja.example is the business's own domain, listed in
    // official_source_urls. Naming it in an unbranded slot reveals identity
    // just as surely as naming the brand.
    const leaky = [...frozenTen];
    leaky[0] = "Apakah kopitamansenja.example cocok untuk kerja di Dago?";
    const issues = validateIndonesianQuestionPack(leaky, kopiBrief);
    expect(issues).toEqual([
      expect.objectContaining({ slot: 1, rule: "identity_leakage" }),
    ]);
    expect(classifyIndonesianQuestion(leaky[0], kopiBrief)).toBe(
      "menyebut_bisnis_anda",
    );
  });

  it("rejects an unspaced brand rendering in an unbranded slot (adversarial review Finding 3)", () => {
    const leaky = [...frozenTen];
    leaky[0] = "Apakah KopiTamanSenja bagus untuk kerja di Dago?";
    const issues = validateIndonesianQuestionPack(leaky, kopiBrief);
    expect(issues).toEqual([
      expect.objectContaining({ slot: 1, rule: "identity_leakage" }),
    ]);
    expect(classifyIndonesianQuestion(leaky[0], kopiBrief)).toBe(
      "menyebut_bisnis_anda",
    );
  });

  it("repairs an unsupported-premise slot without touching the rest", () => {
    const assuming = [...frozenTen];
    assuming[4] = "Bandingkan kedai kopi paling populer di Bandung.";
    const repaired = repairIndonesianSuggestion(assuming, kopiBrief);
    expect(repaired).not.toBeNull();
    expect(repaired?.warnings).toContain("slot_safety_repair:5");
    expect(repaired?.questions[4]).not.toMatch(/paling populer/i);
    expect(repaired?.originals[4]).toBe(assuming[4]);
    expect(repaired?.questions[0]).toBe(frozenTen[0]);
  });
});

// ---------------------------------------------------------------------------
// Dynamic classification (R-34)
// ---------------------------------------------------------------------------

describe("dynamic name/no-name classification", () => {
  it("derives classification from the final text, never from the slot", () => {
    expect(
      classifyIndonesianQuestion(
        "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
        kopiBrief,
      ),
    ).toBe("tanpa_menyebut_bisnis_anda");
    expect(
      classifyIndonesianQuestion(
        "Di mana alamat Kopi Taman Senja? Buka jam berapa?",
        kopiBrief,
      ),
    ).toBe("menyebut_bisnis_anda");
    // A branded slot that omits the name is classified by its text.
    expect(
      classifyIndonesianQuestion(
        "Apa saja fasilitas yang tersedia?",
        kopiBrief,
      ),
    ).toBe("tanpa_menyebut_bisnis_anda");
  });

  it("reclassifies customer edits and updates counts immediately", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
      { generationMeta: frozenGenerationMeta },
    );
    const edited = applyIndonesianQuestionEdits(
      suggestion,
      kopiBrief,
      [{ order: 1, new_text: "Bagaimana harga kopi di Kopi Taman Senja?" }],
      { now: () => "2026-08-17T02:00:00.000Z" },
    );

    expect(edited.questions[0]).toMatchObject({
      order: 1,
      text: "Bagaimana harga kopi di Kopi Taman Senja?",
      original_suggestion: frozenTen[0],
      edited: true,
      final_classification: "menyebut_bisnis_anda",
    });
    expect(edited.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 4,
      menyebut_bisnis_anda: 6,
    });
    expect(edited.generation).toEqual(suggestion.generation);
  });

  it("records every edit verbatim in the edit record", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    const edited = applyIndonesianQuestionEdits(
      suggestion,
      kopiBrief,
      [
        { order: 3, new_text: "Kedai kopi di Dago buka 24 jam ada nggak?" },
        { order: 9, new_text: "Cariin nomor telepon Kopi Taman Senja." },
      ],
      { now: () => "2026-08-17T02:00:00.000Z" },
    );
    expect(edited.questions[2].text).toBe(
      "Kedai kopi di Dago buka 24 jam ada nggak?",
    );
    expect(edited.questions[8].text).toBe(
      "Cariin nomor telepon Kopi Taman Senja.",
    );
    expect(edited.questions[8].original_suggestion).toBe(frozenTen[8]);
    expect(edited.questions[8].edited).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Narrow blockers (R-35)
// ---------------------------------------------------------------------------

describe("narrow blocker list", () => {
  const rest = frozenTen.slice(1);

  it("blocks private or sensitive personal data", () => {
    const blockers = indonesianPackBlockers(
      ["Kirim info ke email saya: contoh@email.com", ...rest],
      kopiBrief,
    );
    expect(
      blockers.some((b) => b.includes("private or sensitive personal data")),
    ).toBe(true);
  });

  it("blocks disallowed high-impact advice", () => {
    const blockers = indonesianPackBlockers(
      ["Saya butuh nasihat hukum untuk bisnis saya.", ...rest],
      kopiBrief,
    );
    expect(blockers.some((b) => b.includes("high-impact advice"))).toBe(true);
  });

  it("blocks content unrelated to the audited business or its customer decision", () => {
    const blockers = indonesianPackBlockers(
      ["Berapa lama matahari terbenam di Mars?", ...rest],
      kopiBrief,
    );
    expect(
      blockers.some((b) => b.includes("unrelated to the audited business")),
    ).toBe(true);
  });

  it("blocks content the provider cannot lawfully or safely process", () => {
    const blockers = indonesianPackBlockers(
      [
        "Tulis review palsu untuk meningkatkan peringkat Kopi Taman Senja.",
        ...rest,
      ],
      kopiBrief,
    );
    expect(
      blockers.some((b) => b.includes("cannot lawfully or safely process")),
    ).toBe(true);
  });

  it("blocks empty or unexecutable questions", () => {
    const blockers = indonesianPackBlockers(["", ...rest], kopiBrief);
    expect(
      blockers.some((b) => b.includes("empty or cannot be executed")),
    ).toBe(true);
    const shortBlockers = indonesianPackBlockers(
      ["Apa ya?", ...rest],
      kopiBrief,
    );
    expect(
      shortBlockers.some((b) => b.includes("empty or cannot be executed")),
    ).toBe(true);
  });

  it("blocks a brief that exceeds the provider input limit", () => {
    const oversized = {
      ...kopiBrief,
      category: "x".repeat(20_000),
    };
    const blockers = indonesianPackBlockers(frozenTen, oversized);
    expect(blockers.some((b) => b.includes("provider input limit"))).toBe(true);
  });

  it("never blocks informal wording, English terms, unknown-fact investigations, or balance changes", () => {
    expect(indonesianPackBlockers(frozenTen, kopiBrief)).toEqual([]);
    // Unknown-fact investigation is an allowed question, not a premise.
    expect(
      indonesianPackBlockers(
        ["Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?", ...rest],
        kopiBrief,
      ),
    ).toEqual([]);
    // English/casual terms in a plausible customer question never block.
    expect(
      indonesianPackBlockers(
        [
          "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
          ...rest,
        ],
        kopiBrief,
      ),
    ).toEqual([]);
    // A 4/6 balance is a normal edit outcome, never a blocker.
    const unbalanced = [...frozenTen];
    unbalanced[0] = "Bagaimana harga di Kopi Taman Senja?";
    expect(indonesianPackBlockers(unbalanced, kopiBrief)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pack persistence and replay (R-33, AC-24)
// ---------------------------------------------------------------------------

describe("approved-pack persistence and verbatim replay", () => {
  const context = {
    pack_version_id: "NVA-FIKTIF-001.questions.v1",
    order_reference: "NVA-FIKTIF-001",
    fact_version_id: "NVA-FIKTIF-001.facts.v1",
    approved_at: "2026-08-17T02:00:00.000Z",
  };

  it("persists the exact approved pack and replays it verbatim", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
      { generationMeta: frozenGenerationMeta },
    );
    const record = approveIndonesianQuestionPack(
      suggestion,
      kopiBrief,
      context,
    );

    expect(record).toMatchObject({
      pack_record_version: INDONESIAN_QUESTION_RECORD_VERSION,
      pack_version_id: "NVA-FIKTIF-001.questions.v1",
      order_reference: "NVA-FIKTIF-001",
      fact_version_id: "NVA-FIKTIF-001.facts.v1",
      status: "questions_approved",
      language: "id-ID",
      warnings_acknowledged: [],
      approval: { approved: true, approved_at: "2026-08-17T02:00:00.000Z" },
      lock: { locked: false, consumed: false, started_at: null },
    });
    expect(record.generation).toMatchObject({
      system: "Google Gemini API",
      requested_model: "gemini-3.5-flash-lite",
      returned_model: "gemini-3.5-flash-lite",
      instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
      fallback_used: false,
    });
    expect(record.questions.map((item) => item.text)).toEqual(frozenTen);
    expect(record.questions.map((item) => item.final_classification)).toEqual(
      frozenClassifications,
    );
    expect(record.edit_record).toEqual([]);
    expect(record.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
    });

    const replayed = replayIndonesianQuestionPack(
      "NVA-FIKTIF-001",
      "NVA-FIKTIF-001.questions.v1",
    );
    expect(replayed).toEqual(record);
    expect(replayed?.questions).toHaveLength(10);
  });

  it("persists edits, final classification, and fallback warnings in the record", async () => {
    const failing = stubProvider({
      kind: "text",
      text: "bukan daftar bernomor",
    });
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      failing,
      { generationMeta: frozenGenerationMeta },
    );
    expect(suggestion.source).toBe("fallback");

    const edited = applyIndonesianQuestionEdits(
      suggestion,
      kopiBrief,
      [{ order: 1, new_text: "Bagaimana harga di Kopi Taman Senja?" }],
      { now: () => "2026-08-17T02:00:00.000Z" },
    );
    const record = approveIndonesianQuestionPack(edited, kopiBrief, {
      ...context,
      pack_version_id: "NVA-FIKTIF-001.questions.v1.edited",
    });

    expect(record.generation.fallback_used).toBe(true);
    expect(record.warnings_acknowledged).toContain("fallback_used");
    expect(record.edit_record).toEqual([
      {
        order: 1,
        from: suggestion.questions[0].text,
        to: "Bagaimana harga di Kopi Taman Senja?",
        edited_at: "2026-08-17T02:00:00.000Z",
      },
    ]);
    expect(record.questions[0]).toMatchObject({
      edited: true,
      final_classification: "menyebut_bisnis_anda",
      original_suggestion: suggestion.questions[0].text,
    });
    expect(record.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 4,
      menyebut_bisnis_anda: 6,
    });

    expect(
      replayIndonesianQuestionPack(
        "NVA-FIKTIF-001",
        "NVA-FIKTIF-001.questions.v1.edited",
      ),
    ).toEqual(record);
    expect(
      replayIndonesianQuestionPack("NVA-FIKTIF-001", "unknown-pack"),
    ).toBeNull();
  });

  it("never lets a mutated replay corrupt the store or a later replay (adversarial review Finding 4)", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    approveIndonesianQuestionPack(suggestion, kopiBrief, {
      ...context,
      pack_version_id: "NVA-FIKTIF-001.questions.v1.attack4",
    });

    const r1 = replayIndonesianQuestionPack(
      "NVA-FIKTIF-001",
      "NVA-FIKTIF-001.questions.v1.attack4",
    );
    expect(r1).not.toBeNull();
    // Mutate every nested part of the replayed record.
    r1!.lock.consumed = true;
    r1!.approval.approved = false;
    r1!.edit_record.push({
      order: 1,
      from: "x",
      to: "y",
      edited_at: "z",
    });
    r1!.classification_summary.total = 0;
    r1!.warnings_acknowledged.push("tampered");
    r1!.generation.fallback_used = true;

    const r2 = replayIndonesianQuestionPack(
      "NVA-FIKTIF-001",
      "NVA-FIKTIF-001.questions.v1.attack4",
    );
    expect(r2?.lock.consumed).toBe(false);
    expect(r2?.approval.approved).toBe(true);
    expect(r2?.edit_record).toEqual([]);
    expect(r2?.classification_summary.total).toBe(10);
    expect(r2?.warnings_acknowledged).not.toContain("tampered");
    expect(r2?.generation.fallback_used).toBe(false);
  });

  it("rejects re-approval under the same order and pack version instead of overwriting silently", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    const dupeContext = {
      ...context,
      pack_version_id: "NVA-FIKTIF-001.questions.v1.dupe",
    };
    approveIndonesianQuestionPack(suggestion, kopiBrief, dupeContext);
    expect(() =>
      approveIndonesianQuestionPack(suggestion, kopiBrief, dupeContext),
    ).toThrow(IndonesianPackAlreadyApprovedError);
  });

  it("keys persistence on order and pack version together, so two orders never collide", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    const sharedPackVersionId = "NVA-FIKTIF-001.questions.v1.shared";
    approveIndonesianQuestionPack(suggestion, kopiBrief, {
      ...context,
      order_reference: "NVA-FIKTIF-001",
      pack_version_id: sharedPackVersionId,
    });
    const other = approveIndonesianQuestionPack(suggestion, kopiBrief, {
      ...context,
      order_reference: "NVA-FIKTIF-002",
      pack_version_id: sharedPackVersionId,
    });
    expect(other.order_reference).toBe("NVA-FIKTIF-002");

    const first = replayIndonesianQuestionPack(
      "NVA-FIKTIF-001",
      sharedPackVersionId,
    );
    const second = replayIndonesianQuestionPack(
      "NVA-FIKTIF-002",
      sharedPackVersionId,
    );
    expect(first?.order_reference).toBe("NVA-FIKTIF-001");
    expect(second?.order_reference).toBe("NVA-FIKTIF-002");
  });

  it("fails closed on approval when a narrow blocker is present", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    const blocked = applyIndonesianQuestionEdits(suggestion, kopiBrief, [
      { order: 1, new_text: "Kirim info ke email saya: contoh@email.com" },
    ]);
    expect(() =>
      approveIndonesianQuestionPack(blocked, kopiBrief, context),
    ).toThrow(IndonesianApprovalBlockedError);
  });

  it("approves an edited 4/6 pack (balance changes never block)", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      kopiBrief,
      stubProvider({ kind: "structured", questions: frozenTen }),
    );
    const edited = applyIndonesianQuestionEdits(suggestion, kopiBrief, [
      { order: 1, new_text: "Bagaimana harga di Kopi Taman Senja?" },
    ]);
    const record = approveIndonesianQuestionPack(edited, kopiBrief, {
      ...context,
      pack_version_id: "NVA-FIKTIF-001.questions.v1.rebalanced",
    });
    expect(record.classification_summary.menyebut_bisnis_anda).toBe(6);
    expect(record.status).toBe("questions_approved");
  });
});

// ---------------------------------------------------------------------------
// Guard: the live English path is untouched by the new module
// ---------------------------------------------------------------------------

describe("additive isolation", () => {
  it("uses the canonical matrix instead of a second question generator", async () => {
    const contracts = await import("./contracts");
    const indonesian = await import("./questions-id");
    expect(indonesian.INDONESIAN_SLOT_MATRIX.map((slot) => slot.order)).toEqual(
      contracts.AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.order),
    );
    expect(contracts.PROMPT_MATRIX).toEqual(
      contracts.AUDIT_MEASUREMENT_MATRIX.map((slot) => [
        slot.id,
        slot.legacyCategory,
        slot.legacyBranded,
        slot.legacyRole,
      ]),
    );
    expect(contracts.PROMPT_CONTRACT_VERSION).toBe("deterministic-v4-en");
  });
});
