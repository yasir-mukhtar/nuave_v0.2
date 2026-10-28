import { APIConnectionError, APIError } from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spend = vi.hoisted(() => ({
  settle: vi.fn(async (usd: number) => void usd),
  reserved: [] as number[],
  notices: [] as { kind: string; subject: string }[],
}));
import { containsPhoneNumber } from "../checks/phones";
import { SpendCapError } from "../spending/provider-spend";
import {
  CLAUDE_INPUT_CEILING_TOKENS,
  claudeCostUsd,
  configuredReportWriter,
  generateClaudeReportContent,
  type ClaudeDeps,
} from "./anthropic-report";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "./direct-ten-context-v2";
import { syntheticTwoSourceWriting } from "./local-direct-ten-audit";
import { hashSafetyIdentifier, reportRequest } from "./openai";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  serverOwnedAuditBudget,
} from "./telemetry";
import type { AuditObservation, AuditPrompt } from "./types";

// Spec 021 PR 6b: the Claude report writer, offline. The Anthropic client is
// a test double; no request leaves the machine.

const brief = {
  version: DIRECT_TEN_CONTEXT_VERSION,
  identity: {
    name: "Klinik Fiksi",
    source: "https://fiksi.example/",
    sourceOrigin: "owner",
    aliases: [],
    origin: "owner",
  },
  focus: { value: { kind: "brand" }, origin: "owner" },
  category: { value: "Klinik kecantikan", origin: "website" },
  offerings: { value: ["Konsultasi"], origin: "website" },
  serviceChannels: { value: ["on_premise"], origin: "website" },
  market: { value: { reach: "seluruh", areas: [] }, origin: "owner" },
  comparators: { value: { mode: "unknown" }, origin: "nuave" },
} as unknown as DirectTenAuditContext;

const page = (n: number) => ({
  url: `https://hadirr${n}.example/a`,
  domain: `hadirr${n}.example`,
  title: "Daftar klinik",
  kind: "cited" as const,
  cited_in: ["q1"],
  text: `Klinik terbaik nomor ${n}`,
});

const IDS = Array.from({ length: 10 }, (_, i) => `q${i + 1}`);

function input(pages = [page(1), page(2)]) {
  const observations = IDS.map(
    (id) =>
      ({
        prompt_id: id,
        question: `Klinik botox di Surabaya? (${id})`,
        raw_answer: "Klinik Satu melayani botox.",
        run_status: "completed",
        sources: [{ url: "https://satu.example/", title: "Satu" }],
      }) as unknown as AuditObservation,
  );
  return {
    brief,
    prompts: IDS.map(
      (id) =>
        ({
          prompt_id: id,
          question: `Klinik botox di Surabaya? (${id})`,
        }) as AuditPrompt,
    ),
    observations,
    safety_identifier: "order-safety-id",
    budget: serverOwnedAuditBudget(),
    language: "id" as const,
    question_method: "direct-ten" as const,
    two_source: true,
    two_source_facts: {
      subject: "klinik" as const,
      counts: {
        chatgpt: { completed: 10, named: 0 },
        google: { completed: 10, summaries: 10, named: 0 },
      },
      google: IDS.map((id) => ({
        prompt_id: id,
        outcome: "summary" as const,
        business_named: false,
        cited_domains: ["dua.example"],
      })),
      writer: {
        questions: IDS.map((id, i) => ({
          prompt_id: id,
          ordinal: i + 1,
          topic: "botox",
          volume: 880,
          named: { chatgpt: "absent" as const, google: "absent" as const },
          google_text: "Klinik Dua melayani botox.",
          businesses: { chatgpt: ["Klinik Satu"], google: ["Klinik Dua"] },
        })),
        businesses: ["Klinik Satu", "Klinik Dua"],
        ...(pages.length ? { pages } : {}),
      },
    },
  } as unknown as Parameters<typeof reportRequest>[0];
}

/** A valid answer for the input, as the synthetic writer writes it. */
function answer(sent = input()) {
  const facts = sent.two_source_facts as Parameters<
    typeof syntheticTwoSourceWriting
  >[2];
  return JSON.stringify(
    syntheticTwoSourceWriting(sent.observations, "Klinik Fiksi", facts),
  );
}

type Sent = { body: Record<string, unknown>; signal?: AbortSignal };

function client(options: {
  tokens?: number[];
  count?: () => Promise<{ input_tokens: number }>;
  stream?: (sent: Sent, connect: () => void) => Promise<unknown>;
  message?: Partial<{
    stop_reason: string;
    text: string;
    usage: Record<string, number>;
    model: string;
  }>;
}) {
  const counted: Sent[] = [];
  const streamed: Sent[] = [];
  const tokens = [...(options.tokens ?? [107_000])];
  const fake = {
    messages: {
      countTokens: vi.fn(
        async (
          body: Record<string, unknown>,
          opts?: { signal?: AbortSignal },
        ) => {
          counted.push({ body, signal: opts?.signal });
          if (options.count) return options.count();
          return { input_tokens: tokens.shift() ?? 107_000 };
        },
      ),
      stream: vi.fn(
        (body: Record<string, unknown>, opts?: { signal?: AbortSignal }) => {
          const sent = { body, signal: opts?.signal };
          streamed.push(sent);
          let onConnect = () => {};
          const message = {
            id: "msg_1",
            model: options.message?.model ?? "claude-opus-5-5",
            stop_reason: options.message?.stop_reason ?? "end_turn",
            content: [
              { type: "text", text: options.message?.text ?? answer() },
            ],
            usage: options.message?.usage ?? {
              input_tokens: 107_000,
              output_tokens: 12_000,
            },
          };
          return {
            on(event: string, fn: () => void) {
              if (event === "connect") onConnect = fn;
              return this;
            },
            finalMessage: () =>
              options.stream
                ? options.stream(sent, () => onConnect())
                : (onConnect(), Promise.resolve(message)),
          };
        },
      ),
    },
  };
  return {
    deps: {
      client: fake as unknown as ClaudeDeps["client"],
      reserve: async (input: { usd: number }) => {
        spend.reserved.push(input.usd);
        return { settle: spend.settle };
      },
      notice: async (input: { kind: string; subject: string }) => {
        spend.notices.push(input);
      },
    } as ClaudeDeps,
    counted,
    streamed,
  };
}

/** An error as the API answers it: `{type: "error", error: {type, message}}`. */
const apiError = (status: number, message = "error") =>
  APIError.generate(
    status,
    { type: "error", error: { type: "invalid_request_error", message } },
    undefined,
    new Headers(),
  );

beforeEach(() => {
  vi.stubEnv("NUAVE_REPORT_WRITER", "claude-opus-5-5");
  spend.settle.mockClear();
  spend.reserved.length = 0;
  spend.notices.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("which writer", () => {
  it("unset is today's writer; Opus or Sonnet by name; anything else fails closed", () => {
    vi.stubEnv("NUAVE_REPORT_WRITER", "");
    expect(configuredReportWriter()).toBeNull();
    vi.stubEnv("NUAVE_REPORT_WRITER", "claude-sonnet-5-5");
    expect(configuredReportWriter()).toBe("claude-sonnet-5-5");
    vi.stubEnv("NUAVE_REPORT_WRITER", "claude-opus");
    expect(() => configuredReportWriter()).toThrow(/NUAVE_REPORT_WRITER/);
  });
});

describe("the request (the production writer's own text)", () => {
  it("sends the developer text as system, the user text, the answer format, the effort and allowance, and the hashed id", async () => {
    const fake = client({});
    await generateClaudeReportContent(input(), undefined, fake.deps);
    const body = fake.streamed[0]!.body as {
      model: string;
      max_tokens: number;
      thinking: unknown;
      output_config: { effort: string; format: { type: string } & object };
      metadata: { user_id: string };
      system: string;
      messages: { role: string; content: string }[];
    };
    const request = reportRequest(input());
    expect(body.system).toBe(request.input[0].content);
    expect(body.messages).toEqual([
      { role: "user", content: request.input[1].content },
    ]);
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.max_tokens).toBe(24_000);
    expect(body.thinking).toEqual({ type: "adaptive" });
    expect(body.output_config.effort).toBe("medium");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format).not.toHaveProperty("parse");
    expect(body.metadata.user_id).toBe(hashSafetyIdentifier("order-safety-id"));
    expect(body.messages[0]!.content).toContain("hadirr1.example");
    expect(containsPhoneNumber(JSON.stringify(body))).toBe(false);
    // The count sends only what the count endpoint takes.
    expect(Object.keys(fake.counted[0]!.body).sort()).toEqual([
      "messages",
      "model",
      "output_config",
      "system",
      "thinking",
    ]);
    // One time limit covers the count and the whole stream.
    expect(fake.counted[0]!.signal).toBeDefined();
    expect(fake.streamed[0]!.signal).toBe(fake.counted[0]!.signal);
  });

  it("Sonnet writes at high effort with a 32,000-token allowance", async () => {
    vi.stubEnv("NUAVE_REPORT_WRITER", "claude-sonnet-5-5");
    const fake = client({ message: { model: "claude-sonnet-5-5" } });
    await generateClaudeReportContent(input(), undefined, fake.deps);
    const body = fake.streamed[0]!.body as {
      max_tokens: number;
      output_config: { effort: string };
    };
    expect(body.max_tokens).toBe(32_000);
    expect(body.output_config.effort).toBe("high");
  });
});

describe("spending", () => {
  it("reserves the counted input and the whole allowance, and settles at the real usage", async () => {
    const fake = client({});
    const result = await generateClaudeReportContent(
      input(),
      undefined,
      fake.deps,
    );
    expect(spend.reserved).toEqual([
      claudeCostUsd("claude-opus-5-5", {
        input_tokens: 107_000,
        output_tokens: 24_000,
      }),
    ]);
    const cost = (107_000 * 4 + 12_000 * 20) / 1e6;
    expect(spend.settle).toHaveBeenCalledWith(cost);
    expect(result.telemetry[0]).toMatchObject({
      status: "completed",
      requested_model: "claude-opus-5-5",
      returned_model: "claude-opus-5-5",
      accounted_cost_usd: cost,
      pricing_version: "anthropic-standard-2026-10-28",
    });
    expect(result.content.key_findings.length).toBeGreaterThan(0);
  });

  it("prices cache reads and writes, and an unknown model as Opus", () => {
    expect(
      claudeCostUsd("claude-sonnet-5-5", {
        input_tokens: 1_000_000,
        output_tokens: 0,
        cache_read_input_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
      }),
    ).toBeCloseTo(2 + 0.2 + 2.5, 8);
    expect(
      claudeCostUsd("claude-new-model", {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
      }),
    ).toBe(24);
  });

  it("a request over the ceiling is sent with half its pages, then none", async () => {
    const pages = [page(1), page(2), page(3), page(4)];
    const fake = client({ tokens: [200_000, 160_000, 90_000] });
    await generateClaudeReportContent(input(pages), undefined, fake.deps);
    expect(fake.counted).toHaveLength(3);
    const user = (fake.streamed[0]!.body.messages as { content: string }[])[0]!
      .content;
    expect(user).not.toContain("hadirr1.example");
    // Without pages the request is the one with no reading at all.
    expect(user).toBe(reportRequest(input([])).input[1].content);
  });

  it("one still over the ceiling without pages is never sent, and the order fails at once", async () => {
    const fake = client({
      tokens: [CLAUDE_INPUT_CEILING_TOKENS + 1, 160_000, 151_000],
    });
    await expect(
      generateClaudeReportContent(input(), undefined, fake.deps),
    ).rejects.toThrow(AuditBudgetError);
    expect(fake.streamed).toHaveLength(0);
    expect(spend.reserved).toEqual([]);
  });
});

describe("how a call ends", () => {
  it.each([
    ["max_tokens", /cut off/],
    ["refusal", /declined/],
  ])(
    "%s is a failed call with its cost (the attempt counts)",
    async (stop, message) => {
      const fake = client({ message: { stop_reason: stop } });
      const error = await generateClaudeReportContent(
        input(),
        undefined,
        fake.deps,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(AuditCallExecutionError);
      expect(error.message).toMatch(message);
      expect(error.telemetry[0].accounted_cost_usd).toBeGreaterThan(0);
      expect(spend.settle).toHaveBeenCalled();
    },
  );

  it("an answer that breaks the format is a failed call", async () => {
    const fake = client({ message: { text: '{"verdict": 1}' } });
    await expect(
      generateClaudeReportContent(input(), undefined, fake.deps),
    ).rejects.toThrow(/did not match its format/);
  });

  it("429, 529 or 5xx before the stream: released, and the attempt is given back", async () => {
    for (const status of [429, 529, 500]) {
      spend.settle.mockClear();
      const fake = client({
        stream: async () => {
          throw apiError(status);
        },
      });
      await expect(
        generateClaudeReportContent(input(), undefined, fake.deps),
      ).rejects.toThrow(SpendCapError);
      expect(spend.settle).toHaveBeenCalledWith(0);
    }
    expect(spend.notices.map((n) => n.subject.split(" ")[1])).toEqual([
      "busy",
      "busy",
      "busy",
    ]);
  });

  it("a busy token count gives the attempt back too, before any reservation", async () => {
    const fake = client({
      count: async () => {
        throw apiError(529);
      },
    });
    await expect(
      generateClaudeReportContent(input(), undefined, fake.deps),
    ).rejects.toThrow(SpendCapError);
    expect(spend.reserved).toEqual([]);
  });

  it("a bad key or no credit: released, the attempt counts, and the notice says which", async () => {
    for (const [status, message, group] of [
      [401, "invalid x-api-key", "key"],
      [400, "Your credit balance is too low", "credit"],
    ] as const) {
      spend.settle.mockClear();
      spend.notices.length = 0;
      const fake = client({
        stream: async () => {
          throw apiError(status, message);
        },
      });
      const error = await generateClaudeReportContent(
        input(),
        undefined,
        fake.deps,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(AuditCallExecutionError);
      expect(error).not.toBeInstanceOf(SpendCapError);
      expect(spend.settle).toHaveBeenCalledWith(0);
      expect(spend.notices).toEqual([
        {
          kind: "anthropic_error",
          subject: expect.stringMatching(new RegExp(` ${group}$`)),
          detail: { status },
        },
      ]);
    }
  });

  it("a network error, or an error once the stream started, keeps the reservation", async () => {
    for (const fail of [
      async () => {
        throw new APIConnectionError({ message: "reset" });
      },
      async (_sent: Sent, connect: () => void) => {
        connect();
        throw apiError(529);
      },
    ]) {
      spend.settle.mockClear();
      const fake = client({ stream: fail });
      const error = await generateClaudeReportContent(
        input(),
        undefined,
        fake.deps,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(AuditCallExecutionError);
      expect(error).not.toBeInstanceOf(SpendCapError);
      expect(spend.settle).not.toHaveBeenCalled();
      expect(error.telemetry[0]).toMatchObject({
        cost_basis: "preflight_reservation",
        accounted_cost_usd: spend.reserved.at(-1),
      });
    }
  });

  it("a stream that stops sending is aborted at the call's time limit", async () => {
    const fake = client({
      stream: (sent, connect) => {
        connect();
        return new Promise((_resolve, reject) =>
          sent.signal!.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        );
      },
    });
    const error = await generateClaudeReportContent(input(), undefined, {
      ...fake.deps,
      callMs: 20,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(AuditCallExecutionError);
    expect(fake.streamed[0]!.signal!.aborted).toBe(true);
  });
});
