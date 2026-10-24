/**
 * Spec 018 R-27: labelled synthetic discovery. It answers the same requests
 * with DataForSEO-shaped data derived from the request itself, so the journey,
 * the pool rules and verify-nuave run with no external call and no spend. It
 * deliberately includes texts the rules must drop (an off-topic word, another
 * business, another city) so the filters are exercised every run.
 */
import { DATAFORSEO_PATHS, type DataForSeoTransport } from "./dataforseo";

/** A made-up business name; never a real clinic. */
export const SYNTHETIC_BUSINESS_NAME = "Klinik Sintesa Contoh";

function task(result: Record<string, unknown>, cost = 0) {
  return {
    status_code: 20000,
    cost,
    tasks: [
      { status_code: 20000, status_message: "Ok.", cost, result: [result] },
    ],
  };
}

const monthly = (volume: number) => [
  { year: 2026, month: 9, search_volume: volume },
  { year: 2026, month: 8, search_volume: volume },
];

function keywordItem(keyword: string, volume: number) {
  return {
    keyword,
    keyword_info: { search_volume: volume, monthly_searches: monthly(volume) },
    search_intent_info: { main_intent: "commercial" },
  };
}

export function syntheticDataForSeoTransport(
  options: { fail?: "all" | "unavailable" } = {},
): DataForSeoTransport {
  return {
    kind: "synthetic",
    send: async ({ path, body }) => {
      if (options.fail === "unavailable")
        return {
          httpStatus: 200,
          json: {
            status_code: 20000,
            tasks: [{ status_code: 40200, cost: 0 }],
          },
        };
      if (options.fail === "all")
        return {
          httpStatus: 0,
          json: null,
          transportError: "synthetic failure",
        };
      const keyword = String(body.keyword ?? "");
      if (path === DATAFORSEO_PATHS.keywordSuggestions) {
        return {
          httpStatus: 200,
          json: task({
            seed_keyword_data: keywordItem(keyword, 1_900),
            items: [
              keywordItem(`harga ${keyword}`, 880),
              keywordItem(`${keyword} terdekat`, 590),
              keywordItem(`biaya ${keyword}`, 320),
              keywordItem(`rekomendasi klinik ${keyword}`, 140),
              keywordItem(`${keyword} murah`, 90),
              keywordItem(`obat ${keyword}`, 720),
              keywordItem(`${keyword} adalah`, 1_300),
            ],
          }),
        };
      }
      if (path === DATAFORSEO_PATHS.autocomplete) {
        return {
          httpStatus: 200,
          json: task({
            items: [
              { type: "autocomplete", suggestion: `${keyword} harga` },
              { type: "autocomplete", suggestion: `rekomendasi ${keyword}` },
              { type: "autocomplete", suggestion: `${keyword} terbaik` },
              { type: "autocomplete", suggestion: `sintesa contoh ${keyword}` },
            ],
          }),
        };
      }
      if (path === DATAFORSEO_PATHS.serp) {
        return {
          httpStatus: 200,
          json: task({
            items: [
              { type: "local_pack", title: SYNTHETIC_BUSINESS_NAME },
              { type: "organic", website_name: SYNTHETIC_BUSINESS_NAME },
              {
                type: "people_also_ask",
                items: [
                  {
                    type: "people_also_ask_element",
                    title: `Berapa ${keyword}?`,
                  },
                  {
                    type: "people_also_ask_element",
                    title: "Klinik mana yang paling bagus di Bekasi?",
                  },
                ],
              },
            ],
          }),
        };
      }
      return { httpStatus: 200, json: { status_code: 40400, tasks: [] } };
    },
  };
}
