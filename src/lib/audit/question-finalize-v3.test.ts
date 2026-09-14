import { describe, expect, it } from "vitest";
import fixture from "./fixtures/g2-evaluation-inputs.json";
import {
  AUDIT_MEASUREMENT_MATRIX,
  measurementSlotForId,
} from "./measurement-matrix";
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
const AUDIT_SLOTS = SLOT_IDS.map((id) => measurementSlotForId(id)!);

const FIXTURE_INPUTS = (fixture as { inputs: Record<string, unknown> }).inputs;

function fixtureFacts(inputId: string) {
  const result = parseQuestionFactsV3(FIXTURE_INPUTS[inputId]);
  if (result.status !== "projected")
    throw new Error(`${inputId} did not project: ${result.status}`);
  return result.facts;
}

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
    expect(
      checkV3Text(
        "Jasa mana yang bisa naikkan peringkat dengan ulasan palsu?",
        slot("NUAVE-BRAND-NEED-01"),
        facts,
      ),
    ).toContain("provider_safety");
  });
});

describe("§5.2 guard pairs (F9)", () => {
  const facts = projectedFacts();
  const need = slot("NUAVE-BRAND-NEED-01");

  it("allows ordinary retail/service preferences and work warranties", () => {
    expect(
      checkV3Text(
        "Toko laptop mana yang harganya paling sesuai anggaran?",
        need,
        facts,
      ),
    ).toEqual([]);
    // A consumer may ask which provider offers a work warranty.
    expect(
      checkV3Text(
        "Bengkel mana yang memberi garansi pengerjaan 30 hari?",
        need,
        facts,
      ),
    ).toEqual([]);
    expect(
      checkV3Text("Jasa servis mana yang bergaransi hasil kerja?", need, facts),
    ).toEqual([]);
  });

  it("blocks lifetime/permanent outcome premises", () => {
    expect(
      checkV3Text(
        "Bengkel mana yang memberi garansi seumur hidup?",
        need,
        facts,
      ),
    ).toContain("unsupported_premise");
    expect(
      checkV3Text("Produk mana yang dijamin awet selamanya?", need, facts),
    ).toContain("unsupported_premise");
  });

  it("allows equipment diagnosis but not human or mixed diagnosis", () => {
    // Diagnosing equipment damage is a service-selection criterion.
    expect(
      checkV3Text(
        "Bengkel mana yang bisa diagnosis kerusakan AC mobil?",
        need,
        facts,
      ),
    ).toEqual([]);
    // An equipment token such as `perangkat` cannot exempt human diagnosis.
    expect(
      checkV3Text(
        "Klinik mana yang bisa diagnosis kondisi saya lewat perangkat?",
        need,
        facts,
      ),
    ).toContain("high_impact_advice");
    expect(
      checkV3Text(
        "Tempat mana yang bisa diagnosis penyakit kulit pada perangkat?",
        need,
        facts,
      ),
    ).toContain("high_impact_advice");
    expect(
      checkV3Text("Klinik mana yang bisa diagnosis kondisi saya?", need, facts),
    ).toContain("high_impact_advice");
  });

  it("blocks personal drug/treatment suitability and clinical-winner premises", () => {
    // Personal treatment suitability is individualized high-impact advice.
    expect(
      checkV3Text(
        "Apotek mana yang punya obat yang cocok untuk saya?",
        need,
        facts,
      ),
    ).toContain("high_impact_advice");
    expect(
      checkV3Text(
        "Klinik mana yang bisa menyembuhkan penyakit diabetes?",
        need,
        facts,
      ),
    ).toContain("unsupported_premise");
    // Clinical-winner premise inside a confirmed regulated category.
    const regulated = fixtureFacts("D7");
    expect(
      checkV3Text("Klinik gigi mana yang paling aman?", need, regulated),
    ).toContain("unsupported_premise");
    // Ordinary service discovery in the same category stays allowed.
    expect(
      checkV3Text(
        "Klinik gigi mana saja yang menerima pasien baru di Depok?",
        need,
        regulated,
      ),
    ).toEqual([]);
  });
});

describe("v3SlotFallback (F10/R5)", () => {
  const facts = projectedFacts();

  it("produces valid, distinct, recommendation-eligible texts for all ten slots", () => {
    const texts = AUDIT_SLOTS.map((s) => v3SlotFallback(facts, s));
    for (const [i, s] of AUDIT_SLOTS.entries()) {
      expect(texts[i].text, `${s.id} missing`).toBeTruthy();
      expect(checkV3Text(texts[i].text!, s, facts), `${s.id} issues`).toEqual(
        [],
      );
    }
    const all = texts.map((t) => t.text!.toLowerCase());
    expect(new Set(all).size).toBe(texts.length);
    // Real occasion in slot 2, supported offering in slot 4, concrete-option
    // comparison in slot 6 — all slot-safe and recommendation-eligible. The
    // unnamed slot sees only identity-free offerings: "Kopi Susu Sudut"
    // carries the brand token, so the permitted offering is "Americano".
    expect(texts[1].text).toMatch(/^saat membutuhkan tempat nugas/i);
    expect(texts[3].text).toMatch(/Americano|espresso|Biji kopi/);
    expect(texts[3].text).not.toContain("Kopi Sudut");
    expect(texts[5].text).toContain("bandingkan");
    // Named fallbacks carry the required identities.
    expect(texts[8].text).toContain("Kopi Sudut");
    expect(texts[8].text).toContain("Kedai Pagi");
  });

  it("a supplied problem becomes a natural occasion, not a 'membutuhkan' noun", () => {
    // "AC di rumah tidak dingin" is a problem statement: the occasion is the
    // situation itself, never "membutuhkan AC di rumah tidak dingin".
    const f = fixtureFacts("D1");
    const situation = v3SlotFallback(f, slot("NUAVE-BRAND-NEED-02"));
    expect(situation.text).toMatch(/saat ac di rumah tidak dingin/i);
    expect(situation.text).not.toMatch(/membutuhkan ac di rumah/i);
    // The need-fit slot asks a materially different consumer decision — the
    // second confirmed need, not the same need re-prefixed.
    const needFit = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-01"));
    expect(needFit.text).toMatch(/teknisi.*datang ke rumah/i);
    expect(needFit.text).not.toBe(situation.text);
  });

  it("a sparse consumer product gets a genuine occasion and a supported use case", () => {
    const f = fixtureFacts("D8");
    const situation = v3SlotFallback(f, slot("NUAVE-BRAND-NEED-02"));
    // An ordinary category occasion — it must not imply the target's
    // availability and must not just re-prefix the need.
    expect(situation.text).toMatch(/saat membutuhkan botol minum aluminium/i);
    const offering = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-02"));
    expect(offering.text).toMatch(/menawarkan|pemakaian harian/i);
  });

  it("an offering-scoped product never 'provides itself'", () => {
    // D4's audited identity is the product itself; brand fit becomes fit for
    // an ordinary use of the category.
    const f = fixtureFacts("D4");
    const brandFit = v3SlotFallback(f, slot("NUAVE-BRAND-VALIDATION-01"));
    expect(brandFit.text).toMatch(/SegarBotol Tahan Panas 750/);
    expect(brandFit.text).toMatch(/cocok untuk/i);
    expect(brandFit.text).not.toMatch(
      /menyediakan|menawarkan|menjual.*SegarBotol/i,
    );
  });

  it("platform functionality is a provided feature, never an accepted order", () => {
    const f = fixtureFacts("D5");
    const offering = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-02"));
    expect(offering.text).toMatch(/menyediakan fitur/i);
    expect(offering.text).not.toMatch(/menerima pesanan|menerima order/i);
    const brandFit = v3SlotFallback(f, slot("NUAVE-BRAND-VALIDATION-01"));
    expect(brandFit.text).toMatch(/memiliki fitur/i);
  });

  it("regulated discovery consumes safetyRestrictions and keeps slot purposes", () => {
    const f = fixtureFacts("D7");
    const texts = AUDIT_MEASUREMENT_MATRIX.map((s) => v3SlotFallback(f, s));
    for (const [i, s] of AUDIT_MEASUREMENT_MATRIX.entries()) {
      expect(texts[i].text, `${s.id} missing`).toBeTruthy();
      expect(checkV3Text(texts[i].text!, s, f), `${s.id} issues`).toEqual([]);
    }
    // Administrative/public discovery only — no therapy suitability, no
    // clinical winner, no promised cure. The mechanical checks run on the
    // actual fallback strings.
    expect(texts[0].text).toMatch(/menerima pasien baru/i);
    for (const t of texts)
      expect(t.text).not.toMatch(/menyembuhkan|paling aman|terapi/i);
    // The regulated pack keeps the category noun throughout administrative
    // discovery — no bare "jasa"/"pilihan" that loses what is being sought.
    expect(texts[1].text).toMatch(/klinik gigi/i);
    expect(texts[2].text).toMatch(/klinik gigi/i);
    expect(texts[3].text).toMatch(/klinik gigi/i);
    // Slot 8 still tests explicit recommendation — not merely new-patient
    // acceptance.
    expect(texts[7].text).toMatch(/layak direkomendasikan/i);
    expect(texts[7].text).not.toMatch(/menerima pasien baru/i);
  });

  it("a reviewed override is still checked like any other text", () => {
    const unsafe = v3SlotFallback(
      facts,
      slot("NUAVE-BRAND-NEED-01"),
      "Apakah Kopi Sudut enak?",
    );
    expect(
      checkV3Text(unsafe.text!, slot("NUAVE-BRAND-NEED-01"), facts),
    ).toContain("identity_leakage");
  });

  it("fallbacks stay role/scope-aware across the development categories", () => {
    // Branch scope keeps the scoped identity in named slots — an inline
    // development envelope (the fresh H1–H4 envelopes are never rendered
    // here or anywhere in tests).
    const branchEnv = testFactsEnvelope();
    const confirmed = branchEnv.intake.confirmed as {
      scope: string;
      target: { name: string; detail: string } | null;
    };
    confirmed.scope = "cabang";
    confirmed.target = {
      name: "Kopi Sudut Bekasi",
      detail: "Jl. Raya Bekasi 1, Bekasi",
    };
    const branchFacts = parseQuestionFactsV3(branchEnv);
    if (branchFacts.status !== "projected")
      throw new Error("branch envelope should project");
    const branchNamed = v3SlotFallback(
      branchFacts.facts,
      slot("NUAVE-BRAND-VALIDATION-01"),
    );
    expect(branchNamed.text).toContain("Kopi Sudut Bekasi");

    const cases: [string, Record<string, RegExp>][] = [
      // Service with home visits.
      [
        "D1",
        {
          slot2: /AC|servis/i,
          slot4: /freon|perbaikan|perawatan|lokasi pelanggan/i,
          slot9: /Bengkel Dingin Sejahtera/,
        },
      ],
      // Product-scoped sparse facts — product role nouns, not venue/service.
      ["D8", { slot1: /merek|pilihan/i, slot9: /botol/i }],
      // Regulated discovery: pasien baru / layanan tersedia, never therapy fit.
      [
        "D7",
        {
          slot1: /pasien baru|dipertimbangkan|tersedia/i,
          named: /Klinik Gigi Senyum/,
        },
      ],
    ];
    for (const [inputId, expectations] of cases) {
      const f = fixtureFacts(inputId);
      const all = AUDIT_MEASUREMENT_MATRIX.map((s, i) => ({
        slot: s,
        fb: v3SlotFallback(f, s),
        i,
      }));
      for (const { slot: s, fb, i } of all) {
        expect(fb.text, `${inputId} slot ${s.id}`).toBeTruthy();
        expect(
          checkV3Text(fb.text!, s, f),
          `${inputId} slot ${s.id} issues`,
        ).toEqual([]);
        void i;
      }
      if (expectations.slot1)
        expect(all[0].fb.text).toMatch(expectations.slot1);
      if (expectations.slot2)
        expect(all[1].fb.text).toMatch(expectations.slot2);
      if (expectations.slot4)
        expect(all[3].fb.text).toMatch(expectations.slot4);
      if (expectations.slot9)
        expect(all[8].fb.text).toMatch(expectations.slot9);
      if (expectations.named)
        expect(all[6].fb.text).toMatch(expectations.named);
    }
  });

  it("D2 slot 3 asks one coherent delivery need — not a presence need joined with delivery", () => {
    // The confirmed delivery channel supports choosing a café for coffee
    // without visiting; slot 2 already covers working there, slot 4 the
    // concrete espresso offering. Slot 3 must be one need, not "mampir
    // atau bekerja" qualified by pesan antar.
    const f = fixtureFacts("D2");
    const needFit = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-01"));
    expect(
      checkV3Text(needFit.text!, slot("NUAVE-BRAND-SOLUTION-01"), f),
    ).toEqual([]);
    expect(needFit.text).toMatch(/pesan antar/i);
    expect(needFit.text).toMatch(/tidak bisa datang langsung/i);
    expect(needFit.text).not.toMatch(/mampir|bekerja|nugas/i);
    const occasion = v3SlotFallback(f, slot("NUAVE-BRAND-NEED-02"));
    const offering = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-02"));
    // Three distinct decisions: visiting to work, ordering remotely,
    // the concrete espresso offering.
    expect(new Set([occasion.text, needFit.text, offering.text]).size).toBe(3);
  });

  it("D6 slots 3 and 4 ask distinct decisions — explaining the task vs the concrete filing service", () => {
    // Slot 3 abstracts the supplied confusion into choosing a consultant
    // who explains the filing steps; slot 4 asks who offers the concrete
    // online SPT filing service. Public provider discovery only — no tax
    // advice, records, or service-quality claims.
    const f = fixtureFacts("D6");
    const needFit = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-01"));
    const offering = v3SlotFallback(f, slot("NUAVE-BRAND-SOLUTION-02"));
    expect(
      checkV3Text(needFit.text!, slot("NUAVE-BRAND-SOLUTION-01"), f),
    ).toEqual([]);
    expect(
      checkV3Text(offering.text!, slot("NUAVE-BRAND-SOLUTION-02"), f),
    ).toEqual([]);
    expect(needFit.text).toMatch(/memahami/i);
    expect(offering.text).toMatch(/melayani/i);
    expect(offering.text).toMatch(/online/i);
    expect(needFit.text).not.toBe(offering.text);
  });

  it("returns missing rather than inventing when facts cannot anchor a slot", () => {
    // No confirmed comparison target: the direct-comparison slot must report
    // missing, never a fabricated name.
    const noComparison = projectedFacts({
      comparators: { mode: "category-alternatives", names: [] },
    });
    const fb = v3SlotFallback(noComparison, slot("NUAVE-BRAND-ACTION-01"));
    // Either the category-level comparison name exists or the slot reports
    // missing — it must never return null-silent or an unidentifiable text.
    if (fb.text) {
      expect(
        checkV3Text(fb.text, slot("NUAVE-BRAND-ACTION-01"), noComparison),
      ).toEqual([]);
    } else {
      expect(fb.missing).toBe("comparison");
    }
  });
});

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
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
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
    // Unaffected slots keep their primary text exactly.
    expect(
      result.prompts.find((p) => p.slotId === "NUAVE-BRAND-NEED-02")!.origin,
    ).toBe("primary");
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
    expect(result.diagnostics.affectedSlots).toEqual(["NUAVE-BRAND-NEED-01"]);
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("repairs a genuine duplicate conflict locally with a minimal substitution", () => {
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Kedai kopi mana saja yang layak masuk shortlist nugas?",
        reserve: "Kedai kopi mana saja yang layak masuk shortlist nugas?",
      },
    });
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
    // Minimal repair: at most one slot moves off its primary.
    const offPrimary = result.prompts.filter((p) => p.origin !== "primary");
    expect(offPrimary.length).toBeLessThanOrEqual(1);
  });

  it("resolves a later named conflict by substituting the earlier slot's fallback (R6)", () => {
    // Slots 7/8 share one valid original that is also slot 8's own fallback
    // text. Forward-only resolution fails: slot 8 has no option left. The
    // bounded resolver substitutes slot 7's safe fallback instead, keeping
    // slot 8's text — and no unrelated unnamed slot is marked affected.
    const shared =
      "Apakah Kopi Sudut layak dipertimbangkan untuk Kedai kopi di Jakarta Selatan?";
    const slot7Fallback = v3SlotFallback(
      facts,
      slot("NUAVE-BRAND-VALIDATION-01"),
    ).text!;
    expect(slot7Fallback).not.toBe(shared);
    const response = richResponseOf(
      {},
      {
        "NUAVE-BRAND-VALIDATION-01": shared,
        "NUAVE-BRAND-VALIDATION-02": shared,
      },
    );
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const p7 = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-VALIDATION-01",
    )!;
    const p8 = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-VALIDATION-02",
    )!;
    // Only slot 7 moved — to its own fallback; slot 8 keeps the shared text.
    expect(p7.origin).toBe("slot_fallback");
    expect(p7.text).toBe(slot7Fallback);
    expect(p8.origin).toBe("primary");
    expect(p8.text).toBe(shared);
    // A named-only conflict marks no unnamed slot as affected.
    expect(result.diagnostics.affectedSlots).toEqual([]);
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
  });

  it("marks only the actual conflict participants as affected (R6)", () => {
    // Slots 1 and 5 share ALL valid options — every primary and reserve is
    // the same text. The infeasibility belongs to exactly those two slots;
    // unaffected slots keep their selected wording exactly.
    const duplicate = "Kedai kopi mana saja yang layak masuk shortlist nugas?";
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": { primary: duplicate, reserve: duplicate },
      "NUAVE-BRAND-COMPARISON-01": { primary: duplicate, reserve: duplicate },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-COMPARISON-01",
    ]);
    // One fallback option per affected slot resolves the conflict; the other
    // four unnamed slots keep their exact primary text.
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
    expect(
      result.prompts
        .filter((p) => p.order <= 6)
        .filter((p) => p.origin === "slot_fallback").length,
    ).toBe(1);
    expect(
      result.prompts.find((p) => p.slotId === "NUAVE-BRAND-SOLUTION-01")!.text,
    ).toBe("Untuk nugas nyaman, kedai kopi apa yang cocok?");
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("repairs a shared two-option cycle with the minimum necessary substitutions", () => {
    // Slots 1–3 each offer the same two individually valid alternatives
    // {A, B}; every other candidate is distinct. Two texts cannot fill three
    // slots, so at least one fallback is required — and one is sufficient.
    // Only the three participants may be marked affected.
    const A = "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?";
    const B = "Kedai kopi mana yang cocok untuk berkumpul di Jakarta Selatan?";
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": { primary: A, reserve: B },
      "NUAVE-BRAND-NEED-02": { primary: A, reserve: B },
      "NUAVE-BRAND-SOLUTION-01": { primary: A, reserve: B },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.pass).toBe("fallback_selection");
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-NEED-02",
      "NUAVE-BRAND-SOLUTION-01",
    ]);
    // Exactly one slot fallback repairs the cycle: the other two
    // participants keep real candidate texts A and B.
    const participants = result.prompts.filter((p) =>
      result.diagnostics.affectedSlots.includes(p.slotId),
    );
    const texts = participants.map((p) => p.text);
    expect(texts).toContain(A);
    expect(texts).toContain(B);
    expect(
      participants.filter((p) => p.origin === "slot_fallback"),
    ).toHaveLength(1);
    // Every unaffected slot keeps its selected text exactly.
    result.prompts
      .filter((p) => !result.diagnostics.affectedSlots.includes(p.slotId))
      .forEach((p) => expect(p.origin).toBe("primary"));
    // Two passes inside the approved bounds: ≤64 initial + one ≤729 pass.
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("repairs a conflict group and an independently invalid slot in the same second pass", () => {
    // Slots 1–3 form the shared {A, B} cycle while slot 4's primary and
    // reserve are both invalid. Detection must find both defect kinds in one
    // analysis — the early invalid slot must not hide the conflict group,
    // and one fallback per affected slot (two kinds, four slots) must
    // suffice without ever replacing the whole pack.
    const A = "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?";
    const B = "Kedai kopi mana yang cocok untuk berkumpul di Jakarta Selatan?";
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": { primary: A, reserve: B },
      "NUAVE-BRAND-NEED-02": { primary: A, reserve: B },
      "NUAVE-BRAND-SOLUTION-01": { primary: A, reserve: B },
      "NUAVE-BRAND-SOLUTION-02": {
        primary: "Kopi Sudut enak?",
        reserve: "Kopi Sudut nyaman?",
      },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.pass).toBe("fallback_selection");
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-NEED-02",
      "NUAVE-BRAND-SOLUTION-01",
      "NUAVE-BRAND-SOLUTION-02",
    ]);
    const affected = result.prompts.filter((p) =>
      result.diagnostics.affectedSlots.includes(p.slotId),
    );
    // Two substitutions: one for the three-slot cycle, one for the invalid
    // slot. The other two cycle participants keep A and B.
    expect(affected.filter((p) => p.origin === "slot_fallback")).toHaveLength(
      2,
    );
    // Bystanders never moved: the remaining slots keep their primaries.
    result.prompts
      .filter((p) => !result.diagnostics.affectedSlots.includes(p.slotId))
      .forEach((p) => expect(p.origin).toBe("primary"));
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("marks the right slots when an invalid slot precedes a later conflict", () => {
    // Slot 1 has only identity-invalid candidates; slots 5/6 share one
    // otherwise valid text. The invalid slot shifts every later option
    // out of the compact matching graph's numbering — detection must
    // still mark the true participants: slots 1/5/6, never bystanders.
    const shared = "Kedai kopi mana saja yang layak masuk shortlist nugas?";
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Kopi Sudut enak?",
        reserve: "Kopi Sudut nyaman?",
      },
      "NUAVE-BRAND-COMPARISON-01": { primary: shared, reserve: shared },
      "NUAVE-BRAND-COMPARISON-02": { primary: shared, reserve: shared },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.pass).toBe("fallback_selection");
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-COMPARISON-01",
      "NUAVE-BRAND-COMPARISON-02",
    ]);
    const affected = result.prompts.filter((p) =>
      result.diagnostics.affectedSlots.includes(p.slotId),
    );
    // Two substitutions: one for the invalid slot, one for the pair —
    // the other pair participant keeps the shared text.
    expect(affected.filter((p) => p.origin === "slot_fallback")).toHaveLength(
      2,
    );
    expect(affected.map((p) => p.text)).toContain(shared);
    // Every bystander keeps its exact primary text.
    result.prompts
      .filter((p) => !result.diagnostics.affectedSlots.includes(p.slotId))
      .forEach((p) => expect(p.origin).toBe("primary"));
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("marks the right slots when an invalid slot sits between conflict groups", () => {
    // Slots 1/2 share A, slot 3 is invalid, slots 4/5 share B — defect
    // kinds interleave across the whole pack, so compact graph indexes
    // diverge from option-list indexes in both directions.
    const A = "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?";
    const B = "Kedai kopi mana yang cocok untuk berkumpul di Jakarta Selatan?";
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": { primary: A, reserve: A },
      "NUAVE-BRAND-NEED-02": { primary: A, reserve: A },
      "NUAVE-BRAND-SOLUTION-01": {
        primary: "Kopi Sudut enak?",
        reserve: "Kopi Sudut nyaman?",
      },
      "NUAVE-BRAND-SOLUTION-02": { primary: B, reserve: B },
      "NUAVE-BRAND-COMPARISON-01": { primary: B, reserve: B },
    });
    const parsed = parseV3RichResponse(response);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = finalizeV3RichResponse(facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-NEED-02",
      "NUAVE-BRAND-SOLUTION-01",
      "NUAVE-BRAND-SOLUTION-02",
      "NUAVE-BRAND-COMPARISON-01",
    ]);
    const affected = result.prompts.filter((p) =>
      result.diagnostics.affectedSlots.includes(p.slotId),
    );
    // Three substitutions: one per conflict pair, one for the invalid
    // slot. Each pair keeps its shared text on the other participant.
    expect(affected.filter((p) => p.origin === "slot_fallback")).toHaveLength(
      3,
    );
    const texts = affected.map((p) => p.text);
    expect(texts).toContain(A);
    expect(texts).toContain(B);
    result.prompts
      .filter((p) => !result.diagnostics.affectedSlots.includes(p.slotId))
      .forEach((p) => expect(p.origin).toBe("primary"));
    expect(result.diagnostics.portfoliosEvaluated).toBeLessThanOrEqual(
      64 + 729,
    );
  });

  it("accepts a reviewed slot fallback without any contracted keyword", () => {
    // "Sarankan …" is a valid direct request that the retired keyword anchor
    // would have missed; the remaining checks are purely mechanical.
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Kopi Sudut enak?",
        reserve: "Kopi Sudut nyaman?",
      },
    });
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const result = finalizeV3RichResponse(facts, parsed.response, {
      reviewedSlotFallbacks: {
        "NUAVE-BRAND-NEED-01": "Sarankan tiga kedai kopi di Jakarta Selatan.",
      },
    });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const prompt = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-NEED-01",
    )!;
    expect(prompt.text).toBe("Sarankan tiga kedai kopi di Jakarta Selatan.");
    expect(prompt.origin).toBe("slot_fallback");
  });

  it("still rejects a reviewed fallback that fails mechanical checks", () => {
    const response = richResponseOf({
      "NUAVE-BRAND-NEED-01": {
        primary: "Kopi Sudut enak?",
        reserve: "Kopi Sudut nyaman?",
      },
    });
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const result = finalizeV3RichResponse(facts, parsed.response, {
      reviewedSlotFallbacks: {
        "NUAVE-BRAND-NEED-01": "Kopi Sudut enak?",
      },
    });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    // The reviewed text itself leaks the target identity — mechanical
    // rejection falls through to the built-in deterministic form.
    const prompt = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-NEED-01",
    )!;
    expect(prompt.text).not.toBe("Kopi Sudut enak?");
    expect(prompt.origin).toBe("slot_fallback");
  });

  it("keeps an already-framed occasion intact instead of doubling the marker", () => {
    const envelope = testFactsEnvelope();
    const occasion = "Saat bekerja dari kafe butuh suasana tenang";
    envelope.intake.confirmed.customerReasons = [occasion];
    const factsResult = parseQuestionFactsV3(envelope);
    if (factsResult.status !== "projected")
      throw new Error(`expected projected, got ${factsResult.status}`);
    const fallback = v3SlotFallback(
      factsResult.facts,
      slot("NUAVE-BRAND-NEED-02"),
    );
    expect(fallback.text).toContain(occasion);
    expect(fallback.text).not.toMatch(/saat\s+saat/i);
  });

  it("repairs an invalid named text locally — not by full pack replacement", () => {
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
    expect(result.diagnostics.pass).toBe("primary_selection");
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
  });

  it("keeps the 64/729 portfolio bounds", () => {
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
    // One fallback per affected slot — no recursive repair.
    expect(
      result.prompts
        .filter((p) => p.order <= 6)
        .every((p) => p.origin === "slot_fallback"),
    ).toBe(true);
  });

  it("returns temporarily-unavailable when even the deterministic pack cannot pass", () => {
    // A "?" inside the confirmed need makes the slot-2/3 fallback texts fail
    // the form check. The response's unnamed candidates are all invalid, so
    // selection exhausts into the shared full fallback — which itself cannot
    // produce a valid pack. The honest outcome is the established failure,
    // never a claimed usable pack.
    const envelope = testFactsEnvelope();
    envelope.intake.confirmed.customerReasons = ["kenapa tempat ini?"];
    const factsResult = parseQuestionFactsV3(envelope);
    if (factsResult.status !== "projected")
      throw new Error(`expected projected, got ${factsResult.status}`);
    const response = richResponseOf(
      Object.fromEntries(
        SLOT_IDS.slice(0, 6).map((id) => [
          id,
          { primary: "Apakah Kopi Sudut enak?", reserve: "Kopi Sudut mana?" },
        ]),
      ),
    );
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const result = finalizeV3RichResponse(factsResult.facts, parsed.response);
    expect(result.status).toBe("generation_temporarily_unavailable");
    if (result.status === "generation_temporarily_unavailable")
      expect(result.diagnostics.fullFallbackUsed).toBe(true);
  });

  it("returns the correction outcome when the confirmed facts cannot anchor safe fallbacks", () => {
    // The category itself carries the brand token; the projection strips it
    // from unnamed slot contexts, so no safe fallback text can be built.
    // That insufficiency is a correction outcome, not a fabricated text.
    const envelope = testFactsEnvelope();
    envelope.intake.confirmed.brand.name = "Sudut";
    envelope.intake.confirmed.category = "Sudut coffee";
    const factsResult = parseQuestionFactsV3(envelope);
    if (factsResult.status !== "projected")
      throw new Error(`expected projected, got ${factsResult.status}`);
    const response = richResponseOf(
      Object.fromEntries(
        SLOT_IDS.slice(0, 6).map((id) => [
          id,
          { primary: "Apakah Sudut enak?", reserve: "Sudut mana?" },
        ]),
      ),
    );
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    const result = finalizeV3RichResponse(factsResult.facts, parsed.response);
    expect(result.status).toBe("input_correction_required");
  });

  it("a market object that invents an unconfirmed role invalidates every candidate", () => {
    const envelope = testFactsEnvelope();
    // Strip the confirmed role: the market must say "unknown", not invent one.
    delete (envelope as { factsContext?: Record<string, unknown> })
      .factsContext;
    const factsResult = parseQuestionFactsV3(envelope);
    if (factsResult.status !== "projected")
      throw new Error(`expected projected, got ${factsResult.status}`);
    const response = richResponseOf();
    const parsed = parseV3RichResponse(response);
    if (!parsed.ok) throw new Error("fixture should parse");
    // The response asserts "venue" but the facts confirm none — grounding
    // fails for every candidate; recovery is by truthful slot fallback.
    const result = finalizeV3RichResponse(factsResult.facts, parsed.response);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(
      result.prompts
        .filter((p) => p.order <= 6)
        .every((p) => p.origin === "slot_fallback"),
    ).toBe(true);
  });
});

describe("P/M/C attribution (§8.1)", () => {
  const facts = projectedFacts();

  it("P ignores reserves and coverage; M and C use them", () => {
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

  it("repairs a duplicate named text the same way as rich", () => {
    const questions = [...SIMPLE_QUESTIONS];
    // Named text identical to unnamed text → conflict repaired locally.
    questions[6] = questions[0];
    const result = finalizeV3SimpleResponse(facts, { questions });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
  });

  it("resolves the shared named-original conflict by replacing only slot 7 (R6)", () => {
    // The same reproduction as the rich test, through the simple path: the
    // earlier named slot moves to its own fallback; slot 8 keeps the text.
    const shared =
      "Apakah Kopi Sudut layak dipertimbangkan untuk Kedai kopi di Jakarta Selatan?";
    const questions = [...SIMPLE_QUESTIONS];
    questions[6] = shared; // NUAVE-BRAND-VALIDATION-01
    questions[7] = shared; // NUAVE-BRAND-VALIDATION-02
    const result = finalizeV3SimpleResponse(facts, { questions });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    const p7 = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-VALIDATION-01",
    )!;
    const p8 = result.prompts.find(
      (p) => p.slotId === "NUAVE-BRAND-VALIDATION-02",
    )!;
    expect(p7.origin).toBe("slot_fallback");
    expect(p7.text).toBe(
      v3SlotFallback(facts, slot("NUAVE-BRAND-VALIDATION-01")).text,
    );
    expect(p8.origin).toBe("primary");
    expect(p8.text).toBe(shared);
    expect(result.diagnostics.affectedSlots).toEqual([]);
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
  });

  it("marks only true participants when a conflict and an invalid slot coincide", () => {
    // Slots 1–2 collide on one text while slot 4's single candidate is
    // invalid; slot 3's text is unrelated. Both defect kinds are found in
    // one pass, slot 3 is never marked, and each affected slot is repaired
    // by its own fallback — no full-pack replacement.
    const questions = [...SIMPLE_QUESTIONS];
    questions[0] =
      "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?";
    questions[1] =
      "Kedai kopi mana yang cocok untuk bekerja di Jakarta Selatan?";
    questions[3] = "Kopi Sudut enak?";
    const result = finalizeV3SimpleResponse(facts, { questions });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-NEED-02",
      "NUAVE-BRAND-SOLUTION-02",
    ]);
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    expect(result.prompts[2].text).toBe(SIMPLE_QUESTIONS[2]);
    expect(result.prompts[2].origin).toBe("primary");
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
  });

  it("marks the right slots when an invalid slot precedes a later conflict (simple)", () => {
    // Slot 1's only candidate is invalid; slots 5/6 share one otherwise
    // valid text. The shifted numbering must still resolve to slots
    // 1/5/6 — two substitutions, eight bystanders untouched.
    const shared = "Kedai kopi mana saja yang layak masuk shortlist nugas?";
    const questions = [...SIMPLE_QUESTIONS];
    questions[0] = "Kopi Sudut enak?";
    questions[4] = shared;
    questions[5] = shared;
    const result = finalizeV3SimpleResponse(facts, { questions });
    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.diagnostics.affectedSlots).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-COMPARISON-01",
      "NUAVE-BRAND-COMPARISON-02",
    ]);
    expect(result.diagnostics.fullFallbackUsed).toBe(false);
    const affected = result.prompts.filter((p) =>
      result.diagnostics.affectedSlots.includes(p.slotId),
    );
    expect(affected.filter((p) => p.origin === "slot_fallback")).toHaveLength(
      2,
    );
    expect(affected.map((p) => p.text)).toContain(shared);
    result.prompts
      .filter((p) => !result.diagnostics.affectedSlots.includes(p.slotId))
      .forEach((p) => expect(p.origin).toBe("primary"));
    const normalized = result.prompts.map((p) => p.text.toLowerCase());
    expect(new Set(normalized).size).toBe(10);
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

  it("provider failure → exactly one shared full-fallback pack, truthful origins", async () => {
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
      // Truthful: every origin is full_fallback — never a reported primary.
      expect(
        result.pack.prompts.every((p) => p.origin === "full_fallback"),
      ).toBe(true);
      expect(result.pack.diagnostics.fullFallbackUsed).toBe(true);
      expect(result.pack.diagnostics.pass).toBe("full_fallback");
      expect(result.pack.diagnostics.failedAttempts[0].stage).toBe("transport");
      expect(result.pack.diagnostics.serialization.serializationComplete).toBe(
        false,
      );
    }
  });

  it("structural failure → the same single shared full-fallback attempt", async () => {
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "rich",
      transport: async () => ({ broken: true }),
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.pack.diagnostics.failedAttempts[0].stage).toBe("parse");
      expect(
        result.pack.prompts.every((p) => p.origin === "full_fallback"),
      ).toBe(true);
      expect(result.pack.diagnostics.fullFallbackUsed).toBe(true);
    }
  });

  it("a truncating finish reason is preserved as a serialization failure", async () => {
    const result = await runV3Generation({
      factsInput: envelope,
      variant: "simple",
      transport: async () => ({
        value: { questions: SIMPLE_QUESTIONS },
        finishReason: "max_output_tokens",
      }),
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.pack.diagnostics.serialization).toEqual({
        responseReceived: true,
        serializationComplete: false,
        finishReason: "max_output_tokens",
      });
      expect(result.pack.diagnostics.failedAttempts[0].stage).toBe(
        "serialization",
      );
    }
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
      const s = measurementSlotForId(prompt.slotId)!;
      expect(prompt.measurementPurpose).toBe(s.measurementPurpose);
      expect(prompt.order).toBe(s.order);
    }
    // Provenance lists the supplied/permitted context per slot.
    expect(
      first.evidence.contextProvenance["NUAVE-BRAND-NEED-01"].permittedFields,
    ).toContain("category");
    // Writer hints stay separate from independent judgments.
    expect(
      first.evidence.writerHints["NUAVE-BRAND-NEED-01"].choice,
    ).toBeTruthy();
  });
});
