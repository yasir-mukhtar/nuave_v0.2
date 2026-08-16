import { describe, expect, it } from "vitest";
import {
  collectSources,
  GEMINI_AUDIT_SYSTEM,
  normalizeSourceTitle,
} from "./gemini";

// These tests cover the Gemini provider's mapping logic without calling the API.
// They guard the source-collection and provenance contract that the report
// pipeline relies on, and stay green with no GEMINI_API_KEY configured.

describe("gemini provider provenance", () => {
  it("uses a distinct, schema-valid system label", () => {
    expect(GEMINI_AUDIT_SYSTEM).toBe("Google Gemini API");
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
