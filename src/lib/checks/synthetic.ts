/**
 * Spec 018 R-27: labelled synthetic ChatGPT and Google answers, so the
 * journey and verify-nuave run the two-source audit with no external call and
 * no spend. Each run deliberately includes one empty AI Overview (counted as
 * not shown after its retry), one question where Google shows no AI Overview,
 * and one ChatGPT check that fails on every attempt, so the report's
 * "Tidak dapat diuji" and coverage paths are exercised every time.
 */
import type { CheckSend, CheckSource } from "./send";

/** Question 3: an empty AI Overview element, every time (R-17). */
export const SYNTHETIC_EMPTY_SUMMARY_ORDINAL = 3;
/** Question 5: Google shows no AI Overview. */
export const SYNTHETIC_NOT_SHOWN_ORDINAL = 5;
/** Question 7: the ChatGPT check fails on every attempt (R-20). */
export const SYNTHETIC_FAILED_CHATGPT_ORDINAL = 7;

export const SYNTHETIC_CHECK_LABEL = "[Jawaban sintetis berlabel]";
const OTHER_BUSINESS = "Klinik Sintesa Contoh";

function sent(input: {
  statusCode: number;
  result: Record<string, unknown> | null;
  at: Date;
  id: string;
}): CheckSend {
  return {
    outcome: input.statusCode === 20000 ? "ok" : "retry",
    statusCode: input.statusCode,
    result: input.result,
    costUsd: 0,
    taskId: input.id,
    startedAt: input.at,
    completedAt: input.at,
    transportError: null,
  };
}

/** One synthetic check call, shaped like DataForSEO's answer so the same
 * readers parse it. The business is named in odd-numbered questions. */
export function syntheticCheckSend(input: {
  source: CheckSource;
  body: Record<string, unknown>;
  ordinal: number;
  attempt: number;
  names: readonly string[];
  now: Date;
}): CheckSend {
  const question = String(input.body.keyword ?? "");
  const brand = input.names[0] ?? "";
  const named = input.ordinal % 2 === 1 && brand;
  const id = `synthetic-${input.source}-${input.ordinal}-${input.attempt}`;
  if (input.source === "chatgpt") {
    if (input.ordinal === SYNTHETIC_FAILED_CHATGPT_ORDINAL)
      return sent({ statusCode: 50000, result: null, at: input.now, id });
    const markdown = `${SYNTHETIC_CHECK_LABEL} Untuk pertanyaan "${question}", beberapa pilihan yang sering disebut adalah ${named ? `**${brand}** dan ` : ""}**${OTHER_BUSINESS}**. Hubungi 0812-3456-7890 untuk reservasi ([contoh.test](https://contoh.test/info)).`;
    return sent({
      statusCode: 20000,
      at: input.now,
      id,
      result: {
        model: "synthetic-local-fixture",
        markdown,
        sources: [
          {
            type: "chat_gpt_source",
            title: "Sumber sintetis",
            url: "https://contoh.test/info",
            domain: "contoh.test",
          },
        ],
        brand_entities: [
          { type: "chat_gpt_brand_entity", title: OTHER_BUSINESS },
        ],
        items: [
          { type: "chat_gpt_text", markdown },
          {
            type: "chat_gpt_local_businesses",
            items: [
              {
                type: "chat_gpt_local_businesses_element",
                title: OTHER_BUSINESS,
                address: "Jl. Contoh No. 1",
                phone: "+62 812 3456 7890",
                rating: { value: 4.6 },
              },
            ],
          },
        ],
      },
    });
  }
  if (input.ordinal === SYNTHETIC_NOT_SHOWN_ORDINAL)
    return sent({
      statusCode: 20000,
      at: input.now,
      id,
      result: { items: [{ type: "organic", title: "Hasil sintetis" }] },
    });
  const empty = input.ordinal === SYNTHETIC_EMPTY_SUMMARY_ORDINAL;
  return sent({
    statusCode: 20000,
    at: input.now,
    id,
    result: {
      items: [
        {
          type: "ai_overview",
          asynchronous_ai_overview: false,
          markdown: empty
            ? null
            : `${SYNTHETIC_CHECK_LABEL} Ringkasan untuk "${question}": ${named ? `${brand} dan ` : ""}${OTHER_BUSINESS} sering disebut.`,
          items: empty
            ? null
            : [
                {
                  type: "ai_overview_element",
                  references: [
                    {
                      type: "ai_overview_reference",
                      title: "Referensi sintetis",
                      url: "https://contoh.test/ringkasan",
                      domain: "contoh.test",
                    },
                  ],
                },
              ],
        },
      ],
    },
  });
}
