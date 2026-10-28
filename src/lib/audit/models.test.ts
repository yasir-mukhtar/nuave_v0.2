import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLAUDE_WRITERS,
  OPENAI_MODEL_PRICES,
  READING_DEFAULT,
  readingEffort,
  readingModel,
  reportWriterEffort,
} from "./models";
import { completedCallTelemetry, reserveAuditCall } from "./telemetry";
import { fixtureBudget } from "./fixtures/telemetry";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("step 3 model", () => {
  it("is GPT-5.6 Luna at medium effort when the deploy names none", () => {
    vi.stubEnv("NUAVE_READING_MODEL", "");
    vi.stubEnv("NUAVE_READING_EFFORT", "");
    expect(READING_DEFAULT).toEqual({
      model: "gpt-5.6-luna",
      effort: "medium",
    });
    expect(readingModel()).toBe("gpt-5.6-luna");
    expect(readingEffort()).toBe("medium");
  });

  it("switches by setting, and the other calls' effort never changes it", () => {
    vi.stubEnv("NUAVE_READING_MODEL", "gpt-6-luna");
    vi.stubEnv("NUAVE_READING_EFFORT", "low");
    vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "max");
    expect(readingModel()).toBe("gpt-6-luna");
    expect(readingEffort()).toBe("low");
  });

  it("fails closed for a model with no price or an unknown effort", () => {
    vi.stubEnv("NUAVE_READING_MODEL", "gpt-9-imaginary");
    expect(() => readingModel()).toThrow(/has no price in OPENAI_MODEL_PRICES/);
    vi.stubEnv("NUAVE_READING_EFFORT", "extra");
    expect(() => readingEffort()).toThrow(
      /NUAVE_READING_EFFORT must be one of/,
    );
  });
});

describe("the cost guard prices every row", () => {
  const usage = {
    input_tokens: 1_000_000,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: 1_000_000,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 2_000_000,
  };
  const response = (model: string) =>
    ({
      id: "resp_fixture",
      model,
      status: "completed",
      service_tier: "default",
      output: [],
      usage,
    }) as never;

  it.each(Object.keys(OPENAI_MODEL_PRICES))(
    "%s: a call is reserved and recorded at its own prices",
    (model) => {
      const prices =
        OPENAI_MODEL_PRICES[model as keyof typeof OPENAI_MODEL_PRICES];
      expect(
        reserveAuditCall({
          budget: fixtureBudget,
          stage: "extract",
          request: { model },
          requested_model: model,
          has_web_search: false,
        }),
      ).toBeGreaterThan(0);
      // One million tokens each way is over the long-context line.
      const call = completedCallTelemetry({
        stage: "extract",
        started_at_ms: Date.now(),
        requested_model: model,
        response: response(model),
      });
      expect(call.accounted_cost_usd).toBeCloseTo(
        prices.long.input + prices.long.output,
        8,
      );
    },
  );

  it("refuses an answer from another model than the one asked", () => {
    expect(() =>
      completedCallTelemetry({
        stage: "extract",
        started_at_ms: Date.now(),
        requested_model: "gpt-6-luna",
        response: response("gpt-5.6-luna"),
      }),
    ).toThrow(/pinned to the requested gpt-6-luna/);
  });
});

describe("step 7 writer effort", () => {
  it("is the writer's own unless NUAVE_REPORT_EFFORT names one", () => {
    vi.stubEnv("NUAVE_REPORT_EFFORT", "");
    expect(reportWriterEffort("claude-opus-5-5")).toBe(
      CLAUDE_WRITERS["claude-opus-5-5"].effort,
    );
    vi.stubEnv("NUAVE_REPORT_EFFORT", "high");
    expect(reportWriterEffort("claude-opus-5-5")).toBe("high");
    vi.stubEnv("NUAVE_REPORT_EFFORT", "extreme");
    expect(() => reportWriterEffort("claude-opus-5-5")).toThrow(
      /NUAVE_REPORT_EFFORT must be one of/,
    );
  });
});
