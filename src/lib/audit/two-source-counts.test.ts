import { describe, expect, it } from "vitest";
import {
  repairTwoSourceWriting,
  twoSourceWritingViolations,
  type TwoSourceReportFacts,
} from "./two-source-report";

// Spec 023 R-03 and AC-03, AC-08: the count checker reads a key finding's
// counts about a named group of questions against the questions it cites,
// and claims about another business against the answers that name it.
// Nothing that is false today becomes accepted.
//
// The fixture: ChatGPT named SOZO in 3 of 10 answers (q1 to q3); Google
// showed 6 summaries (q1 to q6) and named SOZO in none. q4 to q7 are the
// treatment questions. ERHA is named in 7 ChatGPT answers (q1 to q7) and in
// no Google summary; ZAP in 2 Google summaries (q1, q2) and no ChatGPT answer.
const ids = Array.from({ length: 10 }, (_, i) => `q${i + 1}`);
const facts: TwoSourceReportFacts = {
  subject: "klinik",
  names: ["SOZO Skin Clinic", "SOZO"],
  counts: {
    chatgpt: { completed: 10, named: 3 },
    google: { completed: 10, summaries: 6, named: 0 },
  },
  google: ids.map((prompt_id, i) => ({
    prompt_id,
    outcome: i < 6 ? "summary" : "not_shown",
    business_named: i < 6 ? false : null,
    cited_domains: [],
  })),
  writer: {
    questions: ids.map((prompt_id, i) => ({
      prompt_id,
      ordinal: i + 1,
      topic: null,
      volume: null,
      named: {
        chatgpt: i < 3 ? "named" : "absent",
        google: i < 6 ? "absent" : null,
      },
      google_text: "",
      businesses: {
        chatgpt: i < 7 ? ["ERHA"] : [],
        google: i < 2 ? ["ZAP"] : [],
      },
    })),
    businesses: ["ERHA", "ZAP"],
  },
};
const treatment = ["q4", "q5", "q6", "q7"];
const verdict = "SOZO dikenal ChatGPT sebagai jaringan klinik.";
const conclusion =
  "ChatGPT dan Google belum mengaitkan SOZO dengan treatment. Mulailah dari halaman treatment.";

function withFinding(
  explanation: string,
  evidence = treatment,
  title = "ChatGPT belum mengaitkan treatment dengan SOZO",
) {
  return {
    conclusion,
    key_findings: [
      { title, explanation, evidence_prompt_ids: evidence },
      {
        title: "ChatGPT mengenal SOZO di kota",
        explanation: "ChatGPT menyebut SOZO saat pertanyaan menyebut kota.",
        evidence_prompt_ids: ["q1", "q2", "q3"],
      },
    ],
    two_source_writing: { verdict },
  };
}

const violations = (content: ReturnType<typeof withFinding>) =>
  twoSourceWritingViolations(content, facts);

describe("Spec 023 R-03: counts about a named group of questions", () => {
  it("passes a true count or 'semua' about the finding's own treatment questions, and the repair keeps it", () => {
    for (const sentence of [
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan treatment.",
      "ChatGPT tidak menyebut SOZO di semua pertanyaan treatment.",
    ]) {
      const content = withFinding(sentence);
      expect(violations(content)).toEqual([]);
      const repaired = repairTwoSourceWriting(content, facts);
      expect(repaired.content.key_findings[0]!.explanation).toBe(sentence);
      expect(repaired.sentencesDropped).toBe(0);
    }
  });

  it("catches a false count about the group and drops it after the revision", () => {
    const content = withFinding(
      "Pola ini jelas. ChatGPT tidak menyebut SOZO di 3 dari 4 pertanyaan treatment.",
    );
    expect(violations(content).join(" ")).toMatch(
      /is not true for the questions it counts/,
    );
    const repaired = repairTwoSourceWriting(content, facts);
    expect(repaired.content.key_findings[0]!.explanation).toBe(
      "Pola ini jelas.",
    );
    expect(repaired.sentencesDropped).toBe(1);
  });

  it("keeps whole-test claims source-wide, as today", () => {
    for (const sentence of [
      "Tidak satu pun jawaban ChatGPT menyebut SOZO.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan yang diuji.",
      "ChatGPT tidak menyebut SOZO di semua pertanyaan yang ditanyakan.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan audit ini.",
    ]) {
      const content = withFinding(sentence);
      expect(violations(content).join(" "), sentence).toMatch(
        /contradicts the counts: ChatGPT named the business in 3 of 10/,
      );
      // Replaced by the count sentence, never silently accepted.
      const repaired = repairTwoSourceWriting(content, facts);
      expect(repaired.content.key_findings[0]!.explanation).toContain(
        "disebut di 3 dari 10 jawaban",
      );
    }
  });

  it("sets a group's own words aside before reading whether the sentence says named", () => {
    // q1 to q3 name SOZO: 3 of the 4 cited questions.
    const content = withFinding(
      "SOZO muncul di 3 dari 4 jawaban yang tidak menyebut kota.",
      ["q1", "q2", "q3", "q4"],
    );
    expect(violations(content)).toEqual([]);
    // A qualifier that names the owner is the claim itself, read as today.
    const claim = withFinding(
      "ChatGPT menulis 9 dari 10 jawaban yang tidak menyebut SOZO.",
      ids,
    );
    expect(violations(claim).join(" ")).toMatch(/contradicts the counts/);
  });

  it("drops a finding a false sentence empties while another remains, and repairs the last one instead", () => {
    const content = withFinding(
      "Treatment belum mengarah ke SOZO.",
      treatment,
      "ChatGPT menyebut SOZO di 2 dari 4 pertanyaan treatment",
    );
    const repaired = repairTwoSourceWriting(content, facts);
    expect(repaired.findingsDropped).toBe(1);
    expect(repaired.content.key_findings).toHaveLength(1);
    expect(repaired.content.key_findings[0]!.title).toBe(
      "ChatGPT mengenal SOZO di kota",
    );
    const alone = {
      ...content,
      key_findings: [content.key_findings[0]!],
    };
    const last = repairTwoSourceWriting(alone, facts);
    expect(last.findingsDropped).toBe(0);
    expect(last.content.key_findings).toHaveLength(1);
    expect(last.content.key_findings[0]!.title).toContain(
      "disebut di 3 dari 10 jawaban",
    );
  });
});

describe("Spec 023 R-03: claims about another business", () => {
  it("passes ERHA's true count, also in the verdict, and catches a false one", () => {
    const right = "ChatGPT menyebut ERHA di 7 dari 10 jawaban.";
    expect(violations(withFinding(right, ids))).toEqual([]);
    expect(
      violations({
        ...withFinding(
          "ChatGPT tidak menyebut SOZO di semua pertanyaan treatment.",
        ),
        two_source_writing: { verdict: right },
      }),
    ).toEqual([]);
    const wrong = withFinding(
      "ChatGPT menyebut ERHA di 9 dari 10 jawaban. ChatGPT tidak menyebut SOZO di semua pertanyaan treatment.",
      treatment,
    );
    expect(violations(wrong).join(" ")).toMatch(/the business it names/);
    // Dropped, never replaced with SOZO's count sentence.
    const repaired = repairTwoSourceWriting(wrong, facts);
    expect(repaired.content.key_findings[0]!.explanation).toBe(
      "ChatGPT tidak menyebut SOZO di semua pertanyaan treatment.",
    );
    expect(JSON.stringify(repaired.content)).not.toContain(
      "disebut di 3 dari 10",
    );
  });

  it("catches an absolute negative when ERHA was named, and a positive when the source never named it", () => {
    expect(
      violations(withFinding("ChatGPT tidak pernah menyebut ERHA.", ids)).join(
        " ",
      ),
    ).toMatch(/the business it names/);
    expect(
      violations(
        withFinding("Google menyebut ERHA di ringkasannya.", ids),
      ).join(" "),
    ).toMatch(/the business it names/);
    expect(violations(withFinding("Google tidak menyebut ERHA.", ids))).toEqual(
      [],
    );
  });
});

describe("Spec 023 R-03: nothing false today becomes accepted", () => {
  const caught = (sentence: string, evidence: string[] = ids) =>
    expect(
      violations(withFinding(sentence, evidence)).join(" "),
      sentence,
    ).toMatch(/contradicts|is not true/);

  it("never takes a negation, a verb or a business after 'jawaban' as a group", () => {
    for (const sentence of [
      "Jawaban tidak menyebut SOZO.",
      "Jawaban yang diberikan ChatGPT tidak menyebut SOZO.",
      "Jawaban yang muncul tidak menyebut SOZO.",
      "Tidak ada jawaban yang menyebut klinik ini.",
    ])
      caught(sentence);
    caught(
      "Semua jawaban yang diberikan ChatGPT tidak menyebut SOZO.",
      treatment,
    );
    caught(
      "Tidak ada jawaban yang menyebut ZAP di 4 dari 4 pertanyaan yang diajukan.",
      ["q1", "q2", "q3", "q4"],
    );
  });

  it("checks a clause about the owner and another business for the owner (AC-03)", () => {
    for (const sentence of [
      "ChatGPT tidak pernah menyebut klinik ini maupun ZAP.",
      "ChatGPT tidak menyebut Anda atau ZAP.",
      "Google AI Overview menyebut klinik ini dan ZAP.",
      "Google AI Overview menyebut Anda dan ZAP.",
      "ChatGPT menyebut ERHA dan klinik ini di 7 dari 10 jawaban.",
    ])
      caught(sentence);
    // In a group, each business must hold: ERHA was named in all four.
    caught(
      "ChatGPT belum pernah menyebut ERHA dan klinik ini di 4 dari 4 pertanyaan treatment.",
      treatment,
    );
  });

  it("reads other words for the whole test as the whole test", () => {
    for (const sentence of [
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan yang diajukan.",
      "ChatGPT tidak menyebut SOZO di 7 dari 7 pertanyaan yang kami ajukan.",
      "ChatGPT tidak menyebut SOZO di semua pertanyaan pengujian.",
      "ChatGPT tidak menyebut SOZO di semua pertanyaan sampel.",
    ])
      caught(sentence, treatment);
  });

  it("needs a 'not named' claim with no source to hold for each source", () => {
    caught("Semua jawaban treatment tidak menyebut SOZO.", [
      "q1",
      "q2",
      "q3",
      "q4",
    ]);
  });
});

describe("Spec 023 AC-08: the brand name", () => {
  it("checks a sentence that names the business by its exact name like 'klinik Anda'", () => {
    const content = withFinding("SOZO tidak disebut ChatGPT sama sekali.", ids);
    expect(violations(content).join(" ")).toMatch(
      /contradicts the counts: ChatGPT named the business in 3 of 10/,
    );
  });

  it("still checks a short form that is not an alias as being about the owner", () => {
    const content = withFinding("Sozo-SC tidak disebut ChatGPT.", ids);
    expect(violations(content).join(" ")).toMatch(/contradicts the counts/);
  });
});
