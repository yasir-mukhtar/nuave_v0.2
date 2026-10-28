/**
 * Spec 021 PR 6b (go-live of 2026-10-28): the report writer on Claude. Every
 * live two-source order's report is written by the model `NUAVE_REPORT_WRITER`
 * names, a row of `CLAUDE_WRITERS` in `models.ts`: Claude Opus 5.5 at medium
 * effort (the founder's pick after the reading test) or Claude Sonnet 5.5 at
 * high effort (the cheaper one). `docs/MODELS.md` says how to switch.
 *
 * The request is the production writer's own text (`reportRequest`) and
 * answer format (`reportOutputSchema`), and the answer goes through
 * `reportContentFromAnswer`, so the checks, repairs and language fix are the
 * same whatever writes. The report-writer test builds its Claude requests
 * with `claudeReportRequest` too.
 */
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { CLAUDE_REPORT_CALL_MS } from "./call-timeouts";
import {
  hashSafetyIdentifier,
  reportContentFromAnswer,
  reportOutputSchema,
  reportRequest,
} from "./openai";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  checkAuditBudget,
} from "./telemetry";
import type {
  AuditCallTelemetry,
  ReportContent,
  ReportSynthesis,
  TwoSourceWritingSynthesis,
} from "./types";
import { hasWriterFacts } from "./two-source-writer";
import {
  recordProviderNotice,
  reserveProviderSpend,
  SpendCapError,
} from "../spending/provider-spend";
import {
  CLAUDE_WRITERS,
  type ClaudeEffort,
  type ClaudeWriter,
  reportWriterEffort,
} from "./models";

export { CLAUDE_WRITERS, type ClaudeWriter };

/** Prices read 2026-10-28 (claude.com/pricing): standard tier; cache reads
 * at their own price, cache writes 1.25 times the input price. */
export const CLAUDE_PRICING_VERSION = "anthropic-standard-2026-10-28";

/** A report request counted above this is rebuilt with fewer pages; one
 * still above it is never sent (Spec 021 PR 6b: so three calls always fit
 * the USD 5.00 hold). The test's request was about 107,000 tokens. */
export const CLAUDE_INPUT_CEILING_TOKENS = 150_000;

/** The report writer the deploy names: null for today's OpenAI writer
 * (`NUAVE_REPORT_WRITER` unset). Any other value throws, so the cron fails
 * closed. */
export function configuredReportWriter(): ClaudeWriter | null {
  const raw = process.env.NUAVE_REPORT_WRITER?.trim();
  if (!raw) return null;
  if (raw in CLAUDE_WRITERS) return raw as ClaudeWriter;
  throw new Error(
    `Unrecognized NUAVE_REPORT_WRITER="${raw}". Valid values are ${Object.keys(CLAUDE_WRITERS).join(", ")}, or unset.`,
  );
}

/** The writer's request, from the production writer's own text: the
 * developer text as `system`, the user text as the one user message, the
 * answer format as structured output, adaptive thinking. */
export function claudeReportRequest(input: {
  model: string;
  effort: ClaudeEffort;
  maxTokens: number;
  developer: string;
  user: string;
  schema: z.ZodType;
  safetyIdentifier: string;
}) {
  // Only the JSON schema is sent; the answer is checked here, so an answer
  // that breaks the format is a failed call with its cost recorded.
  const { type, schema } = zodOutputFormat(input.schema);
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    thinking: { type: "adaptive" as const },
    output_config: {
      effort: input.effort,
      format: { type, schema },
    },
    metadata: { user_id: hashSafetyIdentifier(input.safetyIdentifier) },
    system: input.developer,
    messages: [{ role: "user" as const, content: input.user }],
  };
}

/** The token count's request: what the count endpoint accepts of the call. */
export function claudeCountRequest(
  request: ReturnType<typeof claudeReportRequest>,
) {
  const { model, system, messages, thinking, output_config } = request;
  return { model, system, messages, thinking, output_config };
}

export function claudeClient(): Anthropic {
  const apiKey = process.env.NUAVE_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("NUAVE_ANTHROPIC_API_KEY is not configured.");
  const workspace = process.env.NUAVE_ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic({
    apiKey,
    // The runner's step retry decides; a retry inside the SDK would spend
    // the call's time limit and its reservation twice.
    maxRetries: 0,
    // A key not scoped to a workspace must name one on every request.
    ...(workspace
      ? { defaultHeaders: { "anthropic-workspace-id": workspace } }
      : {}),
  });
}

/** USD for a call's usage, at the model's prices. */
export function claudeCostUsd(
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  },
): number {
  const known = (Object.keys(CLAUDE_WRITERS) as ClaudeWriter[]).find(
    (name) => model === name || model.startsWith(`${name}-`),
  );
  // An unexpected model name is priced as the dearer writer, never less.
  const price = CLAUDE_WRITERS[known ?? "claude-opus-5-5"].usdPerMillion;
  const usd =
    (usage.input_tokens * price.input +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * price.input * 1.25 +
      usage.output_tokens * price.output) /
    1_000_000;
  return Math.round(usd * 100_000_000) / 100_000_000;
}

/** The kind of Anthropic problem, for the founder notice's subject. */
function problemGroup(error: unknown): "busy" | "key" | "credit" | "other" {
  if (!(error instanceof APIError) || error.status === undefined)
    return "other";
  if (retryableStatus(error.status)) return "busy";
  if (error.status === 401 || error.status === 403) return "key";
  if (/credit/i.test(`${error.message} ${JSON.stringify(error.error ?? "")}`))
    return "credit";
  return "other";
}

const retryableStatus = (status: number) => status === 429 || status >= 500;

type Input = Parameters<typeof reportRequest>[0];
type Revision = Parameters<typeof reportRequest>[1];

/** The same input with fewer of its pages (the writer reads the most
 * important first, so the last are dropped). */
function withPages(input: Input, keep: number): Input {
  const facts = input.two_source_facts;
  if (!facts?.writer?.pages) return input;
  const pages = facts.writer.pages.slice(0, keep);
  const { pages: _dropped, ...writer } = facts.writer;
  void _dropped;
  return {
    ...input,
    two_source_facts: {
      ...facts,
      writer: pages.length ? { ...writer, pages } : writer,
    },
  };
}

export type ClaudeDeps = {
  client?: Pick<Anthropic, "messages">;
  /** The call's whole time limit (tests pass a short one). */
  callMs?: number;
  reserve?: typeof reserveProviderSpend;
  notice?: typeof recordProviderNotice;
};

/**
 * One report call on Claude (`generateReportContent`'s contract). The call's
 * token count and its whole stream share one time limit
 * (`CLAUDE_REPORT_CALL_MS`), shorter than the order lease.
 *
 * Errors, from the count or the call:
 * - 429, 529 or another 5xx answered before the stream starts: nothing ran;
 *   the reservation is released and `SpendCapError("unavailable")` gives
 *   the attempt back, so a later run tries again.
 * - Any other 4xx answered before the stream: released, and the attempt
 *   counts (`AuditCallExecutionError`).
 * - A network error, an abort, or anything after the stream started: the
 *   call may have run and been billed, so the reservation stays held and
 *   the attempt counts.
 * Each records one founder notice a day for its kind of problem.
 */
export async function generateClaudeReportContent(
  input: Input,
  revision?: Revision,
  deps: ClaudeDeps = {},
): Promise<{
  content: ReportContent;
  requested_model: string;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const model = configuredReportWriter();
  if (!model) throw new Error("No Claude report writer is configured.");
  if (!hasWriterFacts(input.two_source_facts))
    throw new Error("The Claude writer writes two-source reports only.");
  const spec = CLAUDE_WRITERS[model];
  const client = deps.client ?? claudeClient();
  const signal = AbortSignal.timeout(deps.callMs ?? CLAUDE_REPORT_CALL_MS);
  const startedAt = Date.now();
  const schema = reportOutputSchema(input);
  const build = (sent: Input) => {
    const { input: messages } = reportRequest(sent, revision);
    return claudeReportRequest({
      model,
      effort: reportWriterEffort(model),
      maxTokens: spec.maxTokens,
      developer: messages[0].content,
      user: messages[1].content,
      schema,
      safetyIdentifier: sent.safety_identifier,
    });
  };
  const failed = (
    message: string,
    costUsd: number,
    extra: Partial<AuditCallTelemetry> = {},
  ) =>
    new AuditCallExecutionError(message, [
      telemetryOf({ model, startedAt, costUsd, failure: message, ...extra }),
    ]);
  const notice = (error: unknown) =>
    (deps.notice ?? recordProviderNotice)({
      kind: "anthropic_error",
      subject: `${new Date().toISOString().slice(0, 10)} ${problemGroup(error)}`,
      detail: {
        status: error instanceof APIError ? (error.status ?? null) : null,
      },
    });

  // The token count, with the pages cut down when the request is too long:
  // all of them, then half, then none.
  const pageCount = input.two_source_facts.writer.pages?.length ?? 0;
  const keeps = [...new Set([pageCount, Math.floor(pageCount / 2), 0])];
  let request = build(input);
  let tokens = 0;
  for (const keep of keeps) {
    request = build(keep === pageCount ? input : withPages(input, keep));
    try {
      tokens = (
        await client.messages.countTokens(claudeCountRequest(request), {
          signal,
        })
      ).input_tokens;
    } catch (error) {
      await notice(error);
      if (
        error instanceof APIError &&
        error.status !== undefined &&
        retryableStatus(error.status)
      )
        throw new SpendCapError("unavailable");
      throw failed(
        `The report request could not be counted: ${error instanceof Error ? error.message : "unknown error"}`,
        0,
      );
    }
    if (tokens <= CLAUDE_INPUT_CEILING_TOKENS) break;
  }
  if (tokens > CLAUDE_INPUT_CEILING_TOKENS)
    // Always too long: no call is sent, and the order fails at once
    // (REPORT_LIMIT_EXHAUSTED) instead of risking its hold.
    throw new AuditBudgetError(
      `The report request is ${tokens} tokens, above the ${CLAUDE_INPUT_CEILING_TOKENS}-token ceiling, even without pages.`,
    );

  const reservedCost = claudeCostUsd(model, {
    input_tokens: tokens,
    output_tokens: spec.maxTokens,
  });
  checkAuditBudget({ budget: input.budget, stage: "report", reservedCost });
  const spend = await (deps.reserve ?? reserveProviderSpend)({
    provider: "anthropic",
    stage: "report",
    usd: reservedCost,
  });

  let started = false;
  let response: Anthropic.Messages.Message;
  try {
    const stream = client.messages.stream(request, { signal });
    stream.on("connect", () => {
      started = true;
    });
    response = await stream.finalMessage();
  } catch (error) {
    await notice(error);
    const answered =
      !started && error instanceof APIError && error.status !== undefined;
    if (answered && error.status !== 408) {
      await spend.settle(0);
      if (retryableStatus(error.status!))
        throw new SpendCapError("unavailable");
      throw failed(`Anthropic refused the report call (${error.status}).`, 0);
    }
    // It may have run: the reservation stays held.
    throw failed(
      error instanceof Error ? error.message : "The report call failed.",
      reservedCost,
      { cost_basis: "preflight_reservation" },
    );
  }

  const costUsd = claudeCostUsd(response.model, response.usage);
  await spend.settle(costUsd);
  const stop = response.stop_reason ?? "";
  const usage = {
    input_tokens:
      response.usage.input_tokens +
      (response.usage.cache_read_input_tokens ?? 0) +
      (response.usage.cache_creation_input_tokens ?? 0),
    cached_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    cache_write_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
    output_tokens: response.usage.output_tokens,
    reasoning_output_tokens: 0,
    total_tokens: 0,
  };
  usage.total_tokens = usage.input_tokens + usage.output_tokens;
  const answered = {
    returned_model: response.model,
    response_id: response.id,
    usage,
    cost_basis: "provider_usage" as const,
    provider_status: stop,
    output_text_present: response.content.some(
      (block) => block.type === "text" && block.text.length > 0,
    ),
    refusal_present: stop === "refusal",
  };
  if (stop !== "end_turn") {
    if (stop === "refusal") await notice(null);
    throw failed(
      stop === "max_tokens"
        ? "The report was cut off at the output allowance."
        : stop === "refusal"
          ? "Claude declined to write the report."
          : `The report call ended with ${stop || "no stop reason"}.`,
      costUsd,
      answered,
    );
  }
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  let parsed: ReturnType<typeof schema.safeParse> | null = null;
  try {
    parsed = schema.safeParse(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success)
    throw failed(
      `The report did not match its format: ${
        parsed
          ? parsed.error.issues
              .slice(0, 5)
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
          : "the answer is not JSON"
      }`,
      costUsd,
      answered,
    );
  return {
    content: reportContentFromAnswer(
      parsed.data as ReportSynthesis | TwoSourceWritingSynthesis,
      input,
    ),
    requested_model: model,
    returned_model: response.model,
    response_id: response.id,
    telemetry: [
      telemetryOf({
        model,
        startedAt,
        costUsd,
        status: "completed",
        ...answered,
      }),
    ],
  };
}

function telemetryOf(
  input: {
    model: string;
    startedAt: number;
    costUsd: number;
    failure?: string;
  } & Partial<AuditCallTelemetry>,
): AuditCallTelemetry {
  const now = Date.now();
  const { model, startedAt, costUsd, failure, ...rest } = input;
  return {
    stage: "report",
    attempt: 1,
    status: "failed",
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date(now).toISOString(),
    latency_ms: Math.max(0, now - startedAt),
    requested_model: model,
    returned_model: "",
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
    web_search_calls: 0,
    accounted_cost_usd: costUsd,
    cost_basis: "provider_usage",
    pricing_version: CLAUDE_PRICING_VERSION,
    failure_reason: failure ?? "",
    provider_status: "",
    incomplete_reason: "",
    output_text_present: false,
    refusal_present: false,
    ...rest,
  };
}
