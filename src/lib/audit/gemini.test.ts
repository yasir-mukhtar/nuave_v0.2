import { describe, expect, it, vi } from "vitest";
import { generateReportContent } from "./gemini";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS } from "./report-prompt-contract";
import {
  collectSources,
  extractBusinessDraft,
  GEMINI_AUDIT_SYSTEM,
  normalizeSourceTitle,
} from "./gemini";
import { fixtureBudget } from "./fixtures/telemetry";

// These tests cover the Gemini provider's mapping logic without calling the API.
// They guard the source-collection and provenance contract that the report
// pipeline relies on, and stay green with no GEMINI_API_KEY configured.

describe("gemini provider provenance", () => {
  it("uses a distinct, schema-valid system label", () => {
    expect(GEMINI_AUDIT_SYSTEM).toBe("Google Gemini API");
  });
});

describe("Gemini extraction contract without network", () => {
  it("requests structured fields in Indonesian and retains supported values in one call", async () => {
    vi.stubEnv("GEMINI_API_KEY", "dummy-offline-key");
    const draft = {
      brand_name: "Kedai Fiksi",
      entity_scope: "",
      brand_type: "",
      category: "kedai kopi",
      market_context: "sekitar Bandung",
      service_channels: ["delivery"],
      market_reach: "sekitar",
      market_areas: ["Bandung"],
      target_customer: "",
      official_sources: ["https://kedai-fiksi.example/"],
      verified_offerings: ["kopi susu"],
      verified_customer_needs: [],
      verified_decision_criteria: [],
      brand_name_variants: [],
      priority_offering: "",
      conversion_action: "",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      evidence: [],
      warnings: [],
    };
    const fetchMock = vi.fn(async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }],
        modelVersion: "dummy-model",
        responseId: "offline-response",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await extractBusinessDraft({
        website_url: "https://kedai-fiksi.example/",
        brand_name: "Kedai Fiksi",
        market_context: "",
        category: "",
        safety_identifier: "offline-gemini-extract",
        budget: fixtureBudget,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(
        (fetchMock.mock.calls[0] as unknown as [unknown, RequestInit])[1]
          .body as string,
      ) as { systemInstruction: { parts: { text: string }[] } };
      expect(body.systemInstruction.parts[0]!.text).toContain(
        "Tulis semua teks penjelasan secara ringkas dan alami dalam Bahasa Indonesia",
      );
      expect(body.systemInstruction.parts[0]!.text).toContain(
        "service_channels",
      );
      expect(result.draft.service_channels).toEqual(["delivery"]);
      expect(result.draft.market_reach).toBe("sekitar");
      expect(result.draft.market_areas).toEqual(["Bandung"]);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});

describe("gemini source collection", () => {
  const baseResponse = {
    candidates: [
      {
        content: { parts: [{ text: "answer" }] },
        citationMetadata: {
          citationSources: [
            { uri: "https://example.com/a", title: "Example A" },
          ],
        },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://example.com/b", title: "B" } },
          ],
        },
      },
    ],
  } as Parameters<typeof collectSources>[0];

  it("merges citation and grounding-chunk URLs into unique sources", () => {
    const sources = collectSources(baseResponse);
    expect(sources).toHaveLength(2);
    expect(sources.map((s: { url: string }) => s.url).sort()).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("keeps only the first title seen for a repeated URL", () => {
    const repeated = collectSources({
      candidates: [
        {
          citationMetadata: {
            citationSources: [
              { uri: "https://example.com/a", title: "First" },
              { uri: "https://example.com/a", title: "Second" },
            ],
          },
        },
      ],
    } as Parameters<typeof collectSources>[0]);
    expect(repeated).toHaveLength(1);
    expect(repeated[0].title).toBe("First");
  });

  it("drops sources without a URL", () => {
    const empty = collectSources({
      candidates: [
        { citationMetadata: { citationSources: [{ title: "No url" }] } },
      ],
    } as Parameters<typeof collectSources>[0]);
    expect(empty).toHaveLength(0);
  });
});

describe("gemini source titles", () => {
  it("preserves a short title", () => {
    expect(normalizeSourceTitle("Example source", "https://example.com")).toBe(
      "Example source",
    );
  });

  it("falls back to the URL when no title is given", () => {
    expect(normalizeSourceTitle(undefined, "https://example.com/x")).toBe(
      "https://example.com/x",
    );
  });
});

describe("Spec 012 B1 report request instructions (AC-12)", () => {
  async function capture(questionMethod?: "direct-ten") {
    const bodies: string[] = [];
    vi.stubEnv("GEMINI_API_KEY", "dummy-offline-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
        bodies.push(String(init?.body ?? ""));
        return new Response(
          JSON.stringify({ error: { message: "offline stop after capture" } }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const input = {
      brief: goldenBrief,
      prompts: goldenPrompts,
      observations: goldenObservations,
      safety_identifier: "offline-b1-gemini",
      budget: fixtureBudget,
      ...(questionMethod ? { question_method: questionMethod } : {}),
    };
    await expect(generateReportContent(input)).rejects.toThrow();
    await expect(
      generateReportContent(input, {
        draft: goldenReportContent(),
        violations: ["kalimat panjang"],
      }),
    ).rejects.toThrow();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    return bodies.map((body) => JSON.parse(body) as unknown);
  }

  it("sends direct-ten content guidance on initial and retry requests", async () => {
    const requests = await capture("direct-ten");
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      const text = JSON.stringify(request);
      for (const line of DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS)
        expect(text).toContain(JSON.stringify(line).slice(1, -1));
      expect(text).not.toContain("no more than five priorities");
      expect(text).toContain(
        "Return no more than ten key findings and no more than ten priorities. Each priority must address",
      );
    }
    expect(JSON.stringify(requests[1])).toContain("language-only revision");
  });

  it("keeps historical report instructions unchanged", async () => {
    const [request] = await capture();
    const text = JSON.stringify(request);
    expect(text).not.toContain(
      JSON.stringify(DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS[0]).slice(1, -1),
    );
    expect(text).toContain("Return no more than five priorities.");
  });
});
