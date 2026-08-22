import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVALID_WEBSITE_INPUT_MESSAGE,
  normalizeWebsiteInput,
} from "./website-input";

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

describe("website input normalization", () => {
  it.each([
    ["masryef.com", "https://masryef.com"],
    ["www.masryef.com", "https://www.masryef.com"],
    ["https://masryef.com", "https://masryef.com"],
    ["http://masryef.com", "http://masryef.com"],
    ["  masryef.com  ", "https://masryef.com"],
  ])("normalizes %s safely", (input, expected) => {
    expect(normalizeWebsiteInput(input)).toEqual({ ok: true, url: expected });
  });

  it.each([
    "not a website",
    "ftp://masryef.com",
    "javascript:alert(1)",
    "localhost",
    "@masryef",
    "https://",
  ])("rejects malformed or unsupported input %s", (input) => {
    expect(normalizeWebsiteInput(input)).toEqual({
      ok: false,
      error: INVALID_WEBSITE_INPUT_MESSAGE,
    });
  });
});

describe("website extraction route boundary", () => {
  beforeEach(() => {
    providerMocks.assertConfigured.mockReset();
    providerMocks.extract.mockReset();
    providerMocks.extract.mockResolvedValue({ draft: {}, telemetry: [] });
  });

  it("normalizes a bare domain again on the server before provider work", async () => {
    const response = await POST(extractionRequest("masryef.com"));

    expect(response.status).toBe(200);
    expect(providerMocks.assertConfigured).toHaveBeenCalledTimes(1);
    expect(providerMocks.extract).toHaveBeenCalledTimes(1);
    expect(providerMocks.extract).toHaveBeenCalledWith(
      expect.objectContaining({ website_url: "https://masryef.com" }),
    );
  });

  it("rejects invalid input with zero provider calls and no raw Zod payload", async () => {
    const response = await POST(extractionRequest("not a website"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: INVALID_WEBSITE_INPUT_MESSAGE,
      code: "INVALID_WEBSITE_INPUT",
      telemetry: [],
    });
    expect(JSON.stringify(body)).not.toContain("issues");
    expect(JSON.stringify(body)).not.toContain("website_url");
    expect(providerMocks.assertConfigured).not.toHaveBeenCalled();
    expect(providerMocks.extract).not.toHaveBeenCalled();
  });

  it("rejects Instagram handles because Phase 3 supports website extraction only", async () => {
    const response = await POST(extractionRequest("@masryef"));

    expect(response.status).toBe(400);
    expect(providerMocks.assertConfigured).not.toHaveBeenCalled();
    expect(providerMocks.extract).not.toHaveBeenCalled();
  });
});
