import { afterEach, describe, expect, it } from "vitest";
import { auditReasoningEffort, normalizeSourceTitle } from "./openai";
import { SOURCE_TITLE_MAX_LENGTH, sourceSchema } from "./types";

const originalReasoningEffort = process.env.OPENAI_AUDIT_REASONING_EFFORT;

afterEach(() => {
  if (originalReasoningEffort === undefined) {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
  } else {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = originalReasoningEffort;
  }
});

describe("audit reasoning effort", () => {
  it("preserves the stage default when no override is configured", () => {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
    expect(auditReasoningEffort("low")).toBe("low");
    expect(auditReasoningEffort("medium")).toBe("medium");
  });

  it("uses one valid override for every stage", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "max";
    expect(auditReasoningEffort("low")).toBe("max");
    expect(auditReasoningEffort("medium")).toBe("max");
  });

  it("rejects an unsupported override before making an API request", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "extra-high";
    expect(() => auditReasoningEffort("low")).toThrow(
      "OPENAI_AUDIT_REASONING_EFFORT must be one of",
    );
  });
});

describe("audit source titles", () => {
  it("preserves a provider title that fits the observation contract", () => {
    expect(
      normalizeSourceTitle("  Example source title  ", "https://example.com"),
    ).toBe("Example source title");
  });

  it("shortens an overlong provider title without changing its URL", () => {
    const url = "https://example.com/source";
    const title = "Source title ".repeat(40);
    const normalized = { url, title: normalizeSourceTitle(title, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(normalized.title.endsWith("…")).toBe(true);
    expect(normalized.url).toBe(url);
    expect(sourceSchema.parse(normalized)).toEqual(normalized);
  });

  it("uses a contract-safe display title when a long URL has no title", () => {
    const url = `https://example.com/?query=${"a".repeat(400)}`;
    const normalized = { url, title: normalizeSourceTitle(undefined, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(sourceSchema.parse(normalized).url).toBe(url);
  });
});
