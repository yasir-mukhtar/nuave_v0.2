import { describe, expect, it, vi } from "vitest";
import {
  OPENROUTER_AUDIT_SYSTEM,
  OPENROUTER_OBSERVATION_INSTRUCTION,
  auditModel,
  isDailyQuotaMessage,
  isNonRetryableProviderMessage,
  openrouterChat,
  parseJsonObject,
  truncateToChars,
} from "./openrouter";
import { auditObservationSchema } from "./types";
import { classifyObservationFailure } from "./retry";

// Covers the OpenRouter provider's pure logic and its fetch-level error
// handling without hitting the network. A live smoke test is run manually with
// OPENROUTER_API_KEY set (see .env.example).

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("openrouter configuration", () => {
  it("exposes the openrouter system label accepted by the observation schema", () => {
    expect(OPENROUTER_AUDIT_SYSTEM).toBe("OpenRouter");
  });

  it("defaults to a free model slug and honors the override", () => {
    vi.stubEnv("OPENROUTER_AUDIT_MODEL", "");
    expect(auditModel()).toMatch(/:free$/);
    vi.stubEnv("OPENROUTER_AUDIT_MODEL", "openai/gpt-oss-20b:free");
    expect(auditModel()).toBe("openai/gpt-oss-20b:free");
    vi.unstubAllEnvs();
  });

  it("never tells a search-less model to use web search, and never sends the brief", () => {
    expect(OPENROUTER_OBSERVATION_INSTRUCTION).not.toMatch(/pencarian web\.$/m);
    expect(OPENROUTER_OBSERVATION_INSTRUCTION).toContain(
      "tidak memiliki akses pencarian web",
    );
  });
});

describe("openrouter output parsing", () => {
  it("parses a bare JSON object", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a fenced JSON object, which free models emit despite json mode", () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('```\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("rejects JSON that is not an object", () => {
    expect(() => parseJsonObject("[1,2]")).toThrow(/not an object/);
  });

  it("truncates long text with an ellipsis and never exceeds the cap", () => {
    expect(truncateToChars("hello", 100)).toBe("hello");
    expect(truncateToChars("a".repeat(3000), 1500).length).toBe(1500);
    expect(truncateToChars("a".repeat(3000), 1500).endsWith("…")).toBe(true);
  });
});

describe("openrouter free-tier limit classification", () => {
  it("recognizes a per-day cap, which cannot clear inside one request", () => {
    expect(
      isDailyQuotaMessage(
        "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day",
      ),
    ).toBe(true);
    expect(
      isDailyQuotaMessage("Rate limit exceeded: 20 requests per minute"),
    ).toBe(false);
  });

  it("recognizes configuration errors that retrying cannot fix", () => {
    expect(
      isNonRetryableProviderMessage("No endpoints found for zzz:free"),
    ).toBe(true);
    expect(isNonRetryableProviderMessage("No auth credentials found")).toBe(
      true,
    );
    expect(isNonRetryableProviderMessage("upstream timed out")).toBe(false);
  });

  it("stops the orchestrator re-asking a question once the daily cap is hit", () => {
    const observation = auditObservationSchema.parse({
      prompt_id: "NUAVE-01",
      category: "solution_discovery",
      branded: false,
      question: "Klinik gigi terbaik di Depok?",
      system: OPENROUTER_AUDIT_SYSTEM,
      requested_model: "z-ai/glm-5.2:free",
      returned_model: "",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "",
      sources: [],
      run_status: "failed",
      failure_reason:
        "OpenRouter free-model daily limit reached and cannot be retried within this request. Rate limit exceeded: free-models-per-day",
      telemetry: [],
    });
    expect(classifyObservationFailure(observation)).toEqual({
      evaluable: false,
      category: "non_retryable",
    });
  });
});

describe("openrouterChat network handling", () => {
  it("fails fast with no fetch when the key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      openrouterChat({ model: "m:free", messages: [] }),
    ).rejects.toThrow(/OPENROUTER_API_KEY is not configured/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("returns the completion text and the model the provider actually served", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        id: "gen-123",
        model: "z-ai/glm-5.2:free",
        choices: [{ message: { content: "Halo." } }],
      }),
    );
    await expect(
      openrouterChat({
        model: "z-ai/glm-5.2:free",
        messages: [{ role: "user", content: "hai" }],
      }),
    ).resolves.toEqual({
      text: "Halo.",
      returnedModel: "z-ai/glm-5.2:free",
      responseId: "gen-123",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("throws immediately on a per-day cap instead of sleeping through it", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 429,
            message: "Rate limit exceeded: free-models-per-day",
          },
        },
        { status: 429 },
      ),
    );
    await expect(
      openrouterChat({ model: "m:free", messages: [] }),
    ).rejects.toThrow(/daily limit reached and cannot be retried/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("throws immediately on an unknown model slug instead of retrying it", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(
          { error: { code: 404, message: "No endpoints found for zzz:free" } },
          { status: 404 },
        ),
      );
    await expect(
      openrouterChat({ model: "zzz:free", messages: [] }),
    ).rejects.toThrow(/No endpoints found/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("treats an empty completion as unusable rather than a successful answer", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        model: "m:free",
        choices: [{ message: { content: "" } }],
      }),
    );
    // Collapse the backoff so the retry loop does not stall the suite.
    vi.useFakeTimers();
    const call = openrouterChat({ model: "m:free", messages: [] });
    const assertion = expect(call).rejects.toThrow(/empty completion/);
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("openrouter provider wiring", () => {
  // Dynamic imports with resetModules: provider.ts resolves its bindings at
  // MODULE LOAD, so the env has to be in place before the import, and each
  // case needs a fresh module graph.
  it("routes every audit stage to openrouter when NUAVE_PROVIDER selects it", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "openrouter");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.resetModules();
    const provider = await import("./provider");
    const openrouter = await import("./openrouter");
    expect(provider.activeAuditProvider()).toBe("openrouter");
    expect(provider.extractBusinessDraft).toBe(openrouter.extractBusinessDraft);
    expect(provider.executeAuditPrompt).toBe(openrouter.executeAuditPrompt);
    expect(provider.generateReportContent).toBe(
      openrouter.generateReportContent,
    );
    // The orchestrator and the report pipeline gate their credential check on
    // this, so a new provider that it does not recognize silently skips the
    // fail-fast guard.
    expect(provider.isLiveProviderCall(openrouter.executeAuditPrompt)).toBe(
      true,
    );
    expect(provider.isLiveProviderCall(openrouter.generateReportContent)).toBe(
      true,
    );
    vi.unstubAllEnvs();
  });

  it("fails the protected live path closed without the explicit testing flag", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "openrouter");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "");
    vi.resetModules();
    await expect(import("./provider")).rejects.toThrow(/testing-only/);
    vi.unstubAllEnvs();
  });

  it("fails closed before any call when OPENROUTER_API_KEY is missing", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "openrouter");
    vi.stubEnv("NUAVE_LIVE_PROVIDER_TESTING", "1");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.resetModules();
    const provider = await import("./provider");
    expect(() => provider.assertLiveProviderCredentialsConfigured()).toThrow(
      /OPENROUTER_API_KEY is not configured/,
    );
    vi.unstubAllEnvs();
  });
});
