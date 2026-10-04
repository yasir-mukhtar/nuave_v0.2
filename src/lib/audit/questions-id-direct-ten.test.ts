/** Focused offline tests for the Spec 009 direct-ten boundary: brief
 * assembly, the adapted request, strict three-section extraction and the
 * flat unnamed-text rules. No provider, no fetch, no credentials. */
import { createHash } from "node:crypto";
import { assessCheaperInferenceIndonesianResponse } from "./questions-id-glm";
import { describe, expect, it } from "vitest";
import {
  parseQuestionFactsV3,
  type QuestionFactsV3,
} from "./question-facts-v3";
import {
  buildDirectTenQuestionRequest,
  buildDirectTenWriterBrief,
  extractDirectTenQuestions,
  INDONESIAN_QUESTION_DIRECT_TEN_INSTRUCTION_VERSION,
  validateDirectTenQuestionPack,
} from "./questions-id-direct-ten";
import {
  DIRECT_TEN_AMENDMENTS,
  DIRECT_TEN_SOURCE_BODY,
  glmDirectTenWriterInstruction,
} from "./questions-id-direct-ten-instruction";

function laundryFacts(): QuestionFactsV3 {
  const result = parseQuestionFactsV3({
    requestId: "direct-ten-test",
    intake: {
      version: "nuave-local-intake-input-v1",
      factVersion: 1,
      confirmed: {
        brand: {
          name: "Laundry Ceria",
          primarySource: "https://laundryceria.example",
        },
        scope: "brand",
        target: null,
        category: "laundry kiloan",
        offerings: ["cuci kiloan", "cuci satuan", "setrika"],
        customerReasons: ["cucian cepat selesai", "harga masuk akal"],
        serviceChannels: [{ channel: "delivery" }],
        market: { reach: "beberapa", areas: ["Jakarta Selatan"] },
        comparators: { mode: "named", names: ["QuickWash Tebet"] },
        publicFact: "Buka setiap hari pukul 07.00–21.00.",
      },
    },
  });
  if (result.status !== "projected")
    throw new Error(`facts did not project: ${result.status}`);
  return result.facts;
}

const CLEAN_TEN = [
  "Ada rekomendasi laundry kiloan di Jakarta Selatan yang bagus tapi harganya masuk akal?",
  "Cariin laundry di Jakarta Selatan yang pengerjaannya rapi dan nggak ribet.",
  "Laundry kiloan yang enak dipakai buat cucian rutin keluarga apa ya?",
  "Kalau mau laundry yang bisa antar-jemput di Jakarta Selatan, mending pilih yang mana?",
  "Butuh laundry yang bisa dipercaya di Jakarta Selatan. Biasanya orang pakai apa sih?",
  "Tempat laundry paling lengkap di Jakarta Selatan biasanya di mana?",
  "Ada laundry kiloan di Jakarta Selatan yang recommended buat pemula?",
  "Buat kebutuhan mendadak, laundry di Jakarta Selatan yang cepat ada nggak?",
  "Yang biasa orang pakai untuk laundry kiloan di Jakarta Selatan apa ya?",
  "Laundry di Jakarta Selatan dengan pelayanan responsif ada rekomendasi?",
];

function sectioned(questions: string[], labels = false) {
  const items = questions
    .map(
      (question, index) =>
        `${index + 1}. ${question}` +
        (labels ? `\nIntent pattern: pola-${index + 1}` : ""),
    )
    .join("\n");
  return [
    "## 1. Market interpretation",
    "",
    "Interpretasi pasar.",
    "",
    "## 2. Candidate questions",
    "",
    items,
    "",
    "## 3. Self-critique",
    "",
    "Kritik diri.",
  ].join("\n");
}

describe("source body and adaptation diff", () => {
  it("appends only the exact approved concise-v1 refinement (R-30)", () => {
    const addendum = `Runtime output-format refinement — concise-v1:
Keep the three section headings exactly as specified, in the same order. Do not add a preamble, closing paragraph, extra section, table or code fence.
In ## 1. Market interpretation, use exactly the four existing labelled bullets: Category; Likely customer decision situations; Common decision dimensions; Target-brand facts that should not be copied too literally. Limit each bullet's content to 20 words, excluding its label. Use concise phrases. State unknowns honestly; do not invent facts or repeat the whole brief.
In ## 2. Candidate questions, write exactly ten complete Indonesian questions or direct requests on numbered lines 1–10. After each question, provide one Intent pattern: label of 1–4 words. Do not add rationales, scores or explanations. Keep questions natural and concise without changing their meaning or omitting relevant context. Do not force a template, intent mix or distinct-needs quota.
In ## 3. Self-critique, use exactly three bullets: Strongest; Borderline; Assumptions. Limit each bullet's content to 30 words, excluding its label. Strongest must identify the three strongest question numbers and give a short reason. Borderline must identify any borderline question numbers and a short reason, or explicitly say none. Assumptions must state assumptions caused by missing information, or explicitly say none. Refer to question numbers; do not repeat the question texts. Remain critical rather than defending the output.
These limits constrain presentation, not the underlying consumer-choice reasoning. Preserve the research principles, source examples, openness, no-quota amendment and all-unnamed rule.`;
    const sectionSource =
      "## 2. Candidate questions\n\nFor each question, provide:\n\n**1. [question]**  \nIntent pattern: [short label]\n\nDo this for all 12.";
    const sectionAdapted = `## 2. Candidate questions

Write exactly ten questions, each on its own numbered line:

1. [question]
Intent pattern: [short label]
2. [question]
Intent pattern: [short label]

…through:

10. [question]
Intent pattern: [short label]

Each numbered line is one Indonesian consumer question or direct request. An "Intent pattern:" label may appear on the line after its question. No other text may appear in this section. Only the ten numbered lines in this section become the product's questions.`;
    const legacy =
      DIRECT_TEN_SOURCE_BODY.replace(
        "Then generate **12 candidate consumer questions**.",
        "Then generate **10 consumer questions**.",
      ).replace(sectionSource, sectionAdapted) +
      `\n\n---\n\n${DIRECT_TEN_AMENDMENTS}`;
    expect(glmDirectTenWriterInstruction()).toBe(`${legacy}\n\n${addendum}`);
    expect(INDONESIAN_QUESTION_DIRECT_TEN_INSTRUCTION_VERSION).toBe(
      "glm-direct-ten-2026-09-18-concise-v1",
    );
  });
  it("keeps the recovered source body byte-identical (confirmed SHA-256)", () => {
    expect(
      createHash("sha256").update(DIRECT_TEN_SOURCE_BODY, "utf8").digest("hex"),
    ).toBe("652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a");
  });

  it("applies only the documented substitutions and appends the amendments", () => {
    const instruction = glmDirectTenWriterInstruction();
    expect(instruction).toContain("Then generate **10 consumer questions**.");
    expect(instruction).not.toContain(
      "Then generate **12 candidate consumer questions**.",
    );
    expect(instruction).toContain("Write exactly ten questions");
    expect(instruction).toContain(DIRECT_TEN_AMENDMENTS);
    expect(instruction).toContain("no minimum number of distinct needs");
    // The numbered-line contract matches what the extractor accepts.
    expect(instruction).toContain("Only the ten numbered lines");
    expect(instruction).toContain("[PASTE SAMPLE BRAND INFORMATION HERE]");
  });
});

describe("buildDirectTenWriterBrief", () => {
  it("carries confirmed facts, tags buyer preference, and names the do-not-name identities", () => {
    const brief = buildDirectTenWriterBrief(laundryFacts());
    expect(brief).toContain("Nama: Laundry Ceria");
    expect(brief).toContain("Kategori: laundry kiloan");
    expect(brief).toContain("Jakarta Selatan");
    expect(brief).toContain("pengiriman ke pelanggan");
    expect(brief).toContain("Kebutuhan pelanggan:");
    expect(brief).toContain("QuickWash Tebet");
    expect(brief).toContain("Tidak diketahui:");
    expect(brief).toContain("Jangan mengarang fakta");
    // Guard-only signals never reach the writer.
    expect(brief).not.toContain("http");
  });
});

describe("buildDirectTenQuestionRequest", () => {
  it("builds the exact pinned request with the brief substituted once", () => {
    const brief = buildDirectTenWriterBrief(laundryFacts());
    const request = buildDirectTenQuestionRequest(brief);
    expect(request).toMatchObject({
      model: "glm-5.3-flash",
      stream: false,
      max_tokens: 4096,
      reasoning_effort: "low",
    });
    expect(request.messages).toHaveLength(1);
    const content = request.messages[0].content;
    expect(content).toContain("Nama: Laundry Ceria");
    expect(content).not.toContain("[PASTE SAMPLE BRAND INFORMATION HERE]");
    // One substitution — the placeholder appears nowhere else.
    expect(content.split("Nama: Laundry Ceria")).toHaveLength(2);
  });
});

describe("extractDirectTenQuestions", () => {
  it("accepts identical complete content only on stop and rejects partial/empty length (R-30)", () => {
    const complete = sectioned(CLEAN_TEN, true);
    const body = (finish_reason: string, content: string) => ({
      id: "mock-complete",
      model: "glm-5.3-flash",
      choices: [{ finish_reason, message: { content } }],
    });
    expect(
      assessCheaperInferenceIndonesianResponse({
        httpStatus: 200,
        body: body("stop", complete),
      }),
    ).toMatchObject({ ok: true, assistantText: complete });
    expect(extractDirectTenQuestions(complete)).toMatchObject({
      ok: true,
      questions: CLEAN_TEN,
    });
    for (const text of [complete, "partial", ""]) {
      const result = assessCheaperInferenceIndonesianResponse({
        httpStatus: 200,
        body: body("length", text),
      });
      expect(result).toMatchObject({
        ok: false,
        reason: "incomplete",
        diagnostics: { finishReason: "length" },
      });
      expect(result).not.toHaveProperty("assistantText");
    }
  });
  it.each(["sparse", "rich"])(
    "preserves authored concise %s fixtures without adding rejection caps (R-30)",
    (kind) => {
      const rich = kind === "rich";
      const sparse = parseQuestionFactsV3({
        requestId: "concise-fixture",
        intake: {
          version: "nuave-local-intake-input-v1",
          factVersion: 1,
          confirmed: {
            brand: {
              name: "Laundry Ceria",
              primarySource: "https://laundryceria.example",
            },
            scope: "brand",
            target: null,
            category: "laundry kiloan",
            offerings: ["cuci kiloan"],
            customerReasons: [],
            serviceChannels: [{ channel: "delivery" }],
            market: { reach: "seluruh", areas: [] },
            comparators: { mode: "category-alternatives", names: [] },
            publicFact: "",
          },
        },
      });
      expect(sparse.status).toBe("projected");
      if (sparse.status !== "projected")
        throw new Error("fixture did not project");
      const facts = rich ? laundryFacts() : sparse.facts;
      const brief = buildDirectTenWriterBrief(facts);
      expect(
        buildDirectTenQuestionRequest(brief).messages[0].content,
      ).toContain(brief);
      const questions = rich
        ? CLEAN_TEN
        : CLEAN_TEN.map((q) =>
            q
              .replaceAll(" di Jakarta Selatan", "")
              .replaceAll("di Jakarta Selatan ", ""),
          );
      const interpretation = [
        "- Category: Laundry kiloan.",
        `- Likely customer decision situations: ${rich ? "Cucian rutin dan mendadak." : "Situasi khusus belum diketahui."}`,
        "- Common decision dimensions: Kesesuaian kebutuhan dan kemudahan layanan.",
        "- Target-brand facts that should not be copied too literally: Nama bisnis dan pembanding tidak dipakai.",
      ].join("\n");
      const critique = [
        "- Strongest: 1, 2, 4 membuka pilihan sesuai kebutuhan.",
        "- Borderline: None.",
        `- Assumptions: ${rich ? "Preferensi tambahan belum diketahui." : "Kebutuhan khusus belum diketahui."}`,
      ].join("\n");
      // Authored offline fixtures, not measured provider adherence or efficacy.
      const text = sectioned(questions, true)
        .replace("Interpretasi pasar.", interpretation)
        .replace("Kritik diri.", critique);
      const result = extractDirectTenQuestions(text);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.detail);
      expect(result.questions).toEqual(questions);
      expect(result.intentLabels).toEqual(
        questions.map((_, i) => `pola-${i + 1}`),
      );
      expect(result.marketInterpretation).toBe(interpretation);
      expect(result.selfCritique).toBe(critique);
      expect(validateDirectTenQuestionPack(result.questions, facts)).toEqual(
        [],
      );
      // Ancillary envelope limits are guidance, not new parser rejection caps.
      expect(
        extractDirectTenQuestions(
          text.replace(
            interpretation,
            interpretation + "\n" + "kata ".repeat(100),
          ),
        ).ok,
      ).toBe(true);
    },
  );
  it("extracts exactly ten texts and preserves the inspection sections", () => {
    const result = extractDirectTenQuestions(sectioned(CLEAN_TEN, true));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questions).toEqual(CLEAN_TEN);
    expect(result.intentLabels).toEqual(
      CLEAN_TEN.map((_, index) => `pola-${index + 1}`),
    );
    expect(result.marketInterpretation).toBe("Interpretasi pasar.");
    expect(result.selfCritique).toBe("Kritik diri.");
  });

  it("accepts texts with no question mark, several marks, or a leading context sentence", () => {
    const varied = [...CLEAN_TEN];
    varied[0] = "Cariin laundry kiloan yang antar-jemput di Jakarta Selatan.";
    varied[1] =
      "Lagi cari laundry buat rutinitas. Yang rapi dan cepat di Jakarta Selatan apa ya? Ada rekomendasi?";
    const result = extractDirectTenQuestions(sectioned(varied));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questions[0]).toBe(varied[0]);
    expect(result.questions[1]).toBe(varied[1]);
  });

  it("rejects a missing, duplicated, or out-of-order section marker honestly", () => {
    const missing = extractDirectTenQuestions(
      sectioned(CLEAN_TEN).replace("## 2. Candidate questions\n\n", ""),
    );
    expect(missing).toMatchObject({ ok: false, reason: "missing_marker" });

    const doubled = extractDirectTenQuestions(
      sectioned(CLEAN_TEN) + "\n## 3. Self-critique",
    );
    expect(doubled).toMatchObject({ ok: false, reason: "duplicate_marker" });

    const swapped = extractDirectTenQuestions(
      sectioned(CLEAN_TEN)
        .replace("## 1. Market interpretation", "## 2. Candidate questions")
        .replace("## 2. Candidate questions\n\nInterpretasi", "## 1. X\n\nY"),
    );
    expect(swapped.ok).toBe(false);
  });

  it("rejects preamble text and unexpected lines inside the questions span", () => {
    const preamble = extractDirectTenQuestions(
      `Tentu, berikut jawabannya.\n${sectioned(CLEAN_TEN)}`,
    );
    expect(preamble).toMatchObject({
      ok: false,
      reason: "unexpected_preamble",
    });

    const stray = extractDirectTenQuestions(
      sectioned(CLEAN_TEN).replace("10. ", "Catatan: sepuluh teks.\n10. "),
    );
    expect(stray).toMatchObject({ ok: false, reason: "unexpected_line" });
  });

  it("rejects wrong counts and non-canonical numbering — never trims into ten", () => {
    const nine = extractDirectTenQuestions(sectioned(CLEAN_TEN.slice(0, 9)));
    expect(nine).toMatchObject({ ok: false, reason: "bad_numbering" });

    const misnumbered = extractDirectTenQuestions(
      [
        "## 1. Market interpretation",
        "",
        "x.",
        "",
        "## 2. Candidate questions",
        "",
        ...CLEAN_TEN.map(
          (question, index) => `${index === 9 ? 9 : index + 1}. ${question}`,
        ),
        "",
        "## 3. Self-critique",
        "",
        "y.",
      ].join("\n"),
    );
    expect(misnumbered).toMatchObject({ ok: false, reason: "bad_numbering" });
  });
});

describe("validateDirectTenQuestionPack", () => {
  const facts = laundryFacts();
  const rulesOf = (questions: string[]) =>
    validateDirectTenQuestionPack(questions, facts).map((issue) => issue.rule);

  it("passes ten unnamed texts — including multi-sentence and mark-free wording", () => {
    const varied = [...CLEAN_TEN];
    varied[4] =
      "Butuh laundry yang bisa dipercaya di Jakarta Selatan. Biasanya orang pakai apa sih?";
    varied[5] = "Tempat laundry paling lengkap di Jakarta Selatan.";
    expect(validateDirectTenQuestionPack(varied, facts)).toEqual([]);
  });

  it("permits repeated underlying needs — no distinct-needs quota", () => {
    const repeated = CLEAN_TEN.map(
      () => "Ada rekomendasi laundry kiloan yang cepat di Jakarta Selatan?",
    ).map((question, index) => `${question} (${index + 1})`);
    // Distinct wording about one shared need stays valid — only exact
    // duplicates flag review.
    expect(rulesOf(repeated)).not.toContain("distinctness");
  });

  it("flags exact duplicate texts without fabricating a replacement", () => {
    const duplicated = [...CLEAN_TEN];
    duplicated[9] = duplicated[0]!;
    expect(rulesOf(duplicated)).toContain("distinctness");
  });

  it("rejects the audited brand, an alias-target, and a comparator in any position", () => {
    const named = [...CLEAN_TEN];
    named[2] = "Apakah Laundry Ceria cocok untuk cucian keluarga?";
    named[6] =
      "Laundry kiloan di Jakarta Selatan yang lebih murah dari QuickWash Tebet ada?";
    const rules = rulesOf(named);
    expect(rules).toContain("identity_leakage");
    expect(rules).toContain("competitor_leakage");
  });

  it("rejects asserted guarantees and retained safety categories", () => {
    const risky = [...CLEAN_TEN];
    risky[0] = "Laundry kiloan yang dijamin selesai dalam satu jam ada?";
    risky[1] = "Laundry mana yang bisa simpan nomor KTP pelanggan saya?";
    const rules = rulesOf(risky);
    expect(rules).toContain("unsupported_premise");
    expect(rules).toContain("private_data");
  });

  it("fails the pack outright on a wrong count", () => {
    const issues = validateDirectTenQuestionPack(CLEAN_TEN.slice(0, 9), facts);
    expect(issues).toEqual([
      expect.objectContaining({ rule: "count", slot: null }),
    ]);
  });
});
