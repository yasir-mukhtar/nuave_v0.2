import { describe, expect, it } from "vitest";
import {
  buildV3ProviderBody,
  buildV3WriterRequest,
  parseV3RichResponse,
  parseV3SimpleResponse,
  V3_GUARD_POLICY,
  V3_NAMED_SLOT_IDS,
  V3_PROPOSED_EVALUATION_SETTINGS,
  V3_RICH_INSTRUCTION_VERSION,
  V3_RICH_SCHEMA_VERSION,
  V3_SIMPLE_WRITER_INSTRUCTION,
  V3_UNNAMED_SLOT_IDS,
  V3_WRITER_CONTRACT_VERSION,
} from "./question-writer-v3";
import { buildV3WriterContext } from "./question-context-v3";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import { OPENCODEGO_AUDIT_MODEL } from "./opencodego";
import {
  projectedFacts,
  richResponseOf,
  V3_SIMPLE_VALID_QUESTIONS,
} from "./question-v3-testkit";

describe("v3 writer request", () => {
  it("carries the versioned contract and per-slot projected context", () => {
    const request = buildV3WriterRequest(projectedFacts(), "rich");
    expect(request.contractVersion).toBe(V3_WRITER_CONTRACT_VERSION);
    expect(request.instructionVersion).toBe(V3_RICH_INSTRUCTION_VERSION);
    expect(request.schemaVersion).toBe(V3_RICH_SCHEMA_VERSION);
    expect(request.guardPolicy).toBe(V3_GUARD_POLICY);
    expect(request.variant).toBe("rich");
    expect(request.writerContext).toEqual(
      buildV3WriterContext(projectedFacts()),
    );
  });

  it("keeps rich and simple on the same projection and shared semantic instruction", () => {
    const facts = projectedFacts();
    const rich = buildV3WriterRequest(facts, "rich");
    const simple = buildV3WriterRequest(facts, "simple");
    expect(simple.writerContext).toEqual(rich.writerContext);
    expect(simple.binding).toEqual(rich.binding);
    expect(simple.instruction).toBe(V3_SIMPLE_WRITER_INSTRUCTION);
    expect(simple.instructionVersion).not.toBe(rich.instructionVersion);
  });

  it("withholds identifying values from unnamed slots in the writer context", () => {
    const facts = projectedFacts();
    const context = buildV3WriterContext(facts);
    for (const slot of context.slots.slice(0, 6)) {
      const serialized = JSON.stringify(slot);
      expect(serialized).not.toContain("Kopi Sudut");
      expect(serialized).not.toContain("kopisudut.id");
      expect(serialized).not.toContain("Kedai Pagi");
    }
    for (const slot of context.slots.slice(6)) {
      expect(JSON.stringify(slot)).toContain("Kopi Sudut");
    }
  });

  it("builds a bounded no-search provider body mirroring the v2 shape", () => {
    const body = buildV3ProviderBody(
      buildV3WriterRequest(projectedFacts(), "rich"),
    );
    expect(body.model).toBe(OPENCODEGO_AUDIT_MODEL);
    expect(body.store).toBe(false);
    expect(body.max_output_tokens).toBe(4096);
    expect(body.text.format.strict).toBe(true);
    expect(body.text.format.schema).toHaveProperty("properties.unnamed");
    expect(body.input).toHaveLength(2);
    // No tools/search key may be present anywhere in the request body.
    expect(JSON.stringify(body)).not.toMatch(/"tools"|"search"|web_search/);
  });
});

describe("rich response parsing", () => {
  it("accepts a structurally complete response", () => {
    const parsed = parseV3RichResponse(richResponseOf());
    expect(parsed.ok).toBe(true);
  });

  it("accepts candidates whose provenance fields are missing", () => {
    const response = richResponseOf();
    const stripped = JSON.parse(JSON.stringify(response)) as Record<
      string,
      unknown
    >;
    for (const entry of stripped.unnamed as Record<string, unknown>[]) {
      delete (entry.primary as Record<string, unknown>).contextRefs;
      delete (entry.primary as Record<string, unknown>).dimensionIds;
      delete (entry.reserve as Record<string, unknown>).contextRefs;
      delete (entry.reserve as Record<string, unknown>).dimensionIds;
    }
    const parsed = parseV3RichResponse(stripped);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.response.unnamed[0].primary.contextRefs).toEqual([]);
      expect(parsed.response.unnamed[0].primary.dimensionIds).toEqual([]);
    }
  });

  it("rejects malformed and truncated schema shapes", () => {
    expect(parseV3RichResponse("not json").ok).toBe(false);
    const truncated = richResponseOf();
    truncated.unnamed = truncated.unnamed.slice(0, 5);
    expect(parseV3RichResponse(truncated).ok).toBe(false);
    const namedShort = richResponseOf();
    namedShort.named = namedShort.named.slice(0, 3);
    expect(parseV3RichResponse(namedShort).ok).toBe(false);
  });

  it("rejects missing and duplicated canonical slot ids", () => {
    const duplicated = richResponseOf();
    duplicated.unnamed[1].slotId = "NUAVE-BRAND-NEED-01";
    const parsed = parseV3RichResponse(duplicated);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.failure).toBe("missing_or_duplicate_slots");

    const wrongNamed = richResponseOf();
    wrongNamed.named[0].slotId = "NUAVE-BRAND-NEED-01";
    const wrongParsed = parseV3RichResponse(wrongNamed);
    expect(wrongParsed.ok).toBe(false);
  });

  it("rejects unresolved dimension and context references", () => {
    const bad = richResponseOf();
    bad.unnamed[0].primary.dimensionIds = ["not-a-dimension"];
    const parsed = parseV3RichResponse(bad);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.failure).toBe("unresolved_references");

    const badRef = richResponseOf();
    badRef.unnamed[0].primary.contextRefs = ["arbitrary-field"];
    expect(parseV3RichResponse(badRef).ok).toBe(false);
  });
});

describe("simple response parsing", () => {
  it("requires exactly ten final strings", () => {
    const questions = V3_SIMPLE_VALID_QUESTIONS;
    expect(parseV3SimpleResponse({ questions }).ok).toBe(true);
    expect(parseV3SimpleResponse({ questions: questions.slice(0, 9) }).ok).toBe(
      false,
    );
    expect(
      parseV3SimpleResponse({ questions: [...questions, "extra"] }).ok,
    ).toBe(false);
  });
});

describe("dormancy and v2 preservation", () => {
  it("is not imported by any runtime dispatch path", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const roots = ["src/app", "src/components", "src/lib/intake"];
    const matches: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(path)) {
          const source = readFileSync(path, "utf8");
          if (/question-(writer|finalize|eval)-(v3|g2)/.test(source))
            matches.push(path);
        }
      }
    };
    for (const root of roots) walk(root);
    expect(matches).toEqual([]);
  });

  it("declares the frozen matrix identity rather than renumbering slots", () => {
    expect(V3_UNNAMED_SLOT_IDS).toEqual([
      "NUAVE-BRAND-NEED-01",
      "NUAVE-BRAND-NEED-02",
      "NUAVE-BRAND-SOLUTION-01",
      "NUAVE-BRAND-SOLUTION-02",
      "NUAVE-BRAND-COMPARISON-01",
      "NUAVE-BRAND-COMPARISON-02",
    ]);
    expect(V3_NAMED_SLOT_IDS).toEqual([
      "NUAVE-BRAND-VALIDATION-01",
      "NUAVE-BRAND-VALIDATION-02",
      "NUAVE-BRAND-ACTION-01",
      "NUAVE-BRAND-ACTION-02",
    ]);
    expect(AUDIT_MEASUREMENT_MATRIX).toHaveLength(10);
  });

  it("keeps evaluation settings out of live defaults", () => {
    expect(V3_PROPOSED_EVALUATION_SETTINGS.search).toBe(false);
    expect(V3_PROPOSED_EVALUATION_SETTINGS.retries).toBe(0);
    expect(V3_PROPOSED_EVALUATION_SETTINGS.maxOutputTokens).toBe(4096);
  });
});
