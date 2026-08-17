import { afterEach, describe, expect, it, vi } from "vitest";
import { activeAuditProvider, liveAuditProvider } from "./provider";
import { liveIndonesianQuestionProviderName } from "./questions-id-provider";

describe("protected live path fails closed to the founder-approved provider (Spec 003 lock, DECISION_LOG 2026-08-17)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults the live audit path to openai when NUAVE_PROVIDER is unset or openai", () => {
    vi.stubEnv("NUAVE_PROVIDER", "");
    expect(liveAuditProvider()).toBe("openai");
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    expect(liveAuditProvider()).toBe("openai");
  });

  it("fails closed when a testing-only provider is selected on the live path", () => {
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_PROVIDER", "groq");
    expect(() => liveAuditProvider()).toThrow(/testing-only/);
  });

  it("allows testing-only providers on the live path only with the explicit testing flag", () => {
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    expect(liveAuditProvider()).toBe("gemini");
  });

  it("keeps activeAuditProvider env-selectable for tests and local runners", () => {
    vi.stubEnv("NUAVE_PROVIDER", "gemini");
    expect(activeAuditProvider()).toBe("gemini");
    vi.stubEnv("NUAVE_PROVIDER", "groq");
    expect(activeAuditProvider()).toBe("groq");
  });

  it("fails the live question path closed when NUAVE_QUESTION_PROVIDER selects Gemini", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    expect(() => liveIndonesianQuestionProviderName()).toThrow(/testing-only/);
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "gemini");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    expect(liveIndonesianQuestionProviderName()).toBe("gemini");
  });

  it("defaults the live question path to openai when NUAVE_QUESTION_PROVIDER is unset", () => {
    vi.stubEnv("NUAVE_QUESTION_PROVIDER", "");
    expect(liveIndonesianQuestionProviderName()).toBe("openai");
  });
});
