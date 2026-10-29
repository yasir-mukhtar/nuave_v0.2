import { describe, expect, it } from "vitest";
import { partBWritingViolations } from "./two-source-writing";
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
      "ChatGPT tidak menyebut klinik maupun ZAP.",
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
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan pasien.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan pelanggan.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 jawaban asli.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan tentang klinik.",
      "ChatGPT tidak menyebut SOZO dalam 4 pertanyaan tentang klinik.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan tentang klinik terdekat.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan tentang klinik di sini.",
      "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan tentang klinik di kota ini.",
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

describe("Spec 023 R-03: groups that mention 'klinik', and the guide's model sentences", () => {
  const city = ["q1", "q2", "q3", "q8", "q9", "q10"];
  const contradiction = (content: ReturnType<typeof withFinding>) =>
    violations(content).filter((v) => /contradicts|is not true/.test(v));

  it("reads 'pertanyaan tentang klinik di [kota]' as a group, and 'tentang klinik ini' as the owner", () => {
    expect(
      contradiction(
        withFinding(
          "ChatGPT menyebut SOZO di 3 dari 6 jawaban tentang klinik di Batam.",
          city,
        ),
      ),
    ).toEqual([]);
    expect(
      contradiction(
        withFinding(
          "ChatGPT menyebut SOZO di 4 dari 6 jawaban tentang klinik di Batam.",
          city,
        ),
      ).join(" "),
    ).toMatch(/is not true for the questions it counts/);
    expect(
      contradiction(
        withFinding(
          "ChatGPT tidak menyebut SOZO di 6 dari 6 jawaban tentang klinik ini.",
          ["q4", "q5", "q6", "q7", "q8", "q9"],
        ),
      ).join(" "),
    ).toMatch(/contradicts the counts/);
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

// The founder's fourth guide (2026-10-29) and its practice material: six
// general questions (q1 to q6; ChatGPT names Aruna in q1 to q3) and four
// about bekas jerawat (q7 to q10; ChatGPT names Klinik Seruni in each).
// Google shows a summary for q1 to q6, none naming Aruna.
describe("Spec 023: the founder's guide, read by the checker", () => {
  const gIds = Array.from({ length: 10 }, (_, i) => `q${i + 1}`);
  const bekas = gIds.slice(6);
  const guideFacts = (
    named = 3,
    seruni = 4,
    googleNamed = 0,
  ): TwoSourceReportFacts => ({
    subject: "klinik",
    names: ["Klinik Aruna", "Aruna"],
    counts: {
      chatgpt: { completed: 10, named },
      google: { completed: 10, summaries: 6, named: googleNamed },
    },
    google: gIds.map((prompt_id, i) => ({
      prompt_id,
      outcome: i < 6 ? "summary" : "not_shown",
      business_named: i < 6 ? i < googleNamed : null,
      cited_domains: [],
    })),
    writer: {
      questions: gIds.map((prompt_id, i) => ({
        prompt_id,
        ordinal: i + 1,
        topic: null,
        volume: null,
        named: {
          chatgpt: i < named ? "named" : "absent",
          google: i < 6 ? (i < googleNamed ? "named" : "absent") : null,
        },
        google_text: "",
        businesses: {
          chatgpt: i >= 6 && i - 6 < seruni ? ["Klinik Seruni"] : [],
          google: [],
        },
      })),
      businesses: ["Klinik Seruni"],
    },
  });
  const report = {
    conclusion:
      "Mulai dari informasi yang bisa diperiksa di halaman bekas jerawat. Sesudah pembaruan selesai, ulangi pengujian dengan pertanyaan dan cara yang sama untuk melihat apakah jawabannya berbeda.",
    key_findings: [
      {
        title: "Untuk bekas jerawat, empat jawaban ChatGPT menyebut Seruni",
        explanation:
          "Pertanyaan “Di mana saya bisa konsultasi bekas jerawat di Depok?” mendapat jawaban: “Untuk konsultasi bekas jerawat di Depok, Klinik Seruni bisa menjadi pilihan.” Tiga jawaban ChatGPT lain tentang topik yang sama juga menyebut Seruni. Aruna tidak disebut dalam keempat jawaban itu. Hasilnya berbeda pada pertanyaan umum tentang klinik di Depok. Di kelompok enam pertanyaan ini, ChatGPT menyebut Aruna dalam tiga jawaban.",
        evidence_prompt_ids: gIds,
      },
      {
        title: "Enam ringkasan Google AI Overview tidak menyebut Aruna",
        explanation:
          "Google AI Overview tampil untuk enam dari sepuluh pertanyaan yang diuji. Tidak satu pun dari enam ringkasan itu menyebut Aruna. Pada empat pertanyaan lainnya, ringkasan tidak tampil.",
        evidence_prompt_ids: gIds,
      },
    ],
    two_source_writing: {
      verdict:
        "ChatGPT menyebut Aruna dalam tiga jawaban untuk pertanyaan umum, tidak satu pun tentang bekas jerawat. Aruna juga tidak disebut dalam 6 ringkasan Google AI Overview yang tampil.",
    },
  };
  const contradictions = (
    content: typeof report,
    facts: TwoSourceReportFacts,
  ) =>
    twoSourceWritingViolations(content, facts).filter((v) =>
      /contradicts|is not true/.test(v),
    );

  it("passes the model report when it is true, and catches it when it is not", () => {
    expect(twoSourceWritingViolations(report, guideFacts())).toEqual([]);
    // The model verdict stays within its own limits with long real names.
    const verdict = report.two_source_writing.verdict
      .replaceAll("Aruna", "Aruna Skin Clinic")
      .replace("Depok", "Surabaya");
    expect(
      partBWritingViolations({
        conclusion: "",
        key_findings: [],
        priorities: [],
        details: [],
        two_source_writing: {
          verdict,
          plan: [],
          topic_names: [],
          competitor_reasons: [],
          takeaways: [],
          google_readings: [],
        },
      } as never),
    ).toEqual([]);
    expect(contradictions(report, guideFacts(0)).length).toBeGreaterThan(0);
    expect(contradictions(report, guideFacts(5)).length).toBeGreaterThan(0);
  });

  it("reads a limit that opens the sentence like one after the verb", () => {
    const finding = (explanation: string, ids: string[]) => ({
      ...report,
      key_findings: [
        { title: "ChatGPT", explanation, evidence_prompt_ids: ids },
      ],
    });
    const opening =
      "Dalam empat jawaban tentang bekas jerawat, ChatGPT tidak menyebut Aruna.";
    expect(contradictions(finding(opening, bekas), guideFacts())).toEqual([]);
    // Aruna was named in q1 to q3: four cited questions, one not naming it.
    expect(
      contradictions(finding(opening, ["q1", "q2", "q3", "q7"]), guideFacts()),
    ).not.toEqual([]);
    // An opening that does not limit stays a claim about the whole test.
    expect(
      contradictions(
        finding(
          "Saat ditanya soal bekas jerawat, ChatGPT tidak menyebut Aruna.",
          bekas,
        ),
        guideFacts(),
      ),
    ).not.toEqual([]);
  });

  it("reads a short competitor name, and 'ringkasan' as Google only alone", () => {
    const finding = (explanation: string) => ({
      ...report,
      key_findings: [
        {
          title: "ChatGPT menyebut Klinik Seruni",
          explanation,
          evidence_prompt_ids: bekas,
        },
      ],
    });
    expect(
      contradictions(
        finding(
          "ChatGPT menyebut Seruni di 4 dari 4 jawaban tentang bekas jerawat.",
        ),
        guideFacts(),
      ),
    ).toEqual([]);
    expect(
      contradictions(
        finding(
          "ChatGPT menyebut Seruni di 4 dari 4 jawaban tentang bekas jerawat.",
        ),
        guideFacts(3, 2),
      ),
    ).not.toEqual([]);
    // "ringkasan" beside "ChatGPT" does not make the claim about Google.
    expect(
      contradictions(
        finding("ChatGPT menyebut Seruni di 2 dari 6 ringkasan."),
        guideFacts(),
      ),
    ).not.toEqual([]);
  });

  it("asks a source of a conclusion only when it makes a claim about naming", () => {
    expect(twoSourceWritingViolations(report, guideFacts())).toEqual([]);
    expect(
      twoSourceWritingViolations(
        {
          ...report,
          conclusion:
            "Aruna tidak disebut. Mulailah dari halaman bekas jerawat.",
        },
        guideFacts(),
      ).join(" "),
    ).toMatch(/The conclusion must say which source/);
  });

  it("never lets a generic opening, an 'all' ordinal or a loose 'ringkasan' excuse a false claim (review round 7)", () => {
    const asVerdict = (verdict: string, facts = guideFacts()) =>
      contradictions({ ...report, two_source_writing: { verdict } }, facts);
    const asFinding = (explanation: string, facts = guideFacts()) =>
      contradictions(
        {
          ...report,
          key_findings: [
            { title: "Temuan", explanation, evidence_prompt_ids: gIds },
          ],
        },
        facts,
      );
    for (const sentence of [
      "Ketika audit ini dijalankan, ChatGPT tidak menyebut Aruna.",
      "Saat calon pasien bertanya, ChatGPT tidak menyebut Aruna.",
      "Sebagai klinik di Depok, Aruna tidak disebut ChatGPT.",
      "Pada pencarian klinik, ChatGPT tidak menyebut Aruna.",
      "Untuk pertanyaan di Depok, ChatGPT tidak menyebut Aruna.",
      "Keduanya tidak menyebut Aruna.",
      "ChatGPT dan Google AI Overview, keduanya tidak menyebut Aruna.",
      "ChatGPT tidak menyebut Aruna dalam kesepuluh jawaban itu.",
      "Ringkasan hasil: Aruna tidak disebut dalam jawaban yang diuji.",
      "Ringkasan jawabannya tidak menyebut Aruna.",
    ]) {
      expect(asVerdict(sentence), sentence).not.toEqual([]);
      expect(asFinding(sentence), sentence).not.toEqual([]);
    }
    const google2 = guideFacts(3, 4, 2);
    expect(
      asVerdict(
        "Google AI Overview tidak menyebut Aruna dalam keenam ringkasan itu.",
        google2,
      ),
    ).not.toEqual([]);
    // A true group-size opening with its own count stays true.
    expect(
      asFinding(
        "Pada enam pertanyaan umum tentang klinik di Depok, ChatGPT menyebut Aruna dalam tiga jawaban.",
      ),
    ).toEqual([]);
  });

  it("does not read a common word as a competitor's short name", () => {
    const facts = guideFacts(3);
    facts.writer!.businesses.push("Rumah Sakit Umum Daerah Depok");
    const titled = (title: string, f = facts) =>
      contradictions(
        {
          ...report,
          key_findings: [
            {
              title,
              explanation: "ChatGPT menjawab pertanyaan ini.",
              evidence_prompt_ids: gIds,
            },
          ],
        },
        f,
      );
    expect(titled("Tidak muncul di ChatGPT secara umum")).not.toEqual([]);
  });

  it("asks a source of a conclusion for any claim about naming, not for a page detail", () => {
    const needs = (conclusion: string) =>
      twoSourceWritingViolations({ ...report, conclusion }, guideFacts()).some(
        (v) => /The conclusion must say which source/.test(v),
      );
    for (const conclusion of [
      "Aruna direkomendasikan dalam dua jawaban, Seruni dalam empat.",
      "Situs Aruna dikutip, tetapi namanya tidak tercantum dalam jawaban.",
      "Aruna hadir dalam 3 jawaban.",
      "AI menyarankan Seruni, bukan Aruna.",
    ])
      expect(needs(conclusion), conclusion).toBe(true);
    expect(
      needs(
        "Nama dokter tidak ditemukan pada halaman yang diperiksa. Lengkapi halaman itu lebih dulu.",
      ),
    ).toBe(false);
  });

  it("reads a short competitor name only after its full name, never a city alone (review round 8)", () => {
    const facts = guideFacts(0);
    facts.writer!.businesses.push("Klinik Kecantikan Depok");
    facts.writer!.questions[6]!.businesses.chatgpt.push(
      "Klinik Kecantikan Depok",
    );
    const titled = (title: string, explanation: string) =>
      contradictions(
        {
          ...report,
          key_findings: [{ title, explanation, evidence_prompt_ids: gIds }],
          two_source_writing: { verdict: "ChatGPT dan Google diuji." },
        },
        facts,
      );
    // Aruna was never named: a claim with no subject is about Aruna.
    expect(
      titled("Disebut ChatGPT di Depok", "ChatGPT menjawab pertanyaan ini."),
    ).not.toEqual([]);
    // After the full name, the short form is that clinic.
    expect(
      titled(
        "ChatGPT menyebut Seruni",
        "ChatGPT menyebut Klinik Seruni dalam jawaban tentang bekas jerawat.",
      ),
    ).toEqual([]);
  });

  it("names a source only with ChatGPT or Google, not with 'ringkasan' alone", () => {
    expect(
      twoSourceWritingViolations(
        {
          ...report,
          key_findings: [
            {
              title: "Aruna tidak ada di ringkasan",
              explanation: "Dalam semua ringkasan, Aruna tidak disebut.",
              evidence_prompt_ids: gIds,
            },
          ],
        },
        guideFacts(),
      ).join(" "),
    ).toMatch(/Key finding 1 must say which source/);
  });
});
