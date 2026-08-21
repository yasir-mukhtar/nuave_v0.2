import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OPENCODEGO_BASE_URL,
  activeAuditProvider,
  assertLiveProviderCredentialsConfigured,
  liveAuditProvider,
} from "./provider";
import { liveIndonesianQuestionProviderName } from "./questions-id-provider";

describe("protected live path fails closed to the founder-approved provider (Spec 003 lock, DECISION_LOG 2026-08-21)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("locks the live audit path to OpenCode Go", () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    expect(liveAuditProvider()).toBe("opencodego");
  });

  it("fails closed when the production provider is missing or a testing-only provider is selected", () => {
    vi.stubEnv("NUAVE_PROVIDER", "");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_PROVIDER", "groq");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
  });

  it("allows testing-only providers on the live path only with the explicit testing flag", () => {
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    expect(liveAuditProvider()).toBe("openai");
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    expect(liveAuditProvider()).toBe("gemini");
  });

  it("ignores the testing flag and fails closed when NODE_ENV=production (O-10)", () => {
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    expect(() => liveIndonesianQuestionProviderName()).toThrow(/testing-only/);
  });

  it("keeps activeAuditProvider env-selectable for tests and local runners", () => {
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    expect(activeAuditProvider()).toBe("gemini");
    vi.stubEnv("NUAVE_PROVIDER", "groq");
    expect(activeAuditProvider()).toBe("groq");
  });

  it("locks the live question path to OpenCode Go", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
    expect(liveIndonesianQuestionProviderName()).toBe("opencodego");
  });

  it("fails the live question path closed when NUAVE_QUESTION_PROVIDER selects Gemini", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    expect(() => liveIndonesianQuestionProviderName()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    expect(liveIndonesianQuestionProviderName()).toBe("gemini");
  });

  it("defaults the live question path to OpenCode Go when NUAVE_QUESTION_PROVIDER is unset", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "");
    expect(liveIndonesianQuestionProviderName()).toBe("opencodego");
  });

  it("fails closed before any provider call when OPENCODEGO_API_KEY is missing on the live path (O-10)", () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    expect(() => assertLiveProviderCredentialsConfigured()).toThrow(
      /OPENCODEGO_API_KEY is not configured/,
    );
  });

  it("bridges the configured OpenCode Go credential and endpoint to the OpenAI-compatible SDK", () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "test-opencode-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_BASE_URL", "");
    expect(() => assertLiveProviderCredentialsConfigured()).not.toThrow();
    expect(process.env.OPENAI_API_KEY).toBe("test-opencode-key");
    expect(process.env.OPENAI_BASE_URL).toBe(OPENCODEGO_BASE_URL);
  });
});
