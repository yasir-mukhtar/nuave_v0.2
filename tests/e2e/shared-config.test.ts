import { afterEach, describe, expect, it, vi } from "vitest";
import { offlineE2EServerEnv } from "./shared-config";

describe("offlineE2EServerEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("overwrites ambient provider credentials and live switches", () => {
    vi.stubEnv("OPENAI_API_KEY", "real-looking-openai");
    vi.stubEnv("OPENAI_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("OPENCODEGO_API_KEY", "real-looking-opencodego");
    vi.stubEnv("GEMINI_API_KEY", "real-looking-gemini");
    vi.stubEnv("GROQ_API_KEY", "real-looking-groq");
    vi.stubEnv("OPENROUTER_API_KEY", "real-looking-openrouter");
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "openrouter");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    vi.stubEnv("NUAVE_FIXTURE_PREVIEW_ENABLED", "true");
    vi.stubEnv("NUAVE_FIXTURE_FORCE_REPORT_FAILURE", "true");

    const env = offlineE2EServerEnv();

    expect(env).toMatchObject({
      NUAVE_PROVIDER: "opencodego",
      NUAVE_QUESTION_PROVIDER: "opencodego",
      NUAVE_LIVE_PROVIDER_TESTING: "0",
      OPENCODEGO_API_KEY: "",
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
      GROQ_API_KEY: "",
      OPENROUTER_API_KEY: "",
      NUAVE_FIXTURE_PREVIEW_ENABLED: "false",
      NUAVE_FIXTURE_FORCE_REPORT_FAILURE: "false",
    });
    expect(env.OPENAI_BASE_URL).toBeUndefined();
  });

  it("allows only explicit fixture-mode overrides", () => {
    expect(
      offlineE2EServerEnv({ NUAVE_FIXTURE_PREVIEW_ENABLED: "true" })
        .NUAVE_FIXTURE_PREVIEW_ENABLED,
    ).toBe("true");
    expect(() =>
      offlineE2EServerEnv({ NUAVE_PROVIDER: "gemini" }),
    ).toThrow("Unsupported Playwright server env override");
  });
});
