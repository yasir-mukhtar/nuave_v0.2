/**
 * Focused offline tests for the dormant GLM prototype (revision-3 draft
 * §§1/4a/8/9). Every response body here is a SYNTHETIC TEST FIXTURE — none
 * of it is a provider result or quality evidence. No network, no fetch, no
 * credentials; the module under test performs no I/O.
 */
import { describe, expect, it } from "vitest";
import specimen from "./fixtures/glm-request-specimen.json";
import {
  parseQuestionFactsV3,
  type QuestionFactsV3,
} from "./question-facts-v3";
import { buildV3WriterContext } from "./question-context-v3";
import {
  assessCheaperInferenceIndonesianResponse,
  buildCheaperInferenceIndonesianQuestionRequest,
  extractIndonesianSlotQuestions,
  glmQuestionWriterInstructionV3,
  INDONESIAN_QUESTION_GLM_MODEL,
  validateIndonesianQuestionPackV3,
} from "./questions-id-glm";
import {
  categoryComparisonFallbackName,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
} from "./questions-id";
import type { BusinessBrief } from "./types";

// ---------------------------------------------------------------------------
// Real adapter output on the recorded fictional input
// ---------------------------------------------------------------------------

const fixtureBrief = specimen.fixtureFacts.input as unknown as BusinessBrief;

function projectedFixtureFacts(): QuestionFactsV3 {
  const result = parseQuestionFactsV3({
    requestId: "specimen-glm-2026-09-17",
    factsRevision: 1,
    brief: fixtureBrief,
  });
  if (result.status !== "projected") {
    throw new Error(`fixture facts did not project: ${result.status}`);
  }
  return result.facts;
}

const facts = projectedFixtureFacts();
const realWriterContext = buildV3WriterContext(facts);

const CONTENT = specimen.request.messages[0].content;
const CONTEXT_HEADING = "# Confirmed business context\n\n";
const AMENDMENT_HEADING = "\n\nFounder amendment";
const embeddedContext = JSON.parse(
  CONTENT.slice(
    CONTENT.indexOf(CONTEXT_HEADING) + CONTEXT_HEADING.length,
    CONTENT.indexOf(AMENDMENT_HEADING),
  ),
) as Record<string, unknown>;
const embeddedInstruction = CONTENT.slice(0, CONTENT.indexOf(CONTEXT_HEADING));

/** The review-only wrapper labels belong to the fixture caller, never to
 * the builder — so the test re-adds exactly what the specimen recorded. */
const wrappedWriterContext = {
  fixtureOnly: embeddedContext.fixtureOnly,
  notice: embeddedContext.notice,
  ...realWriterContext,
};

const BRAND = "Laundry Ceria";
const ALIAS = "Ceria Laundry";
const COMPARATOR = "CuciKilat Plus";
const SIMILAR = "BersihKilo Express";
const SOURCE_SIGNAL = "laundryceria.example.id";

// A synthetic ten-question pack that should pass every mechanical check.
const VALID_PACK = [
  "Kalau lagi cari jasa laundry kiloan di Jakarta Selatan, biasanya pilihan apa saja yang tersedia?",
  "Buat pekerja kantoran yang pulang malam dan nggak sempat nyuci, jasa laundry kiloan mana di Jakarta Selatan yang bisa bantu?",
  "Aku butuh pakaian bersih dan wangi tanpa repot. Jasa laundry kiloan apa yang cocok buat kebutuhan itu?",
  "Di mana bisa cari layanan antar-jemput laundry kiloan di Jakarta Selatan?",
  "Kalau mau bikin shortlist jasa laundry kiloan di Jakarta Selatan, nama-nama apa saja yang layak masuk?",
  "Bandingkan beberapa jasa laundry kiloan di Jakarta Selatan dari segi harga per kilo dan kecepatan selesai.",
  "Laundry Ceria cocok nggak buat pekerja kantoran yang butuh cucian selesai cepat?",
  "Kamu rekomendasiin Laundry Ceria nggak buat keluarga muda di Jakarta Selatan yang nggak sempat nyuci?",
  "Laundry Ceria atau CuciKilat Plus, mana yang lebih cocok buat antar-jemput laundry kiloan?",
  "Laundry Ceria lebih cocok buat siapa, dan buat kebutuhan apa mungkin kurang pas?",
];

const FOUNDER_LAPTOP =
  "Laptop saya mulai lemot. Kayaknya butuh beli baru. Cariin dong toko laptop di Bandung/Cimahi yang bagus.";
const FOUNDER_INVOICE_Q3 =
  "Bikin invoice tiap bulan capek kalau manual. Biasanya UMKM pakai aplikasi apa sih?";

const withSlot = (slot: number, question: string) =>
  VALID_PACK.map((q, i) => (i === slot - 1 ? question : q));

// ---------------------------------------------------------------------------
// Request builder — exact specimen reproduction
// ---------------------------------------------------------------------------

describe("buildCheaperInferenceIndonesianQuestionRequest", () => {
  it("reproduces REQUEST_SPECIMEN.json.request byte-for-byte", () => {
    const request =
      buildCheaperInferenceIndonesianQuestionRequest(wrappedWriterContext);
    expect(request.messages[0].content).toBe(CONTENT);
    expect(request).toEqual(specimen.request);
  });

  it("uses the reviewed model and settings, one user message, no credentials", () => {
    const request =
      buildCheaperInferenceIndonesianQuestionRequest(wrappedWriterContext);
    expect(request.model).toBe(INDONESIAN_QUESTION_GLM_MODEL);
    expect(request.model).toBe("glm-5.3-flash");
    expect(request.stream).toBe(false);
    expect(request.max_tokens).toBe(4096);
    expect(request.reasoning_effort).toBe("low");
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe("user");
    const serialized = JSON.stringify(request);
    expect(serialized).not.toMatch(
      /temperature|top_p|response_format|api[_-]?key|authorization|bearer/i,
    );
  });

  it("assembles the instruction exactly as the reviewed specimen", () => {
    expect(glmQuestionWriterInstructionV3()).toBe(embeddedInstruction);
  });

  it("embeds real adapter output — the projection is not hand-authored", () => {
    expect(realWriterContext).toEqual({
      projectionVersion: embeddedContext.projectionVersion,
      contextVersion: embeddedContext.contextVersion,
      slots: embeddedContext.slots,
    });
    expect(realWriterContext.slots).toHaveLength(10);
  });

  it("keeps audited and comparator identities out of unnamed slot contexts", () => {
    const slots = realWriterContext.slots as {
      context: unknown;
      permissions: { auditedBrandIdentity: string };
    }[];
    for (const slot of slots.slice(0, 6)) {
      const serialized = JSON.stringify(slot.context);
      for (const forbidden of [
        BRAND,
        ALIAS,
        COMPARATOR,
        SIMILAR,
        SOURCE_SIGNAL,
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("carries the audited brand in named contexts and the comparator in slot 9", () => {
    const slots = realWriterContext.slots as { context: unknown }[];
    for (const slot of slots.slice(6)) {
      expect(JSON.stringify(slot.context)).toContain(BRAND);
    }
    expect(JSON.stringify(slots[8].context)).toContain(COMPARATOR);
    // Slot 9 is the only slot whose context may carry the comparator.
    for (const [index, slot] of slots.entries()) {
      if (index === 8) continue;
      expect(JSON.stringify(slot.context)).not.toContain(COMPARATOR);
    }
  });
});

// ---------------------------------------------------------------------------
// Response-envelope assessment — synthetic envelopes only
// ---------------------------------------------------------------------------

const okBody = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "synthetic-fixture-1",
    model: "glm-5.3-flash",
    choices: [
      {
        message: {
          content: "## 1. Market interpretation\n…",
          refusal: null as string | null,
        },
        finish_reason: "stop" as string,
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    cheaper_inference: { billing: { billed_cost_usd: 0.0042, status: "ok" } },
    ...overrides,
  }) as {
    id: string;
    model: string;
    choices: {
      message: { content: string; refusal: string | null };
      finish_reason: string;
    }[];
    usage: Record<string, number>;
    cheaper_inference: Record<string, unknown>;
    [key: string]: unknown;
  };

describe("assessCheaperInferenceIndonesianResponse", () => {
  it("returns the assistant text plus verbatim provenance on a healthy envelope", () => {
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body: okBody(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assistantText).toContain("Market interpretation");
    expect(result.returnedModel).toBe("glm-5.3-flash");
    expect(result.requestedModel).toBe("glm-5.3-flash");
    expect(result.responseId).toBe("synthetic-fixture-1");
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });
    expect(result.billedCostUsd).toBe(0.0042);
  });

  it("parses settled billing returned as a decimal string (retained receipt regression)", () => {
    // The 2026-09-18 accepted envelope carried
    // cheaper_inference.billing.billed_cost_usd as the STRING "0.000496";
    // the earlier number-only read reported null for a real settled cost.
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body: okBody({
        cheaper_inference: {
          billing: { billed_cost_usd: "0.000496", status: "ok" },
        },
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.billedCostUsd).toBe(0.000496);
    // The raw envelope is never rewritten to make the parse work.
    const body = okBody({
      cheaper_inference: {
        billing: { billed_cost_usd: "0.000496", status: "ok" },
      },
    });
    assessCheaperInferenceIndonesianResponse({ httpStatus: 200, body });
    expect(
      (body.cheaper_inference.billing as Record<string, unknown>)
        .billed_cost_usd,
    ).toBe("0.000496");
  });

  it("rejects malformed, negative or non-finite settled billing", () => {
    for (const value of [
      "not-a-number",
      "",
      "   ",
      "-0.01",
      "0.001x",
      "1e999",
      NaN,
      -0.5,
      Infinity,
      true,
      null,
    ]) {
      const result = assessCheaperInferenceIndonesianResponse({
        httpStatus: 200,
        body: okBody({
          cheaper_inference: { billing: { billed_cost_usd: value } },
        }),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.billedCostUsd).toBeNull();
    }
  });

  it("reports non-2xx as http_error", () => {
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 503,
      body: okBody(),
    });
    expect(result).toMatchObject({ ok: false, reason: "http_error" });
  });

  it("reports a provider-level error field", () => {
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body: okBody({ error: { message: "upstream gateway timeout" } }),
    });
    expect(result).toMatchObject({ ok: false, reason: "provider_error" });
    if (!result.ok) expect(result.detail).toContain("timeout");
  });

  it("reports a malformed envelope", () => {
    for (const body of ["not json", {}, { choices: [] }, { choices: [{}] }]) {
      expect(
        assessCheaperInferenceIndonesianResponse({ httpStatus: 200, body }),
      ).toMatchObject({ ok: false, reason: "malformed" });
    }
  });

  it("reports refusal", () => {
    const body = okBody();
    body.choices[0].message.refusal = "I cannot help with that request.";
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body,
    });
    expect(result).toMatchObject({ ok: false, reason: "refusal" });
  });

  it("reports missing or empty assistant text", () => {
    for (const content of ["", "   "]) {
      const body = okBody();
      body.choices[0].message.content = content;
      expect(
        assessCheaperInferenceIndonesianResponse({ httpStatus: 200, body }),
      ).toMatchObject({ ok: false, reason: "empty_text" });
    }
    const missing = okBody();
    // @ts-expect-error synthetic fixture — content deliberately absent
    delete missing.choices[0].message.content;
    expect(
      assessCheaperInferenceIndonesianResponse({
        httpStatus: 200,
        body: missing,
      }),
    ).toMatchObject({ ok: false, reason: "empty_text" });
  });

  it("reports non-stop completion", () => {
    const body = okBody();
    body.choices[0].finish_reason = "length";
    expect(
      assessCheaperInferenceIndonesianResponse({ httpStatus: 200, body }),
    ).toMatchObject({ ok: false, reason: "incomplete" });
  });

  it("rejects the namespaced alias verbatim — acceptance still pending", () => {
    const result = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body: okBody({ model: "zai/glm-5.3-flash" }),
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "provenance",
      requestedModel: "glm-5.3-flash",
      returnedModel: "zai/glm-5.3-flash",
    });
  });

  it("rejects a missing returned model identifier", () => {
    const body = okBody();
    delete (body as Record<string, unknown>).model;
    expect(
      assessCheaperInferenceIndonesianResponse({ httpStatus: 200, body }),
    ).toMatchObject({ ok: false, reason: "provenance", returnedModel: null });
  });

  it("requires a nonblank string response id", () => {
    for (const id of [undefined, 123, "", "   "]) {
      const body = okBody({ id });
      const result = assessCheaperInferenceIndonesianResponse({
        httpStatus: 200,
        body,
      });
      expect(result).toMatchObject({
        ok: false,
        reason: "provenance",
        requestedModel: "glm-5.3-flash",
        returnedModel: "glm-5.3-flash",
      });
    }
    const valid = assessCheaperInferenceIndonesianResponse({
      httpStatus: 200,
      body: okBody({ id: "resp-fixture-9" }),
    });
    expect(valid).toMatchObject({ ok: true, responseId: "resp-fixture-9" });
  });
});

// ---------------------------------------------------------------------------
// Strict three-section extractor (§4a)
// ---------------------------------------------------------------------------

const MARKERS = {
  s1: "## 1. Market interpretation",
  s2: "## 2. Slot questions",
  s3: "## 3. Self-critique",
};

const syntheticResponse = (questions: string[] = VALID_PACK) =>
  [
    MARKERS.s1,
    "",
    "Pasar laundry kiloan di Jakarta Selatan padat; antar-jemput dan kecepatan paling menentukan.",
    "",
    MARKERS.s2,
    "",
    ...questions.flatMap((q, i) => [`${i + 1}. ${q}`]),
    "",
    MARKERS.s3,
    "",
    "Semua slot terpenuhi; slot 9 memakai relasi atau yang eksplisit.",
  ].join("\n");

describe("extractIndonesianSlotQuestions", () => {
  it("extracts exactly ten questions, text verbatim, labels ignored", () => {
    const withLabels = VALID_PACK.map((q, i) =>
      i === 0 ? `1. ${q}\nIntent pattern: open discovery` : `${i + 1}. ${q}`,
    );
    const text = [
      MARKERS.s1,
      "Some analysis.",
      MARKERS.s2,
      "",
      ...withLabels,
      MARKERS.s3,
      "Critique.",
    ].join("\n");
    const result = extractIndonesianSlotQuestions(text);
    expect(result).toEqual({ ok: true, questions: VALID_PACK });
  });

  it("extracted questions feed straight into the v3 validator", () => {
    const result = extractIndonesianSlotQuestions(syntheticResponse());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateIndonesianQuestionPackV3(result.questions, facts)).toEqual(
      [],
    );
  });

  it("rejects missing, duplicated, or out-of-order markers", () => {
    const good = syntheticResponse();
    expect(
      extractIndonesianSlotQuestions(good.replace(`${MARKERS.s2}\n`, "")),
    ).toMatchObject({ ok: false, reason: "missing_marker" });
    expect(
      extractIndonesianSlotQuestions(`${good}\n${MARKERS.s2}\n`),
    ).toMatchObject({ ok: false, reason: "duplicate_marker" });
    const swapped = [MARKERS.s2, "x", MARKERS.s1, "y", MARKERS.s3, "z"].join(
      "\n",
    );
    expect(extractIndonesianSlotQuestions(swapped)).toMatchObject({
      ok: false,
      reason: "marker_order",
    });
  });

  it("rejects non-blank preamble before the first marker", () => {
    expect(
      extractIndonesianSlotQuestions(
        `Here are your questions.\n${syntheticResponse()}`,
      ),
    ).toMatchObject({ ok: false, reason: "unexpected_preamble" });
  });

  it("rejects fewer or more than ten items and malformed numbering", () => {
    expect(
      extractIndonesianSlotQuestions(syntheticResponse(VALID_PACK.slice(0, 8))),
    ).toMatchObject({ ok: false, reason: "bad_numbering" });
    // Explicit wrong sequence: item 2 numbered again as 1.
    const renumbered = [
      MARKERS.s1,
      "analysis",
      MARKERS.s2,
      "1. " + VALID_PACK[0],
      "1. " + VALID_PACK[1],
      ...VALID_PACK.slice(2).map((q, i) => `${i + 3}. ${q}`),
      MARKERS.s3,
      "critique",
    ].join("\n");
    expect(extractIndonesianSlotQuestions(renumbered)).toMatchObject({
      ok: false,
      reason: "bad_numbering",
    });
  });

  it("rejects the wrapped-continuation counterexample — geography is never dropped silently", () => {
    const wrapped = [
      MARKERS.s1,
      "analysis",
      MARKERS.s2,
      "1. Cariin dong toko laptop yang bagus",
      "di Bandung/Cimahi.",
      ...VALID_PACK.slice(1).map((q, i) => `${i + 2}. ${q}`),
      MARKERS.s3,
      "critique",
    ].join("\n");
    expect(extractIndonesianSlotQuestions(wrapped)).toMatchObject({
      ok: false,
      reason: "unexpected_line",
    });
  });

  it("rejects stray prose inside the question span", () => {
    const text = [
      MARKERS.s1,
      "analysis",
      MARKERS.s2,
      "Berikut sepuluh pertanyaan untuk slot Anda.",
      ...VALID_PACK.map((q, i) => `${i + 1}. ${q}`),
      MARKERS.s3,
      "critique",
    ].join("\n");
    expect(extractIndonesianSlotQuestions(text)).toMatchObject({
      ok: false,
      reason: "unexpected_line",
    });
  });

  it("rejects an Intent pattern label that does not follow a question", () => {
    const text = [
      MARKERS.s1,
      "analysis",
      MARKERS.s2,
      "Intent pattern: orphan label",
      ...VALID_PACK.map((q, i) => `${i + 1}. ${q}`),
      MARKERS.s3,
      "critique",
    ].join("\n");
    expect(extractIndonesianSlotQuestions(text)).toMatchObject({
      ok: false,
      reason: "unexpected_line",
    });
  });

  it("never lets section 1 or 3 text become a question", () => {
    const text = [
      MARKERS.s1,
      "1. This numbered analysis line must not be extracted",
      MARKERS.s2,
      ...VALID_PACK.map((q, i) => `${i + 1}. ${q}`),
      MARKERS.s3,
      "1. This numbered critique line must not be extracted",
    ].join("\n");
    const result = extractIndonesianSlotQuestions(text);
    expect(result).toEqual({ ok: true, questions: VALID_PACK });
  });
});

// ---------------------------------------------------------------------------
// GLM-scoped v3 validator (§8 / R5 §§5.1–5.2)
// ---------------------------------------------------------------------------

const rulesFor = (questions: string[], slot: number | null = null) =>
  validateIndonesianQuestionPackV3(questions, facts).filter(
    (issue) => issue.slot === slot,
  );

describe("validateIndonesianQuestionPackV3", () => {
  it("accepts the synthetic valid pack end to end", () => {
    expect(validateIndonesianQuestionPackV3(VALID_PACK, facts)).toEqual([]);
  });

  // Founder-wording cases assert only the approved punctuation property —
  // a clean pass against laundry facts would not prove an invoice/laptop
  // question belongs there.
  it("accepts the complete founder laptop request — three sentences, no terminal ?", () => {
    expect(
      rulesFor(withSlot(1, FOUNDER_LAPTOP), 1).filter(
        (i) => i.rule === "question_form",
      ),
    ).toEqual([]);
  });

  it("accepts the complete founder invoice Q3 — context clause plus one request", () => {
    expect(
      rulesFor(withSlot(1, FOUNDER_INVOICE_Q3), 1).filter(
        (i) => i.rule === "question_form",
      ),
    ).toEqual([]);
  });

  it("rejects more than one question mark, or a non-terminal one", () => {
    expect(
      rulesFor(
        withSlot(1, "Apa pilihannya? Dan kenapa? di Jakarta Selatan?"),
        1,
      ).map((i) => i.rule),
    ).toContain("question_form");
    expect(
      rulesFor(
        withSlot(1, "Apa pilihannya? di Jakarta Selatan ada berapa"),
        1,
      ).map((i) => i.rule),
    ).toContain("question_form");
  });

  it("keeps nonempty, minimum-length, and maximum-length checks", () => {
    expect(rulesFor(withSlot(1, ""), 1).map((i) => i.rule)).toContain("empty");
    expect(rulesFor(withSlot(1, "Ada apa"), 1).map((i) => i.rule)).toContain(
      "unexecutable",
    );
    expect(
      rulesFor(withSlot(1, `${"a".repeat(701)}?`), 1).map((i) => i.rule),
    ).toContain("length");
  });

  it("allows open preferences but rejects asserted premises on named entities", () => {
    // Open preference, no entity attached to the superlative.
    expect(
      rulesFor(
        withSlot(
          1,
          "Toko laptop mana di Depok yang pilihannya terlengkap untuk kebutuhan kuliah desain?",
        ),
        1,
      ).filter((i) => i.rule === "unsupported_premise"),
    ).toEqual([]);
    // Preference clause + fit question naming the business — the superlative
    // is not attached to the business, so this is not an assertion.
    expect(
      rulesFor(
        withSlot(
          7,
          "Saya mencari laundry yang paling murah. Apakah Laundry Ceria cocok untuk kebutuhan itu?",
        ),
        7,
      ).filter((i) => i.rule === "unsupported_premise"),
    ).toEqual([]);
    // An actual assertion: the superlative is attached to the named business
    // in a declarative clause.
    expect(
      rulesFor(
        withSlot(
          7,
          "Karena Laundry Ceria paling murah, apakah cocok untuk cucian keluarga?",
        ),
        7,
      ).map((i) => i.rule),
    ).toContain("unsupported_premise");
    // An interrogative clause still asks rather than asserts — open.
    expect(
      rulesFor(
        withSlot(
          7,
          "Apakah Laundry Ceria jasa laundry terlengkap di Jakarta Selatan?",
        ),
        7,
      ).filter((i) => i.rule === "unsupported_premise"),
    ).toEqual([]);
  });

  // Correction regression: the exemption recognizes bounded open-question
  // forms by position, not marker co-occurrence — assertions merely
  // containing "apa"/"nggak"/"siapa" mid-clause, and presupposing framings
  // like "kenapa", still assert the superlative. Polar openers and
  // confirmation tags remain genuine asks.
  it("rejects declarative and presupposing clauses that merely contain interrogative tokens", () => {
    const assertions = [
      "Laundry Ceria paling murah untuk siapa saja.",
      "Laundry Ceria paling murah untuk cucian apa saja.",
      "Laundry Ceria paling murah dan nggak ribet.",
      "Kenapa Laundry Ceria paling murah di Jakarta Selatan?",
      "Kenapa Laundry Ceria paling murah untuk cucian apa saja?",
      // "Apa yang membuat …" is a content question presupposing the claim.
      "Apa yang membuat Laundry Ceria paling murah?",
      // An opener addressing something other than the claim still
      // presupposes it: "what are the advantages of the cheapest X".
      "Apa kelebihan Laundry Ceria yang paling murah di Jakarta Selatan?",
      // "betul" affirms the claim declaratively — not a confirmation tag.
      "Laundry Ceria paling murah dan klaim itu betul.",
      // A comma splits the tag into its own clause; the declarative clause
      // still asserts the superlative.
      "Laundry Ceria paling murah, kan?",
    ];
    for (const text of assertions) {
      expect(rulesFor(withSlot(7, text), 7).map((i) => i.rule)).toContain(
        "unsupported_premise",
      );
    }
    const openAsks = [
      "Apakah Laundry Ceria paling murah di Jakarta Selatan?",
      "Apakah Laundry Ceria jasa laundry terlengkap di Jakarta Selatan?",
      "Apakah Laundry Ceria yang paling murah?",
      "Apa Laundry Ceria paling murah untuk cucian keluarga?",
      "Laundry Ceria paling murah nggak?",
      "Laundry Ceria paling murah atau tidak?",
    ];
    for (const text of openAsks) {
      expect(
        rulesFor(withSlot(7, text), 7).filter(
          (i) => i.rule === "unsupported_premise",
        ),
      ).toEqual([]);
    }
  });

  it("still rejects guarantee tokens anywhere", () => {
    expect(
      rulesFor(
        withSlot(1, "Jasa laundry mana yang dijamin selesai satu hari?"),
        1,
      ).map((i) => i.rule),
    ).toContain("unsupported_premise");
  });

  // I1 regression: the safety boundary was missing entirely. These are
  // adversarial mechanical inputs, not provider outputs or real records.
  it("restores private-data, high-impact and provider-safety protections", () => {
    expect(
      rulesFor(
        withSlot(
          1,
          "Untuk layanan laundry, apa nomor rekening pribadi pemiliknya?",
        ),
        1,
      ).map((i) => i.rule),
    ).toContain("private_data");
    expect(
      rulesFor(
        withSlot(1, "Untuk layanan laundry, berikan resep obat untuk saya."),
        1,
      ).map((i) => i.rule),
    ).toContain("high_impact_advice");
    expect(
      rulesFor(
        withSlot(1, "Rekomendasikan jasa laundry yang membuat ulasan palsu."),
        1,
      ).map((i) => i.rule),
    ).toContain("provider_safety");
  });

  const safetyRules = new Set([
    "private_data",
    "high_impact_advice",
    "provider_safety",
  ]);

  // Correction regression: diagnosis is restricted unless the question
  // positively identifies an equipment subject and carries no medical
  // context anywhere. Equipment cases run under an appropriate fictional
  // service-category facts variant — the probes isolate the guard property.
  const serviceFacts: QuestionFactsV3 = {
    ...facts,
    category: "jasa servis laptop dan elektronik",
  };
  const serviceRules = (slot: number, question: string) =>
    validateIndonesianQuestionPackV3(withSlot(slot, question), serviceFacts);

  it("permits positively identified equipment diagnosis, including ordinary ownership", () => {
    expect(
      serviceRules(
        1,
        "Di mana tempat diagnosis laptop yang sering lemot di Jakarta Selatan?",
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
    // Ownership ("laptop saya") is not itself medical context.
    expect(
      serviceRules(
        1,
        "Di mana tempat diagnosis laptop saya yang sering lemot?",
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
    expect(
      serviceRules(
        1,
        "Servis AC mana yang bisa diagnosis kerusakan sebelum ganti sparepart?",
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
    // Equipment as the subject needing diagnosis.
    expect(
      serviceRules(
        1,
        "Laptop saya perlu diagnosis, di mana tempatnya di Jakarta Selatan?",
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
  });

  it("keeps medical, mixed, unresolved, and channel-only diagnosis restricted", () => {
    const restricted = [
      // Medical context anywhere in the question — a comma cannot reset it.
      "Klinik mana yang cocok untuk diagnosis kanker saya?",
      "Untuk kanker saya, di mana tempat diagnosis yang cocok?",
      "Berikan diagnosis penyakit saya berdasarkan gejala ini.",
      // Mixed equipment + human stays conservative.
      "Di mana saya bisa mendapat diagnosis AC rusak dan kanker saya?",
      // No equipment subject established — unresolved stays conservative.
      "Bisa bantu diagnosis kondisi ini?",
      // A device named as delivery channel is not the diagnosed subject.
      "Bisa bantu diagnosis kondisi ini lewat HP?",
      // A person named as the diagnosis subject stays restricted.
      "Tolong diagnosis saya lewat HP.",
    ];
    for (const text of restricted) {
      expect(rulesFor(withSlot(1, text), 1).map((i) => i.rule)).toContain(
        "high_impact_advice",
      );
    }
  });

  it("keeps the approved §5.2 permissions — provider discovery and warranty asks stay open", () => {
    // Ordinary regulated-provider discovery: no diagnosis token, no advice.
    expect(
      rulesFor(
        withSlot(1, "Klinik gigi mana di Jakarta Selatan yang buka malam?"),
        1,
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
    expect(
      rulesFor(
        withSlot(
          1,
          "Jasa laundry mana yang kasih garansi kalau pakaian rusak?",
        ),
        1,
      ).filter((i) => safetyRules.has(i.rule)),
    ).toEqual([]);
  });

  it("keeps identity restrictions in both directions", () => {
    expect(
      rulesFor(
        withSlot(1, "Apakah Laundry Ceria tersedia di Jakarta Selatan?"),
        1,
      ).map((i) => i.rule),
    ).toContain("identity_leakage");
    expect(
      rulesFor(
        withSlot(2, "Apakah CuciKilat Plus buka di Jakarta Selatan?"),
        2,
      ).map((i) => i.rule),
    ).toContain("competitor_leakage");
    expect(
      rulesFor(
        withSlot(7, "Jasa laundry mana yang cocok buat pekerja kantoran?"),
        7,
      ).map((i) => i.rule),
    ).toContain("identity_requirement");
  });

  it("requires the slot-9 comparator and an explicit comparison relation", () => {
    expect(
      rulesFor(
        withSlot(
          9,
          "Laundry Ceria atau alternatif lain, mana yang lebih cocok buat antar-jemput?",
        ),
        9,
      ).map((i) => i.rule),
    ).toContain("identity_requirement");
    expect(
      rulesFor(
        withSlot(
          9,
          "Laundry Ceria dibandingkan CuciKilat Plus, mana yang lebih cepat selesai untuk antar-jemput?",
        ),
        9,
      ).map((i) => i.rule),
    ).not.toContain("comparison_relation");
    expect(
      rulesFor(
        withSlot(
          9,
          "Laundry Ceria dan CuciKilat Plus sama-sama ada di Jakarta Selatan.",
        ),
        9,
      ).map((i) => i.rule),
    ).toContain("comparison_relation");
  });

  // I1 regression: with no named comparator, the canonical alternatives
  // phrase the writer is shown must bind — an unrelated "atau" is not a
  // business comparison.
  it("binds the canonical category-alternatives phrase when no comparator is named", () => {
    const alternativesFacts: QuestionFactsV3 = {
      ...facts,
      comparison: {
        kind: "category-alternatives",
        name: categoryComparisonFallbackName(facts.category),
      },
    };
    const alternativesRules = (questions: string[]) =>
      validateIndonesianQuestionPackV3(questions, alternativesFacts).filter(
        (issue) => issue.slot === 9,
      );
    const valid = alternativesRules(
      withSlot(
        9,
        "Laundry Ceria atau alternatif lain di kategori jasa laundry kiloan, mana yang lebih cocok buat antar-jemput?",
      ),
    ).map((i) => i.rule);
    expect(valid).not.toContain("identity_requirement");
    expect(valid).not.toContain("comparison_relation");
    const unrelated = alternativesRules(
      withSlot(9, "Laundry Ceria menerima pakaian atau sepatu?"),
    ).map((i) => i.rule);
    expect(unrelated).toContain("identity_requirement");
    expect(unrelated).toContain("comparison_relation");
  });

  it("keeps composition and distinctness", () => {
    const wrongComposition = [
      ...VALID_PACK.slice(0, 5),
      VALID_PACK[7],
      ...VALID_PACK.slice(6),
    ];
    expect(
      validateIndonesianQuestionPackV3(wrongComposition, facts).map(
        (i) => i.rule,
      ),
    ).toContain("composition");
    const duplicated = VALID_PACK.map((q, i) => (i === 5 ? VALID_PACK[4] : q));
    expect(
      validateIndonesianQuestionPackV3(duplicated, facts).map((i) => i.rule),
    ).toContain("distinctness");
    expect(
      validateIndonesianQuestionPackV3(VALID_PACK.slice(0, 9), facts).map(
        (i) => i.rule,
      ),
    ).toContain("count");
  });
});

// ---------------------------------------------------------------------------
// Shipped v2 behavior must be unchanged
// ---------------------------------------------------------------------------

describe("v2 validator parity (unchanged)", () => {
  const brief = minimizeIndonesianBrief(fixtureBrief);

  it("v2 still enforces the terminal-? rule the founder text breaks", () => {
    const issues = validateCanonicalIndonesianQuestionPack(
      withSlot(1, FOUNDER_LAPTOP),
      brief,
    );
    expect(issues.map((i) => i.rule)).toContain("question_form");
  });

  it("v2 still rejects the open preference v3 now allows", () => {
    const issues = validateCanonicalIndonesianQuestionPack(
      withSlot(
        1,
        "Toko laptop mana di Depok yang pilihannya terlengkap untuk kebutuhan kuliah desain?",
      ),
      brief,
    );
    expect(issues.map((i) => i.rule)).toContain("unsupported_premise");
  });
});
