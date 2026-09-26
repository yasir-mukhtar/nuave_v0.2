import { describe, expect, it } from "vitest";
import { fixtureProtectedObservation } from "./fixtures/protected-observation";
import { countWords } from "./report-language";
import {
  isExactCodeOwnedNonCorrectiveAction,
  selectCodeOwnedNonCorrectiveAction,
} from "./report-noncorrective";
import type { AuditObservation, AuditPrompt, ReportContent } from "./types";

const IDS = Array.from(
  { length: 10 },
  (_, index) => `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
);

function prompt(promptId: string): AuditPrompt {
  return {
    prompt_id: promptId,
    category: "unassigned",
    role: "",
    branded: false,
    question: `Pertanyaan uji ${promptId}?`,
    rationale: "",
    inputs_used: [],
    review_status: "needs_human_review",
  };
}

function observation(
  promptId: string,
  overrides: Partial<AuditObservation> = {},
): AuditObservation {
  return fixtureProtectedObservation(prompt(promptId), {
    raw_answer: `Kopi Nuave disebut dalam jawaban ${promptId}.`,
    ...overrides,
  });
}

function detail(
  promptId: string,
  overrides: Partial<ReportContent["details"][number]> = {},
): ReportContent["details"][number] {
  return {
    prompt_id: promptId,
    run: "completed",
    appearance: "mentioned",
    recommendation: "not_assessed",
    comparison: "not_observed",
    information: "not_assessed",
    finding: "Jawaban ini menyebut bisnis.",
    answer_excerpt: `Kopi Nuave disebut dalam jawaban ${promptId}.`,
    evidence_note: "Kutipan berasal dari jawaban yang tersimpan.",
    source_urls: [],
    ...overrides,
  };
}

function contentWith(
  details: ReportContent["details"],
  priorities: ReportContent["priorities"] = [],
): ReportContent {
  return {
    conclusion: "Ringkasan uji coba.",
    accuracy_status: "could_not_assess",
    observed_competitors: [],
    key_findings: [
      {
        title: "Bisnis disebut",
        explanation: "Satu jawaban menyebut bisnis secara eksplisit.",
        evidence_prompt_ids: [details[0].prompt_id],
      },
    ],
    priorities,
    details,
  };
}

/** Eligibility without a model: details describe every retained answer as a
 * plain mention — no gap, no recommendation, no assessed information. */
function allMentionedFixture() {
  const observations = IDS.map((id) => observation(id));
  const details = IDS.map((id) => detail(id));
  return { observations, content: contentWith(details) };
}

const selectorInput = (fixture: {
  observations: AuditObservation[];
  content: ReportContent;
}) => ({
  content: fixture.content,
  observations: fixture.observations,
  questionMethod: "direct-ten" as const,
});

describe("selectCodeOwnedNonCorrectiveAction (Spec 012 R-13)", () => {
  it("builds the exact preservation candidate for the earliest eligible ordinal", () => {
    const fixture = allMentionedFixture();
    fixture.content.details[2].recommendation = "recommended";
    fixture.content.details[4].recommendation = "recommended";

    const action = selectCodeOwnedNonCorrectiveAction(selectorInput(fixture));

    expect(action).toEqual({
      order: 1,
      timing: "do_next",
      action:
        "Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan 3.",
      why: "Jawaban ini merekomendasikan brand Anda. Pemeriksaan membantu Anda mempertahankan informasi yang benar tanpa menganggap semua informasi sudah lengkap.",
      basis: "Rekomendasi terlihat pada jawaban pertanyaan 3.",
      owner: "business_owner",
      done_when:
        "Informasi tentang brand dalam jawaban sudah diperiksa pada sumber resmi; fakta yang sesuai dan perlu dikonfirmasi dicatat.",
      evidence_prompt_ids: ["NUAVE-DT-03"],
      caveat:
        "Rekomendasi ini hanya tercatat pada pengujian tersebut dan bukan jaminan hasil berikutnya.",
    });
  });

  it("builds the exact verification candidate when only unassessed information is eligible", () => {
    const fixture = allMentionedFixture();
    const action = selectCodeOwnedNonCorrectiveAction(selectorInput(fixture));

    expect(action).toEqual({
      order: 1,
      timing: "do_next",
      action:
        "Pemeriksaan lanjutan: cocokkan informasi tentang brand dalam jawaban pertanyaan 1 dengan sumber resmi Anda.",
      why: "Jawaban ini menyebut brand Anda, tetapi kebenaran informasinya belum dinilai.",
      basis:
        "Penilaian informasi pada pertanyaan 1: Tidak dinilai dari jawaban yang tersedia.",
      owner: "business_owner",
      done_when:
        "Setiap informasi tentang brand dalam jawaban ditandai sesuai, perlu konfirmasi, atau tidak tercantum pada sumber resmi.",
      evidence_prompt_ids: ["NUAVE-DT-01"],
      caveat: "Informasi yang belum dinilai bukan berarti salah atau hilang.",
    });
  });

  it("prefers preservation over verification before ordinal order", () => {
    const fixture = allMentionedFixture();
    // V-eligible on 1, P-eligible only on 7 — P still wins.
    fixture.content.details[6].recommendation = "recommended";
    const action = selectCodeOwnedNonCorrectiveAction(selectorInput(fixture));
    expect(action?.evidence_prompt_ids).toEqual(["NUAVE-DT-07"]);
    expect(action?.action).toContain("Pemeliharaan:");
  });

  it("is ineligible when evidence carries an observed gap, failed run, or no mention", () => {
    const fixture = allMentionedFixture();
    fixture.content.details.forEach((item) => {
      item.information = "incomplete";
    });
    expect(
      selectCodeOwnedNonCorrectiveAction(selectorInput(fixture)),
    ).toBeNull();

    const failed = allMentionedFixture();
    failed.observations = failed.observations.map((item) =>
      observation(item.prompt_id, { run_status: "failed" }),
    );
    failed.content.details = failed.content.details.map((item) => ({
      ...item,
      run: "failed" as const,
      appearance: "not_assessed" as const,
    }));
    expect(
      selectCodeOwnedNonCorrectiveAction(selectorInput(failed)),
    ).toBeNull();

    const absent = allMentionedFixture();
    absent.content.details = absent.content.details.map((item) => ({
      ...item,
      appearance: "absent" as const,
    }));
    expect(
      selectCodeOwnedNonCorrectiveAction(selectorInput(absent)),
    ).toBeNull();
  });

  it("never appends beside a surviving corrective action or outside direct-ten", () => {
    const fixture = allMentionedFixture();
    fixture.content.priorities = [
      {
        order: 1,
        timing: "do_next",
        action: "Perbaiki informasi jam operasional pada sumber resmi.",
        why: "Satu jawaban menunjukkan informasi yang belum lengkap.",
        basis: "Jawaban pertanyaan 1 menunjukkan celah informasi.",
        owner: "business_owner",
        done_when: "Sumber resmi menampilkan jam operasional terbaru.",
        evidence_prompt_ids: ["NUAVE-DT-01"],
        caveat: "Hasil terbatas pada pengujian ini.",
      },
    ];
    expect(
      selectCodeOwnedNonCorrectiveAction(selectorInput(fixture)),
    ).toBeNull();
    expect(
      selectCodeOwnedNonCorrectiveAction({
        ...selectorInput(allMentionedFixture()),
        questionMethod: "canonical",
      }),
    ).toBeNull();
  });
});

describe("isExactCodeOwnedNonCorrectiveAction (Spec 012 R-13/AC-15)", () => {
  it("accepts only the recomputed eligible object, allowing display renumbering", () => {
    const fixture = allMentionedFixture();
    fixture.content.details[0].recommendation = "recommended";
    const input = selectorInput(fixture);
    const candidate = selectCodeOwnedNonCorrectiveAction(input)!;

    const insertedContent = contentWith(fixture.content.details, [candidate]);
    expect(
      isExactCodeOwnedNonCorrectiveAction(candidate, {
        content: insertedContent,
        observations: fixture.observations,
        questionMethod: "direct-ten",
      }),
    ).toBe(true);
    expect(
      isExactCodeOwnedNonCorrectiveAction(
        { ...candidate, order: 1 },
        {
          content: insertedContent,
          observations: fixture.observations,
          questionMethod: "direct-ten",
        },
      ),
    ).toBe(true);
  });

  it("rejects edited fields, forged tags, missing keys, and foreign evidence", () => {
    const fixture = allMentionedFixture();
    fixture.content.details[0].recommendation = "recommended";
    fixture.content.details[1].recommendation = "recommended";
    const input = selectorInput(fixture);
    const candidate = selectCodeOwnedNonCorrectiveAction(input)!;
    const check = (priority: unknown) =>
      isExactCodeOwnedNonCorrectiveAction(
        priority as ReportContent["priorities"][number],
        input,
      );

    expect(check({ ...candidate, action: `${candidate.action} Ubah.` })).toBe(
      false,
    );
    expect(check({ ...candidate, evidence_prompt_ids: ["NUAVE-DT-02"] })).toBe(
      false,
    );
    expect(check({ ...candidate, evidence_prompt_ids: ["NUAVE-XX-99"] })).toBe(
      false,
    );
    expect(check({ ...candidate, template: "P" })).toBe(false);
    expect(check({ ...candidate, caveat: "Dicetak ulang." })).toBe(false);
    const { caveat: _omitted, ...missingField } = candidate;
    expect(check(missingField)).toBe(false);
    expect(check({ ...candidate, owner: "admin" })).toBe(false);
  });

  it("keeps every template sentence inside the unchanged 25-word ceiling", () => {
    const fixture = allMentionedFixture();
    fixture.content.details[2].recommendation = "recommended";
    const preservation = selectCodeOwnedNonCorrectiveAction(
      selectorInput(fixture),
    )!;
    const verification = selectCodeOwnedNonCorrectiveAction(
      selectorInput(allMentionedFixture()),
    )!;
    for (const action of [preservation, verification]) {
      for (const field of [
        action.action,
        action.why,
        action.basis,
        action.done_when,
        action.caveat,
      ]) {
        for (const sentence of field.split(/(?<=\.)\s+/)) {
          expect(countWords(sentence)).toBeLessThanOrEqual(25);
        }
      }
    }
  });
});
