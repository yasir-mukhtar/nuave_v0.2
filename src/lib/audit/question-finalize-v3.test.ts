import { describe, expect, it } from "vitest";
import { measurementSlotForId } from "./measurement-matrix";
import { parseQuestionFactsV3 } from "./question-facts-v3";
import {
  checkV3Text,
  deriveV3Attribution,
  finalizeV3RichResponse,
  finalizeV3SimpleResponse,
  runV3Generation,
  v3SlotFallback,
  V3_FALLBACK_VERSION,
  V3_SELECTOR_VERSION,
} from "./question-finalize-v3";
import { parseV3RichResponse } from "./question-writer-v3";
import {
  projectedFacts,
  richResponseOf,
  testFactsEnvelope,
  V3_SIMPLE_VALID_QUESTIONS,
  V3_TEST_SLOT_IDS,
} from "./question-v3-testkit";

const slot = (id: string) => measurementSlotForId(id)!;

const SIMPLE_QUESTIONS = V3_SIMPLE_VALID_QUESTIONS;
const SLOT_IDS = V3_TEST_SLOT_IDS;

describe("checkV3Text (compatible-008 mechanical checks)", () => {
  const facts = projectedFacts();

  it("accepts a natural unnamed question and a direct request", () => {
    expect(
      checkV3Text(
        "Kedai kopi apa saja yang layak dicoba di Jakarta Selatan?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toEqual([]);
    // §5.1: an equivalent direct request is not a form violation.
    expect(
      checkV3Text(
        "Bandingkan beberapa kedai kopi untuk tempat nugas.",
        slot("NUAVE-BRAND-COMPARISON-02"),
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text(
        "Rekomendasikan kedai kopi untuk nugas",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toEqual([]);
  });

  it("rejects unexecutable, overlength, and malformed forms", () => {
    expect(checkV3Text("", slot("NUAVE-BRAND-NEED-01"), facts)).toEqual([
      "empty",
    ]);
    expect(checkV3Text("pendek", slot("NUAVE-BRAND-NEED-01"), facts)).toContain(
      "unexecutable",
    );
    expect(
      checkV3Text("x".repeat(701), slot("NUAVE-BRAND-NEED-01"), facts),
    ).toContain("length");
    expect(
      checkV3Text(
        "Kedai kopi mana? Di mana?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("question_form");
    expect(
      checkV3Text(
        "Kedai kopi mana? di Jakarta Selatan",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("question_form");
  });

  it("rejects identity leakage in unnamed slots and missing identity in named slots", () => {
    expect(
      checkV3Text(
        "Apakah Kopi Sudut enak untuk nugas?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("identity_leakage");
    expect(
      checkV3Text(
        "Kedai kopi atau Kedai Pagi mana yang lebih nyaman?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("competitor_leakage");
    expect(
      checkV3Text(
        "Apakah tempat ini cocok untuk nugas?",
        slot("NUAVE-BRAND-VALIDATION-01"),
        facts,
      ),
    ).toContain("identity_requirement");
    expect(
      checkV3Text(
        "Apakah Kopi Sudut cocok dibanding Kedai Pagi?",
        slot("NUAVE-BRAND-VALIDATION-01"),
        facts,
      ),
    ).toContain("competitor_leakage");
  });

  it("requires an explicit comparison relation in the named comparison slot", () => {
    const direct = slot("NUAVE-BRAND-ACTION-01");
    expect(
      checkV3Text(
        "Bandingkan Kopi Sudut dengan Kedai Pagi untuk tempat nugas.",
        direct,
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text("Apakah Kopi Sudut cocok untuk nugas?", direct, facts),
    ).toContain("comparison_relation");
  });

  it("distinguishes consumer preference from asserted premise (§5.2)", () => {
    // Open superlative preference in an unnamed slot is lawful.
    expect(
      checkV3Text(
        "Kedai kopi mana yang paling nyaman untuk nugas?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toEqual([]);
    // Attaching the superlative to the audited business in a named slot is
    // an unsupported premise.
    expect(
      checkV3Text(
        "Apakah Kopi Sudut adalah yang terbaik?",
        slot("NUAVE-BRAND-VALIDATION-01"),
        facts,
      ),
    ).toContain("unsupported_premise");
    // Guaranteed-outcome assertions stay blocked everywhere.
    expect(
      checkV3Text(
        "Kedai kopi mana yang dijamin enak?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("unsupported_premise");
  });

  it("rejects copied target specs in unnamed slots but allows consumer criteria", () => {
    // "200g" is a digit-bearing token from a confirmed offering.
    expect(
      checkV3Text(
        "Di mana bisa beli biji kopi kemasan 200g?",
        slot("NUAVE-BRAND-SOLUTION-02"),
        facts,
      ),
    ).toContain("known_copy");
    // A consumer-stated price preference is not a copied spec.
    expect(
      checkV3Text(
        "Kedai kopi mana yang harganya di bawah 25 ribu?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toEqual([]);
  });

  it("keeps private-data, individualized advice, and provider-safety boundaries", () => {
    expect(
      checkV3Text(
        "Kedai kopi mana yang menerima kartu 1234567890123456?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("private_data");
    expect(
      checkV3Text(
        "Klinik mana yang bisa kasih resep obat untuk saya?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("high_impact_advice");
    // §5.2 equipment distinction: diagnosing equipment is a service-selection
    // criterion, not individualized advice.
    expect(
      checkV3Text(
        "Bengkel mana yang bisa diagnosis kerusakan AC mobil?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text(
        "Klinik mana yang bisa diagnosis kondisi saya?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("high_impact_advice");
    expect(
      checkV3Text(
        "Jasa mana yang bisa naikkan peringkat dengan ulasan palsu?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("provider_safety");
  });
});

describe("v3SlotFallback", () => {
  const facts = projectedFacts();

  it("produces valid, distinct, recommendation-eligible texts for all ten slots", () => {
    const texts = AUDIT_SLOTS.map((s) => v3SlotFallback(facts, s));
    for (const [i, s] of AUDIT_SLOTS.entries())
      expect(checkV3Text(texts[i], s, facts)).toEqual([]);
    expect(new Set(texts.map((t) => t.toLowerCase())).size).toBe(texts.length);
    // Named fallbacks carry the required identities.
    expect(texts[8]).toContain("Kopi Sudut");
    expect(texts[8]).toContain("Kedai Pagi");
  });

  it("a reviewed override is still checked like any other text", () => {
    const unsafe = v3SlotFallback(
      facts,
      slot("NUAVE-BRAND-NEED-01"),
      "Apakah Kopi Sudut enak?",
    );
    expect(checkV3Text(unsafe, slot("NUAVE-BRAND-NEED-01"), facts)).toContain(
      "identity_leakage",
    );
  });
});

const AUDIT_SLOTS = SLOT_IDS.map((id) => measurementSlotForId(id)!);

describe("finalizeV3RichResponse", () => {
  const facts = projectedFacts();

  it("selects all primaries when every candidate is valid (pass 1)", () => {
    const parsed = parseV3RichResponse(richResponseOf());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.pass).toBe("primary_selection");
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(64);
    expect(
      result.prompts
        .filter((p) => p.order <= 6)
        .every((p) => p.origin === "primary"),
    ).toBe(true);
  });

  it("uses a reserve when the primary is invalid (valid-only selection)", () => {
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Apakah Kopi Sudut enak untuk nugas?", // identity leakage
      },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const prompt = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-NEED-01",
    )!;
    expect(prompt.origin).toBe("reserve");
    expect(prompt.text).not.toContain("Kopi Sudut");
  });

  it("applies a reviewed slot fallback when both candidates are invalid", () => {
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Apakah Kopi Sudut enak?",
        reserve: "Kopi Sudut atau mana?",
      },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const prompt = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-NEED-01",
    )!;
    expect(prompt.origin).toBe("slot_fallback");
    expect(result.diagnostics.pass).toBe("fallback_selection");
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("rejects duplicate final texts across the whole pack", () => {
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Kedai kopi mana saja yang layak masuk shortlist nugas?",
        reserve: "Kedai kopi mana saja yang layak masuk shortlist nugas?",
      },
    });
    // Slot 5's default primary equals the injected duplicate, so slot 1 must
    // resolve to a distinct fallback text.
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const normalized = result.prompts.map((p) =>
      p.text.toLowerCase().replace(/\s+/g, " ").trim(),
    );
    expect(new Set(normalized).size).toBe(10);
  });

  it("recovers a missing named text through the reviewed named fallback", () => {
    const response = richResponseOf(
      {},
      { "NUAVE-BRAND-VALIDATION-02": "Apakah tempat ini direkomendasikan?" },
    );
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const prompt = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-VALIDATION-02",
    )!;
    expect(prompt.origin).toBe("slot_fallback");
    expect(prompt.text).toContain("Kopi Sudut");
  });

  it("keeps the 64/729 portfolio bounds", () => {
    // All primaries and reserves invalid → pass 2 covers 3^6 = 729 portfolios.
    const allBad = richResponseOf(
      Object.fromEntries(
        SLOT_IDS.slice(0, 6).map((id) => [
          id,
          { primary: "Kopi Sudut?", reserve: "Kopi Sudut??" },
        ]),
      ),
    );
    const parsed = parseV3RichResponse(allBad);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
    expect(result.diagnostics.portfoliosEvaluated).toBeGreaterThan(64);
  });

  it("falls back to the shared deterministic pack when a named slot cannot resolve", () => {
    // One named slot unresolvable: its original and its reviewed fallback are
    // both invalid, so no portfolio can complete and the shared pack is used
    // once (built from code-owned deterministic fragments only).
    const response = richResponseOf(
      {},
      { "NUAVE-BRAND-VALIDATION-01": "Tanpa nama bisnis di sini?" },
    );
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response, {
      reviewedSlotFallbacks: {
        "NUAVE-BRAND-VALIDATION-01": "Masih tanpa nama bisnis?",
      },
    });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.pass).toBe("full_fallback");
    expect(result.prompts.every((p) => p.origin === "full_fallback")).toBe(
      true,
    );
  });

  it("returns temporarily-unavailable when even the deterministic pack cannot pass", () => {
    // A brand name containing "?" projects fine, but it makes every named
    // deterministic fragment fail the form check (the identity token embeds a
    // second "?"). Named originals that never mention the brand leave nothing
    // to resolve.
    const envelope = testFactsEnvelope();
    envelope.intake.confirmed.brand.name = "Kopi?";
    const factsResult = parseQuestionFactsV3(envelope);
    if (factsResult.status !== "projected")
      throw new Error(`expected projected, got ${factsResult.status}`);
    const response = richResponseOf(
      {},
      Object.fromEntries(
        SLOT_IDS.slice(6).map((id) => [
          id,
          "Apakah bisnis ini layak direkomendasikan?",
        ]),
      ),
    );
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const result = finalizeV3RichResponse(factsResult.facts, parsed.response);
    expect(result.status).toBe("generation_temporarily_unavailable");
  });
});

describe("P/M/C attribution (§8.1)", () => {
  const facts = projectedFacts();

  it("P ignores reserves and coverage; M and C use them", () => {
    // Slot 1 primary invalid, reserve valid, covering a new dimension.
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Apakah Kopi Sudut enak untuk nugas?",
      },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { P, M, C } = deriveV3Attribution(facts, parsed.response);
    for (const [label, result] of Object.entries({ P, M, C })) {
      expect(result.status, label).toBe("completed");
    }
    if (
      P.status !== "completed" ||
      M.status !== "completed" ||
      C.status !== "completed"
    )
      return;
    const originOf = (r: typeof M) =>
      r.prompts.find((p) => p.slotId === "NUAVE-BRAND-NEED-01")!.origin;
    // P cannot see the reserve, so it must recover by slot fallback.
    expect(originOf(P)).toBe("slot_fallback");
    // M and C both select the valid reserve.
    expect(originOf(M)).toBe("reserve");
    expect(originOf(C)).toBe("reserve");
  });

  it("C prefers dimension coverage where M stays primary-only", () => {
    // All candidates valid; reserves cover a second dimension.
    const response = richResponseOf();
    for (const entry of response.unnamed) {
      entry.primary.dimensionIds = ["nugas"];
      entry.reserve.dimensionIds = ["harga"];
      entry.reserve.text = `${entry.reserve.text.replace(/[?.!]$/, "")} versi cadangan?`;
    }
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { M, C } = deriveV3Attribution(facts, parsed.response);
    expect(M.status).toBe("completed");
    expect(C.status).toBe("completed");
    if (M.status !== "completed" || C.status !== "completed") return;
    const reserves = (r: typeof M) =>
      r.prompts.filter((p) => p.origin === "reserve").length;
    expect(reserves(M)).toBe(0);
    expect(reserves(C)).toBeGreaterThan(0);
  });
});

describe("finalizeV3SimpleResponse", () => {
  const facts = projectedFacts();

  it("accepts ten ordered valid strings and maps them to canonical slots", () => {
    const result = finalizeV3SimpleResponse(facts, {
      questions: SIMPLE_QUESTIONS,
    });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.prompts[0].slotId).toBe("NUAVE-BRAND-NEED-01");
    expect(result.prompts[9].slotId).toBe("NUAVE-BRAND-ACTION-02");
    expect(result.prompts.every((p) => p.origin === "primary")).toBe(true);
  });

  it("recovers a bad simple text through the slot fallback only", () => {
    const questions = [...SIMPLE_QUESTIONS];
    questions[0] = "Apakah Kopi Sudut enak?";
    const result = finalizeV3SimpleResponse(facts, { questions });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.prompts[0].origin).toBe("slot_fallback");
    // The simple control has no reserves.
    expect(result.prompts.filter((p) => p.origin === "reserve")).toEqual([]);
  });
});

describe("runV3Generation (§4.2 orchestration over injected transport)", () => {
  const envelope = testFactsEnvelope();

  it("returns the correction outcome before any transport call", async () => {
    const bad = testFactsEnvelope();
    bad.intake.confirmed.brand.name = "";
    let calls = 0;
    const result = await runV3Generation({
      factsInput: bad,
      variant: "rich",
      transport: async () => {
        calls += 1;
        return {};
      },
    });
    expect(result.status).toBe("input_correction_required");
    expect(calls).toBe(0);
  });

  it("returns invalid_request for a malformed envelope without transport", async () => {
    let calls = 0;
    const result = await runV3Generation({
      factsInput: { nope: true },
      variant: "simple",
      transport: async () => {
        calls += 1;
        return {};
      },
    });
    expect(result.status).toBe("invalid_request");
    expect(calls).toBe(0);
  });

  it("makes exactly one transport call on the happy path", async () => {
    let calls = 0;
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "rich",
      transport: async () => {
        calls += 1;
        return richResponseOf();
      },
    });
    expect(result.status).toBe("completed");
    expect(calls).toBe(1);
    expect("attempts" in result && result.attempts).toBe(1);
  });

  it("recovers a transport failure through the shared fallback budget", async () => {
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "rich",
      transport: async () => {
        throw new Error("offline test: no transport");
      },
    });
    expect(result.status).toBe("completed");
    expect("attempts" in result && result.attempts).toBe(1);
    if (result.status === "completed") {
      const origins = result.pack.prompts.map((p) => p.origin);
      expect(
        origins.every((o) => o === "slot_fallback" || o === "full_fallback"),
      ).toBe(true);
      expect(result.pack.diagnostics.failedAttempts[0].stage).toBe("transport");
    }
  });

  it("recovers a structurally malformed response the same way", async () => {
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "rich",
      transport: async () => ({ broken: true }),
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed")
      expect(result.pack.diagnostics.failedAttempts[0].stage).toBe("parse");
  });

  it("completes the simple variant through the same orchestration", async () => {
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "simple",
      transport: async () => ({ questions: SIMPLE_QUESTIONS }),
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.pack.prompts).toHaveLength(10);
      expect(result.pack.evidence.versions.selector).toBe(V3_SELECTOR_VERSION);
      expect(result.pack.evidence.versions.fallback).toBe(V3_FALLBACK_VERSION);
    }
  });
});

describe("evidence record", () => {
  const facts = projectedFacts();

  it("records deterministic fingerprints, origins, and provenance", () => {
    const parsed = parseV3RichResponse(richResponseOf());
    if (!parsed.ok) throw new Error("fixture should parse");
    const first = finalizeV3RichResponse(facts, parsed.response);
    const second = finalizeV3RichResponse(facts, parsed.response);
    expect(first.status).toBe("completed");
    if (first.status !== "completed" || second.status !== "completed") return;
    expect(first.evidence.fingerprints.pack).toBe(
      second.evidence.fingerprints.pack,
    );
    expect(first.evidence.fingerprints.pack).toMatch(/^[0-9a-f]{64}$/);
    expect(first.evidence.binding).toEqual(facts.binding);
    expect(first.evidence.semanticEvaluations).toEqual({
      naturalness: "not_evaluated",
      standaloneRequest: "not_evaluated",
      inputAdherence: "not_evaluated",
    });
    // Canonical metadata is code-owned: prompts carry matrix values.
    for (const prompt of first.prompts) {
      const slot = measurementSlotForId(prompt.slotId)!;
      expect(prompt.measurementPurpose).toBe(slot.measurementPurpose);
      expect(prompt.order).toBe(slot.order);
    }
    // Provenance lists the supplied/permitted context per slot.
    expect(
      first.evidence.contextProvenance["NUAVE-BRAND-NEED-01"].permittedFields,
    ).toContain("category");
  });
});
