import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVALID_WEBSITE_INPUT_MESSAGE,
  normalizeWebsiteInput,
} from "./website-input";
import { INVALID_SOURCE_INPUT_MESSAGE, parseSourceInput } from "./source-input";

const providerMocks = vi.hoisted(() => ({
  assertConfigured: vi.fn(),
  extract: vi.fn(),
}));

vi.mock("@/lib/audit/provider", () => ({
  assertLiveProviderCredentialsConfigured: providerMocks.assertConfigured,
  liveExtractBusinessDraft: providerMocks.extract,
}));

import { POST } from "../../app/api/audit/extract/route";

function extractionRequest(website_url: string) {
  return new Request("http://localhost/api/audit/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      website_url,
      brand_name: "",
      market_context: "",
      category: "",
      safety_identifier: "test-user-123",
      budget: {
        limit_usd: 5,
        carryover_cost_usd: 0,
        calls: [],
      },
    }),
  });
}

describe("website-only compatibility adapter", () => {
  it.each([
    ["masryef.com", "https://masryef.com/"],
    ["www.masryef.com", "https://www.masryef.com/"],
    ["https://masryef.com", "https://masryef.com/"],
    ["http://masryef.com", "http://masryef.com/"],
    ["  masryef.com  ", "https://masryef.com/"],
  ])(
    "normalizes website %s through the canonical policy",
    (input, expected) => {
      expect(normalizeWebsiteInput(input)).toEqual({ ok: true, url: expected });
    },
  );

  it.each([
    "not a website",
    "ftp://masryef.com",
    "javascript:alert(1)",
    "localhost",
    "@masryef",
    "https://",
    "https://instagram.com/masryef",
  ])("rejects non-website input %s", (input) => {
    expect(normalizeWebsiteInput(input)).toEqual({
      ok: false,
      error: INVALID_WEBSITE_INPUT_MESSAGE,
    });
  });
});

describe("extraction route uses the same source decision", () => {
  beforeEach(() => {
    providerMocks.assertConfigured.mockReset();
    providerMocks.extract.mockReset();
    providerMocks.extract.mockResolvedValue({ draft: {}, telemetry: [] });
  });

  it.each(["masryef.com", "@masryef", "https://instagram.com/masryef"])(
    "accepts the same supported source as parseSourceInput: %s",
    async (input) => {
      const parsed = parseSourceInput(input);
      expect(parsed).not.toBeNull();

      const response = await POST(extractionRequest(input));

      expect(response.status).toBe(200);
      expect(providerMocks.assertConfigured).toHaveBeenCalledTimes(1);
      expect(providerMocks.extract).toHaveBeenCalledTimes(1);
      expect(providerMocks.extract).toHaveBeenCalledWith(
        expect.objectContaining({ website_url: parsed?.normalizedUrl }),
      );
    },
  );

  it.each([
    "not a website",
    "https://instagram.com/p/ABC",
    "https://instagram.com/reel/ABC",
    "https://maps.app.goo.gl/example",
  ])(
    "rejects the same unsupported source with zero provider calls: %s",
    async (input) => {
      const response = await POST(extractionRequest(input));
      const body = await response.json();

      expect(parseSourceInput(input)).toBeNull();
      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: INVALID_SOURCE_INPUT_MESSAGE,
        code: "INVALID_SOURCE_INPUT",
        telemetry: [],
      });
      expect(providerMocks.assertConfigured).not.toHaveBeenCalled();
      expect(providerMocks.extract).not.toHaveBeenCalled();
    },
  );
});
