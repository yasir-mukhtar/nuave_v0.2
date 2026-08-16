import { describe, expect, it, vi } from "vitest";
import {
  citedGroqSources,
  GROQ_AUDIT_SYSTEM,
  groqChat,
  normalizeSourceTitle,
  truncateToChars,
} from "./groq";
import { auditObservationSchema, sourceSchema } from "./types";

// Covers the Groq provider's pure mapping/normalization logic without hitting
// the network. Network calls (Groq + Tavily) are exercised by a separate live
// smoke test run manually with GROQ_API_KEY and TAVILY_API_KEY set.

describe("groq provider mapping helpers", () => {
  it("exposes the groq + tavily system label", () => {
    expect(GROQ_AUDIT_SYSTEM).toBe("Groq + Tavily");
  });

  it("normalizes a source title, falling back to the url", () => {
    expect(normalizeSourceTitle(undefined, "https://example.com")).toBe(
      "https://example.com",
    );
    expect(normalizeSourceTitle("  Kopi Kenangan  ", "https://e.com")).toBe(
      "Kopi Kenangan",
    );
  });

  it("truncates over-long titles with an ellipsis", () => {
    const long = "x".repeat(400);
    const out = normalizeSourceTitle(long, "https://e.com");
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves short text untouched and truncates long text with an ellipsis", () => {
    expect(truncateToChars("hello", 100)).toBe("hello");
    const out = truncateToChars("a".repeat(2000), 1500);
    expect(out.length).toBe(1500);
    expect(out.endsWith("…")).toBe(true);
    // Never returns more than maxChars.
    expect(truncateToChars("a".repeat(3000), 1500).length).toBe(1500);
  });

  it("keeps the final truncation below the requested cap even on a boundary case", () => {
    const out = truncateToChars("b".repeat(10), 1);
    expect(out.length).toBe(1);
    expect(out.endsWith("…")).toBe(true);
  });

  it("maps a Tavily-shaped result list into deduplicated Source[]", () => {
    // Replicates tavilySearch's dedupe + normalize behavior at the schema level.
    const raw = [
      { title: "A", url: "https://a.com", content: "snippet a" },
      { title: "B", url: "https://b.com", content: "snippet b" },
      { title: "A dup", url: "https://a.com", content: "duplicate url" },
    ];
    const seen = new Set<string>();
    const sources = raw
      .filter((r) => {
        const url = r.url?.trim();
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((r) => ({
        url: r.url,
        title: normalizeSourceTitle(r.title, r.url),
      }));

    expect(sources).toHaveLength(2);
    expect(sources.every((s) => sourceSchema.safeParse(s).success)).toBe(true);
  });

  it("produces an AuditObservation that satisfies the shared schema", () => {
    const observation = {
      prompt_id: "NUAVE-01",
      category: "solution_discovery",
      branded: true,
      question: "Is Kopi Kenangan available online in Jakarta?",
      system: GROQ_AUDIT_SYSTEM,
      requested_model: "llama-3.3-70b-versatile",
      returned_model: "llama-3.3-70b-versatile",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "Based on search, yes.",
      sources: [{ url: "https://kopikenangan.com", title: "Kopi Kenangan" }],
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        {
          stage: "observation",
          attempt: 1,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          latency_ms: 0,
          requested_model: "llama-3.3-70b-versatile",
          returned_model: "llama-3.3-70b-versatile",
          response_id: "",
          service_tier: "default",
          usage: {
            input_tokens: 0,
            cached_input_tokens: 0,
            cache_write_input_tokens: 0,
            output_tokens: 0,
            reasoning_output_tokens: 0,
            total_tokens: 0,
          },
          web_search_calls: 1,
          accounted_cost_usd: 0,
          cost_basis: "preflight_reservation",
          pricing_version: "groq-free-2026-08",
          failure_reason: "",
          provider_status: "",
          incomplete_reason: "",
          output_text_present: true,
          refusal_present: false,
        },
      ],
    };
    const result = auditObservationSchema.safeParse(observation);
    expect(result.success).toBe(true);
  });
});

describe("groq provenance: cited sources only", () => {
  const sources = [
    { url: "https://a.com", title: "A" },
    { url: "https://b.com", title: "B" },
    { url: "https://c.com", title: "C" },
    { url: "https://d.com", title: "D" },
    { url: "https://e.com", title: "E" },
  ];

  it("keeps only the sources the answer cited by [n] marker", () => {
    const answer =
      "Kopi Kenangan is available [1]. It also ships nationwide [3]. The rest is unverified.";
    const cited = citedGroqSources(answer, sources);
    expect(cited).toHaveLength(2);
    expect(cited.map((s) => s.url).sort()).toEqual([
      "https://a.com",
      "https://c.com",
    ]);
  });

  it("returns no sources when the answer cites nothing", () => {
    expect(
      citedGroqSources("No relevant public information found.", sources),
    ).toEqual([]);
  });

  it("ignores out-of-range markers", () => {
    const cited = citedGroqSources("Claims [0] and [6] and [2].", sources);
    expect(cited).toHaveLength(1);
    expect(cited[0].url).toBe("https://b.com");
  });
});

describe("groqChat: never hangs, never lies about quota", () => {
  const messages = [{ role: "user" as const, content: "ping" }];

  it("rejects a per-day-token (TPD) 429 in under a second and keeps the provider message", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-dummy-key");
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      headers: { get: () => "2776" },
      json: async () => ({
        error: {
          message:
            "Rate limit reached for model `llama-3.3-70b-versatile` on tokens per day (TPD): Limit 100000, Used 97730, Requested 4132.",
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const started = Date.now();
    await expect(
      groqChat({ model: "llama-3.3-70b-versatile", messages }),
    ).rejects.toThrow(/tokens per day \(TPD\)/);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(1000);
    // The provider's own text must reach the caller.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries a short-window 429 with a bounded backoff", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-dummy-key");
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 2) {
        return {
          ok: false,
          status: 429,
          headers: { get: () => "1" }, // 1 second retry-after, under the cap
          json: async () => ({ error: { message: "rate limited" } }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await groqChat({
      model: "llama-3.3-70b-versatile",
      messages,
    });
    expect(result.text).toBe("ok");
    // Exactly one retry, then success.
    expect(fetchMock.mock.calls.length).toBe(2);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("aborts a hung connection via the request timeout instead of hanging", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-dummy-key");
    const fetchMock = vi.fn(
      async (_url: string, init: { signal?: AbortSignal }) => {
        // Simulate a stalled connection that resolves only when aborted.
        return new Promise<Response>((_resolve, reject) => {
          const onAbort = () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          };
          if (init?.signal?.aborted) {
            onAbort();
            return;
          }
          init?.signal?.addEventListener?.("abort", onAbort);
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    // Shrink the per-call timeout so the test proves the abort fires rather than
    // waiting the real 60s production window.
    vi.stubEnv("GROQ_REQUEST_TIMEOUT_MS", "300");

    const started = Date.now();
    await expect(
      groqChat({ model: "llama-3.3-70b-versatile", messages }),
    ).rejects.toThrow();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fails fast on a missing key with zero fetch calls (config error is not retryable)", async () => {
    // Force the unconfigured state deterministically, regardless of any ambient
    // GROQ_API_KEY the runner happens to export.
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const started = Date.now();
    await expect(
      groqChat({ model: "llama-3.3-70b-versatile", messages }),
    ).rejects.toThrow(/GROQ_API_KEY is not configured/);
    const elapsed = Date.now() - started;
    // Must reject immediately, never backing off through the retry loop.
    expect(elapsed).toBeLessThan(1000);
    expect(fetchMock.mock.calls.length).toBe(0);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
