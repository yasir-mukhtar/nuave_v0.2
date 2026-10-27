/**
 * Test B of the audit stack plan (founder decision 2026-10-26): a blind test
 * of report writers on saved orders that have both ChatGPT and Google answers.
 *
 * For each order, five entries:
 *   1. the report that was delivered (GPT-5.6 Luna, low effort, today's input);
 *   2. Luna, high effort, new input;
 *   3. Claude Sonnet 5.5, medium effort, new input;
 *   4. Claude Sonnet 5.5, high effort, new input;
 *   5. Claude Haiku 5.5, medium effort, new input.
 * "New input" is today's input plus the words of Google's AI Overview for each
 * question (phone numbers removed, long answers shortened): the change to
 * Spec 018 R-28 the founder approved with the plan.
 *
 * Every entry is built from the order's saved evidence by the same code the
 * order runner uses (orderReportInput, createValidatedAuditReport,
 * withTwoSourceBlock), so all fifteen reports pass the same checks and repairs.
 *
 * Nothing here calls a provider unless a live writer is passed in; every live
 * call is reserved against a USD 5 ledger first and refused when it could pass
 * it. Evidence, results and the letter key stay in the git-ignored
 * .local-evidence/report-writer-test/ folder.
 */
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import {
  hashSafetyIdentifier,
  reportContentFromAnswer,
  reportOutputSchema,
  reportRequest,
  structuredOutputOrThrow,
} from "../../src/lib/audit/openai";
import {
  createValidatedAuditReport,
  ReportPipelineError,
  type ReportGenerator,
} from "../../src/lib/audit/report-pipeline";
import {
  AUDIT_CALL_LIMITS,
  AuditCallExecutionError,
  completedCallTelemetry,
} from "../../src/lib/audit/telemetry";
import type { TwoSourceReportFacts } from "../../src/lib/audit/two-source-report";
import {
  type AuditCallTelemetry,
  type AuditReport,
  type ReportContent,
  type ReportSynthesis,
} from "../../src/lib/audit/types";
import { stripPhoneNumbers } from "../../src/lib/checks/phones";
import type { GoogleCheck } from "../../src/lib/checks/google";
import {
  orderReportInput,
  parseIntake,
  withTwoSourceBlock,
} from "../../src/lib/orders/runner";
import type { OrderQuestionRow } from "../../src/lib/orders/store";

/* -------------------------------- evidence -------------------------------- */

export const EVIDENCE_DIR = ".local-evidence/report-writer-test";
const ORDER_NUMBER = /^NV-[0-9A-Z]{6}$/;

/** What the harness needs from one order: the saved intake and report, and
 * its ten question rows. No email, payment or link columns. */
export type OrderEvidence = {
  order: {
    id: string;
    order_number: string;
    mode: "live" | "synthetic";
    intake_json: string;
    report_json: string;
  };
  rows: OrderQuestionRow[];
};

/** The read-only queries that export an order's evidence from D1. Run them
 * with `npx wrangler d1 execute SPEND_DB --remote --json --command "<sql>"`
 * and save each answer to raw/<order>-order.json and raw/<order>-questions.json. */
export function exportQueries(orderNumber: string) {
  if (!ORDER_NUMBER.test(orderNumber))
    throw new Error(`Not an order number: ${orderNumber}`);
  return {
    order: `SELECT id, order_number, mode, environment, state, created_at, started_at, completed_at, report_attempts, payment_kind, intake_json, report_json FROM orders WHERE order_number = '${orderNumber}'`,
    questions: `SELECT order_id, prompt_id, position, status, attempts, next_attempt_at, last_failure, attempts_json, observation_json, g_status, g_attempts, g_next_attempt_at, g_last_failure, g_empty, g_result_json, c_facts_json FROM order_questions WHERE order_id = (SELECT id FROM orders WHERE order_number = '${orderNumber}') ORDER BY position`,
  };
}

/** The rows of a `wrangler d1 execute --json` answer (the D1 API's shape). */
function d1Rows(answer: unknown): Record<string, unknown>[] {
  const first = Array.isArray(answer) ? answer[0] : answer;
  const results = (first as { results?: unknown })?.results;
  if (!Array.isArray(results)) throw new Error("Not a D1 query answer.");
  return results as Record<string, unknown>[];
}

/** Builds an order's evidence from its two D1 answers and checks it is a
 * delivered two-source order with ten saved questions. */
export function evidenceFromD1(
  orderAnswer: unknown,
  questionsAnswer: unknown,
): OrderEvidence {
  const [order] = d1Rows(orderAnswer);
  if (!order) throw new Error("The order export is empty.");
  for (const key of ["id", "order_number", "intake_json", "report_json"])
    if (typeof order[key] !== "string" || !order[key])
      throw new Error(`The order export has no ${key}.`);
  const rows = d1Rows(questionsAnswer).map(
    (row) =>
      ({
        claim_owner: null,
        claim_until: null,
        ...row,
      }) as OrderQuestionRow,
  );
  if (rows.length !== 10 || rows.some((row) => row.order_id !== order.id))
    throw new Error("The questions export must hold the order's ten rows.");
  if (rows.some((row) => row.g_status === null))
    throw new Error(
      "This order was approved before Spec 018: it has no Google answers.",
    );
  const intake = parseIntake({ intake_json: order.intake_json as string });
  if (!intake) throw new Error("The order's intake cannot be read.");
  return {
    order: {
      id: order.id as string,
      order_number: order.order_number as string,
      mode: order.mode === "synthetic" ? "synthetic" : "live",
      intake_json: order.intake_json as string,
      report_json: order.report_json as string,
    },
    rows: rows.sort((a, b) => a.position - b.position),
  };
}

export function loadEvidence(
  orderNumber: string,
  dir = EVIDENCE_DIR,
): OrderEvidence {
  const read = (name: string) =>
    JSON.parse(readFileSync(join(dir, "raw", name), "utf8")) as unknown;
  return evidenceFromD1(
    read(`${orderNumber}-order.json`),
    read(`${orderNumber}-questions.json`),
  );
}

/* --------------------------------- entries -------------------------------- */

export type EntryId =
  "delivered" | "luna-high" | "sonnet-medium" | "sonnet-high" | "haiku-medium";

export type Entry = {
  id: EntryId;
  label: string;
  provider: "openai" | "anthropic" | null;
  model: string | null;
  effort: "low" | "medium" | "high" | null;
  input: "today" | "new";
};

export const ENTRIES: readonly Entry[] = [
  {
    id: "delivered",
    label: "Delivered report: GPT-5.6 Luna, low effort, today's input",
    provider: null,
    model: null,
    effort: null,
    input: "today",
  },
  {
    id: "luna-high",
    label: "GPT-5.6 Luna, high effort, new input",
    provider: "openai",
    model: "gpt-5.6-luna",
    effort: "high",
    input: "new",
  },
  {
    id: "sonnet-medium",
    label: "Claude Sonnet 5.5, medium effort, new input",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    effort: "medium",
    input: "new",
  },
  {
    id: "sonnet-high",
    label: "Claude Sonnet 5.5, high effort, new input",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    effort: "high",
    input: "new",
  },
  {
    id: "haiku-medium",
    label: "Claude Haiku 5.5, medium effort, new input",
    provider: "anthropic",
    model: "claude-haiku-5-5",
    effort: "medium",
    input: "new",
  },
];

/** Longest Google answer the writer reads; the longest in NV-3WDSAY is 4,227
 * characters, so most answers arrive whole. */
export const GOOGLE_TEXT_MAX_CHARS = 3_000;

/** Shortens a Google answer at the last sentence (or word) end that fits,
 * and removes phone numbers again in case a saved answer predates the filter. */
export function trimGoogleText(text: string, max = GOOGLE_TEXT_MAX_CHARS) {
  const clean = stripPhoneNumbers(text).trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf(".\n"),
    cut.lastIndexOf("\n"),
  );
  const end = sentence > max * 0.6 ? sentence + 1 : cut.lastIndexOf(" ");
  return `${cut.slice(0, end > 0 ? end : max).trim()} …`;
}

/** The instruction that goes with the new input, added after today's
 * developer instruction. */
export const NEW_INPUT_INSTRUCTIONS = [
  "New in this input: each google_ai_overview item whose outcome is summary also has ai_overview_text, the words Google AI Overview showed for that question (phone numbers removed; long answers shortened and ending with …).",
  "Use ai_overview_text as evidence in the same way as the ChatGPT answers: say what Google told people, which businesses or kinds of places it pointed to, and what the business could publish so Google can name it. Use only what the text says.",
  "A finding or priority that uses ai_overview_text names Google AI Overview as its source and cites that question's prompt ID.",
].join("\n");

type FactsWithText = TwoSourceReportFacts & {
  google: (TwoSourceReportFacts["google"][number] & {
    ai_overview_text?: string;
  })[];
};

/** Today's report input, plus Google's words for the "new input" entries. */
export async function entryInput(evidence: OrderEvidence, entry: Entry) {
  const intake = parseIntake(evidence.order)!;
  const built = await orderReportInput({
    orderId: evidence.order.id,
    intake,
    rows: evidence.rows,
    mode: evidence.order.mode,
    now: new Date(),
  });
  const facts = built.input.two_source_facts;
  if (entry.input === "today" || !facts) return { ...built, intake };
  const texts = new Map(
    evidence.rows.map((row) => {
      const check = row.g_result_json
        ? (JSON.parse(row.g_result_json) as GoogleCheck)
        : null;
      return [
        row.prompt_id,
        row.g_status === "done" && check?.outcome === "summary"
          ? trimGoogleText(check.text)
          : "",
      ];
    }),
  );
  // Spec 021 Part B (B-01) gives the production writer Google's answer
  // texts. Once it does, the new input is simply the production input.
  if (productionSendsGoogleWords(built.input, [...texts.values()]))
    return { ...built, intake };
  const withText: FactsWithText = {
    ...facts,
    google: facts.google.map((fact) =>
      texts.get(fact.prompt_id)
        ? { ...fact, ai_overview_text: texts.get(fact.prompt_id) }
        : fact,
    ),
  };
  return {
    ...built,
    intake,
    input: { ...built.input, two_source_facts: withText },
  };
}

/** True when the production writer's own prompt already carries Google's
 * answer texts, so the harness adds nothing. Checked on the opening words of
 * each answer, as they appear inside the prompt's JSON. */
export function productionSendsGoogleWords(
  input: Parameters<typeof reportRequest>[0],
  texts: readonly string[],
): boolean {
  const user = reportRequest(input).input[1].content;
  const openings = texts
    .filter(Boolean)
    .map((text) => JSON.stringify(text.slice(0, 60)).slice(1, -1));
  return (
    openings.length > 0 && openings.every((opening) => user.includes(opening))
  );
}

/* --------------------------------- ledger --------------------------------- */

/** Founder decision 2026-10-26: agent-run calls for tests A and B, together,
 * stop at USD 5. */
export const HARD_STOP_USD = 5;

type LedgerCall = {
  at: string;
  order: string;
  entry: EntryId;
  model: string;
  reserved_usd: number;
  actual_usd: number | null;
};

export class SpendRefused extends Error {}

/** A file ledger of every live call: each call reserves its worst case before
 * it is sent and is refused when the money already spent plus that worst case
 * would pass the hard stop. A call that never settles (a crash mid-call) keeps
 * its worst case counted. */
export class Ledger {
  constructor(
    readonly path = join(EVIDENCE_DIR, "spend.json"),
    readonly hardStopUsd = HARD_STOP_USD,
  ) {}

  calls(): LedgerCall[] {
    return existsSync(this.path)
      ? (JSON.parse(readFileSync(this.path, "utf8")) as { calls: LedgerCall[] })
          .calls
      : [];
  }

  /** Settled calls at their cost, unsettled ones at their worst case. */
  spentUsd(): number {
    return round(
      this.calls().reduce(
        (sum, call) => sum + (call.actual_usd ?? call.reserved_usd),
        0,
      ),
    );
  }

  private save(calls: LedgerCall[]) {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(
      this.path,
      `${JSON.stringify({ hard_stop_usd: this.hardStopUsd, calls }, null, 2)}\n`,
    );
  }

  reserve(call: Omit<LedgerCall, "at" | "actual_usd">) {
    const spent = this.spentUsd();
    if (spent + call.reserved_usd > this.hardStopUsd)
      throw new SpendRefused(
        `Refused before sending: USD ${spent} spent + USD ${call.reserved_usd} worst case would pass the USD ${this.hardStopUsd} hard stop.`,
      );
    const calls = this.calls();
    const index = calls.length;
    this.save([
      ...calls,
      { ...call, at: new Date().toISOString(), actual_usd: null },
    ]);
    return {
      settle: (actualUsd: number) => {
        const now = this.calls();
        now[index] = { ...now[index]!, actual_usd: round(actualUsd) };
        this.save(now);
      },
    };
  }
}

const round = (usd: number) => Math.round(usd * 1e6) / 1e6;

/* --------------------------------- prices --------------------------------- */

/** USD per million tokens, standard tier, read 2026-10-26 (plan "Options and
 * prices"; Claude Haiku 5.5 doubles past 100K prompt tokens). */
export const PRICES: Record<
  string,
  { input: number; output: number; longInput?: number; longOutput?: number }
> = {
  "gpt-5.6-luna": { input: 0.2, output: 1.2 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    longInput: 0.5,
    longOutput: 2.5,
  },
};
const LONG_PROMPT_TOKENS = 100_000;

export function costUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const price = PRICES[model];
  if (!price) throw new Error(`No price for ${model}.`);
  const long =
    inputTokens > LONG_PROMPT_TOKENS && price.longInput !== undefined;
  return round(
    (inputTokens * (long ? price.longInput! : price.input) +
      outputTokens * (long ? price.longOutput! : price.output)) /
      1e6,
  );
}

/** A call's worst case before it is sent: every prompt character counted as a
 * token (the order guard's rule) and the whole output allowance used. */
export function worstCaseUsd(model: string, promptChars: number) {
  return costUsd(
    model,
    promptChars,
    AUDIT_CALL_LIMITS.report.max_output_tokens,
  );
}

/* --------------------------------- writers -------------------------------- */

type Request = ReturnType<typeof reportRequest>;
type WriterArgs = Parameters<ReportGenerator>;

/** The developer and user text of a report call, as production builds it,
 * with the new-input instruction when the harness added Google's words. */
export function entryPrompt(entry: Entry, ...args: WriterArgs) {
  const request: Request = reportRequest(
    args[0] as Parameters<typeof reportRequest>[0],
    args[1],
  );
  const developer =
    entry.input === "new" && harnessAddedGoogleWords(args[0])
      ? `${request.input[0].content}\n${NEW_INPUT_INSTRUCTIONS}`
      : request.input[0].content;
  return { request, developer, user: request.input[1].content };
}

function harnessAddedGoogleWords(input: WriterArgs[0]): boolean {
  return (
    input.two_source_facts?.google.some(
      (fact) => (fact as { ai_overview_text?: string }).ai_overview_text,
    ) ?? false
  );
}

/** What a writer did on one order, read by the scoring sheet. */
export type CallRecord = {
  model: string;
  revision: boolean;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  stop: string;
  cut_off: boolean;
};

export type WriterContext = {
  order: string;
  entry: Entry;
  ledger: Ledger;
  calls: CallRecord[];
};

function telemetryOf(input: {
  model: string;
  returnedModel: string;
  responseId: string;
  startedAt: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costUsd: number;
  stop: string;
  status: "completed" | "failed";
  failure?: string;
}): AuditCallTelemetry {
  const now = Date.now();
  return {
    stage: "report",
    attempt: 1,
    status: input.status,
    started_at: new Date(input.startedAt).toISOString(),
    completed_at: new Date(now).toISOString(),
    latency_ms: Math.max(0, now - input.startedAt),
    requested_model: input.model,
    returned_model: input.returnedModel,
    response_id: input.responseId,
    service_tier: "default",
    usage: {
      input_tokens: input.inputTokens,
      cached_input_tokens: input.cachedTokens,
      cache_write_input_tokens: 0,
      output_tokens: input.outputTokens,
      reasoning_output_tokens: 0,
      total_tokens: input.inputTokens + input.outputTokens,
    },
    web_search_calls: 0,
    accounted_cost_usd: input.costUsd,
    cost_basis: "provider_usage",
    pricing_version: "report-writer-test-2026-10-26",
    failure_reason: input.failure ?? "",
    provider_status: input.stop.slice(0, 60),
    incomplete_reason: input.stop === "max_tokens" ? "max_output_tokens" : "",
    output_text_present: input.status === "completed",
    refusal_present: input.stop === "refusal",
  };
}

/** The report content production builds from a writer's answer. */
const contentOf = (synthesis: ReportSynthesis, args: WriterArgs) =>
  reportContentFromAnswer(synthesis, args[0]);

/** Offline: returns the delivered report's own writing, so the pipeline can
 * be checked end to end without a provider. Re-running entry 1 this way must
 * give back the delivered report. */
export function replayWriter(delivered: AuditReport): ReportGenerator {
  return async () => ({
    content: {
      conclusion: delivered.conclusion,
      accuracy_status: delivered.accuracy_status,
      key_findings: delivered.key_findings,
      priorities: delivered.priorities,
      observed_competitors: delivered.observed_competitors,
      details: delivered.details,
    } as ReportContent,
    requested_model: delivered.provenance.requested_report_model,
    returned_model: delivered.provenance.returned_report_model,
    response_id: delivered.provenance.report_response_id,
    telemetry: [],
  });
}

/** Sends a provider call under its ledger hold. A request the provider turned
 * away (a 4xx answer other than a timeout) was not run or billed, so its hold
 * is released; any other failure stays held at its worst case, since it may
 * still be billed. */
async function sendHeld<T>(
  hold: { settle(usd: number): void },
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    const status = (error as { status?: unknown }).status;
    if (
      typeof status === "number" &&
      status >= 400 &&
      status < 500 &&
      status !== 408
    )
      hold.settle(0);
    throw error;
  }
}

/** GPT-5.6 Luna at the entry's effort, through the same request production
 * sends. */
export function lunaWriter(
  ctx: WriterContext,
  client = new OpenAI({ maxRetries: 0 }),
): ReportGenerator {
  return async (...args) => {
    const { request, developer } = entryPrompt(ctx.entry, ...args);
    const body = {
      ...request,
      reasoning: { effort: ctx.entry.effort! },
      input: [{ ...request.input[0], content: developer }, request.input[1]],
    } as Request;
    const promptChars = developer.length + request.input[1].content.length;
    const hold = ctx.ledger.reserve({
      order: ctx.order,
      entry: ctx.entry.id,
      model: ctx.entry.model!,
      reserved_usd: worstCaseUsd(ctx.entry.model!, promptChars),
    });
    const startedAt = Date.now();
    const response = await sendHeld(hold, () =>
      client.responses.parse(body, { timeout: 300_000 }),
    );
    const telemetry = completedCallTelemetry({
      stage: "report",
      started_at_ms: startedAt,
      requested_model: body.model,
      response,
    });
    hold.settle(telemetry.accounted_cost_usd);
    ctx.calls.push({
      model: response.model,
      revision: args[1] !== undefined,
      input_tokens: telemetry.usage.input_tokens,
      output_tokens: telemetry.usage.output_tokens,
      cost_usd: telemetry.accounted_cost_usd,
      stop: response.status ?? "",
      cut_off: response.incomplete_details?.reason === "max_output_tokens",
    });
    const synthesis = structuredOutputOrThrow<ReportSynthesis>(
      response.output_parsed,
      "Report generation",
      response,
    );
    return {
      content: contentOf(synthesis, args),
      requested_model: body.model,
      returned_model: response.model,
      response_id: response.id,
      telemetry: [telemetry],
    };
  };
}

/** The JSON text of a Claude answer, checked against the report schema. */
function parseAnswer(
  content: readonly { type: string; text?: string }[],
  schema: ReturnType<typeof reportOutputSchema>,
): { success: true; data: unknown } | { success: false; error: string } {
  const text = content
    .flatMap((block) => (block.type === "text" ? [block.text ?? ""] : []))
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, error: "the answer is not JSON" };
  }
  const result = schema.safeParse(json);
  return result.success
    ? { success: true, data: result.data }
    : {
        success: false,
        error: result.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      };
}

/** Claude at the entry's effort, adaptive thinking, the same developer and
 * user text as production, and the report schema as structured output. No
 * refusal fallback: a fallback model would blur the comparison, so a refusal
 * is recorded as a failed call. */
export function claudeWriter(
  ctx: WriterContext,
  client = new Anthropic({
    apiKey: process.env.NUAVE_ANTHROPIC_API_KEY,
    maxRetries: 0,
    // A key not scoped to a workspace must name one on every request.
    ...(process.env.NUAVE_ANTHROPIC_WORKSPACE_ID
      ? {
          defaultHeaders: {
            "anthropic-workspace-id": process.env.NUAVE_ANTHROPIC_WORKSPACE_ID,
          },
        }
      : {}),
  }),
): ReportGenerator {
  return async (...args) => {
    const [input, revision] = args;
    const { developer, user } = entryPrompt(ctx.entry, ...args);
    const model = ctx.entry.model!;
    const hold = ctx.ledger.reserve({
      order: ctx.order,
      entry: ctx.entry.id,
      model,
      reserved_usd: worstCaseUsd(model, developer.length + user.length),
    });
    // The answer is read and checked here, not by the SDK, so an answer that
    // breaks the report format is still recorded with its cost and reason.
    const schema = reportOutputSchema(input);
    const startedAt = Date.now();
    const response = await sendHeld(hold, () =>
      client.messages.create(
        {
          model,
          max_tokens: AUDIT_CALL_LIMITS.report.max_output_tokens,
          thinking: { type: "adaptive" },
          output_config: {
            effort: ctx.entry.effort!,
            format: zodOutputFormat(schema),
          },
          metadata: { user_id: hashSafetyIdentifier(input.safety_identifier) },
          system: developer,
          messages: [{ role: "user", content: user }],
        },
        { timeout: 600_000 },
      ),
    );
    const usage = response.usage;
    const inputTokens =
      usage.input_tokens +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);
    const cost = costUsd(model, inputTokens, usage.output_tokens);
    hold.settle(cost);
    const stop = response.stop_reason ?? "";
    ctx.calls.push({
      model: response.model,
      revision: revision !== undefined,
      input_tokens: inputTokens,
      output_tokens: usage.output_tokens,
      cost_usd: cost,
      stop,
      cut_off: stop === "max_tokens",
    });
    const base = {
      model,
      returnedModel: response.model,
      responseId: response.id,
      startedAt,
      inputTokens,
      cachedTokens: usage.cache_read_input_tokens ?? 0,
      outputTokens: usage.output_tokens,
      costUsd: cost,
      stop,
    };
    const parsed =
      stop === "end_turn" ? parseAnswer(response.content, schema) : null;
    if (!parsed?.success) {
      const failure =
        stop === "max_tokens"
          ? "The answer was cut off at the output limit."
          : stop === "refusal"
            ? "The model declined the request."
            : `The answer did not match the report schema: ${parsed?.error ?? stop}`;
      throw new AuditCallExecutionError(failure, [
        telemetryOf({ ...base, status: "failed", failure }),
      ]);
    }
    return {
      content: contentOf(parsed.data as ReportSynthesis, args),
      requested_model: model,
      returned_model: response.model,
      response_id: response.id,
      telemetry: [telemetryOf({ ...base, status: "completed" })],
    };
  };
}

/* ------------------------------ one report run ---------------------------- */

/** What the scoring sheet records for one entry on one order. */
export type EntryResult = {
  order: string;
  entry: EntryId;
  label: string;
  status: "ok" | "failed";
  failure: string | null;
  report: AuditReport | null;
  calls: CallRecord[];
  checks: {
    report_calls: number;
    language_fix_call: boolean;
    diagnostics: string[];
    cut_off_answers: number;
  };
  cost_usd: number;
  prompt_chars: number;
  /** Entry 1 only: whether re-running the delivered writing through today's
   * pipeline gave it back unchanged. */
  replay?: string;
};

/** Writes one entry's report from the order's evidence through the order
 * runner's pipeline, with the given writer (none: the delivered report). */
export async function runEntry(
  evidence: OrderEvidence,
  entry: Entry,
  writer: ((ctx: WriterContext) => ReportGenerator) | null,
  ledger: Ledger,
): Promise<EntryResult> {
  const delivered = JSON.parse(evidence.order.report_json) as AuditReport;
  const built = await entryInput(evidence, entry);
  const ctx: WriterContext = {
    order: evidence.order.order_number,
    entry,
    ledger,
    calls: [],
  };
  const { developer, user } = entryPrompt(entry, built.input);
  const base = {
    order: evidence.order.order_number,
    entry: entry.id,
    label: entry.label,
    prompt_chars: developer.length + user.length,
  };
  try {
    const written = await createValidatedAuditReport(
      built.input,
      writer ? writer(ctx) : replayWriter(delivered),
    );
    const report = withTwoSourceBlock(written, {
      rows: evidence.rows,
      prompts: built.intake.prompts,
      observations: built.observations,
      setup: built.setup,
      orderNumber: evidence.order.order_number,
    });
    const diagnostics = [
      ...new Set(
        report.operational_telemetry?.calls?.flatMap(
          (call) =>
            (call as { report_diagnostics?: string[] }).report_diagnostics ??
            [],
        ) ?? [],
      ),
    ];
    return {
      ...base,
      status: "ok",
      failure: null,
      report,
      calls: ctx.calls,
      checks: {
        report_calls: report.provenance.report_call_count,
        language_fix_call: report.provenance.language_retry_performed,
        diagnostics,
        cut_off_answers: ctx.calls.filter((call) => call.cut_off).length,
      },
      cost_usd: round(ctx.calls.reduce((sum, call) => sum + call.cost_usd, 0)),
    };
  } catch (error) {
    if (error instanceof SpendRefused) throw error;
    return {
      ...base,
      status: "failed",
      failure:
        error instanceof ReportPipelineError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error),
      report: null,
      calls: ctx.calls,
      checks: {
        report_calls: ctx.calls.length,
        language_fix_call: ctx.calls.some((call) => call.revision),
        diagnostics: [],
        cut_off_answers: ctx.calls.filter((call) => call.cut_off).length,
      },
      cost_usd: round(ctx.calls.reduce((sum, call) => sum + call.cost_usd, 0)),
    };
  }
}

/** The writing the founder judges, as the writer gave it. Code-built blocks
 * (counts, competitors) are left out: they change with the code, not the
 * writer. */
export function writerText(report: AuditReport) {
  return {
    conclusion: report.conclusion,
    accuracy_status: report.accuracy_status,
    key_findings: report.key_findings,
    priorities: report.priorities,
    details: report.details,
  };
}

/** Re-runs the delivered report's own writing through today's pipeline.
 * When today's writer version is the one that wrote it, the result must be
 * unchanged: proof that the other entries get the order's real input and
 * checks. A report from an earlier writer version (before Spec 021 Part B,
 * say) is shown as delivered and not compared. */
export async function replayDelivered(
  evidence: OrderEvidence,
  ledger: Ledger,
): Promise<{ result: EntryResult; note: string; reproduced: boolean | null }> {
  const delivered = JSON.parse(evidence.order.report_json) as AuditReport;
  const result = await runEntry(evidence, ENTRIES[0]!, null, ledger);
  const was = delivered.provenance.report_prompt_version;
  if (result.status !== "ok")
    return {
      result,
      note: `not compared: today's pipeline did not accept the delivered writing (${result.failure}); delivered by writer version ${was}`,
      reproduced: null,
    };
  const now = result.report!.provenance.report_prompt_version;
  if (now !== was)
    return {
      result,
      note: `not compared: delivered by writer version ${was}, today's is ${now}`,
      reproduced: null,
    };
  const same =
    JSON.stringify(writerText(result.report!)) ===
    JSON.stringify(writerText(delivered));
  return {
    result,
    note: same
      ? "reproduced unchanged"
      : "CHANGED: today's pipeline altered the delivered writing",
    reproduced: same,
  };
}

/** Entry 1's record: the delivered report as saved, with the calls, repairs
 * and cost it recorded itself (a replay starts from the already repaired
 * writing, so it cannot see them). */
export function deliveredResult(
  replay: EntryResult,
  delivered: AuditReport,
  note: string,
): EntryResult {
  const reportCalls = delivered.operational_telemetry.calls.filter(
    (call) => call.stage === "report",
  );
  const calls = reportCalls.map((call, index) => ({
    model: call.returned_model,
    revision: index > 0,
    input_tokens: call.usage.input_tokens,
    output_tokens: call.usage.output_tokens,
    cost_usd: call.accounted_cost_usd,
    stop: call.provider_status,
    cut_off: call.incomplete_reason === "max_output_tokens",
  }));
  return {
    ...replay,
    status: "ok",
    failure: null,
    replay: note,
    report: delivered,
    calls,
    checks: {
      report_calls: delivered.provenance.report_call_count,
      language_fix_call: delivered.provenance.language_retry_performed,
      diagnostics: [
        ...new Set(
          reportCalls.flatMap(
            (call) =>
              (call as { report_diagnostics?: string[] }).report_diagnostics ??
              [],
          ),
        ),
      ],
      cut_off_answers: calls.filter((call) => call.cut_off).length,
    },
    cost_usd: round(calls.reduce((sum, call) => sum + call.cost_usd, 0)),
  };
}

/* ---------------------------------- blind --------------------------------- */

const LETTERS = ["A", "B", "C", "D", "E"] as const;

/** A random letter per entry, per order. The key is kept apart from the
 * review pack and opened only after scoring. */
export function assignLetters(
  orders: readonly string[],
  pick: (n: number) => number = (n) => randomInt(n),
): Record<string, Record<string, EntryId>> {
  const key: Record<string, Record<string, EntryId>> = {};
  for (const order of orders) {
    const ids = ENTRIES.map((entry) => entry.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = pick(i + 1);
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    key[order] = Object.fromEntries(
      LETTERS.map((letter, i) => [letter, ids[i]!]),
    );
  }
  return key;
}

/** Writer names and response ids that must not appear in what the founder
 * reads. "ChatGPT" and the answer source's label ("… gpt-6 with web search")
 * name the tested source, not the writer, and stay. */
const TELLTALE =
  /gpt-5\.6|\bluna\b|claude|sonnet|haiku|anthropic|\bresp_|\bmsg_/i;

/** The report as the founder sees it in the blind review: the writer's model
 * and response ids are hidden, the call records dropped, and every entry of an
 * order carries the delivered report's date. */
export function blindReport(
  report: AuditReport,
  deliveredAt: string,
): AuditReport {
  return {
    ...report,
    generated_at: deliveredAt,
    provenance: {
      ...report.provenance,
      requested_report_model: "hidden",
      returned_report_model: "hidden",
      report_response_id: "hidden",
      initial_report_response_id: "hidden",
    },
    operational_telemetry: {
      ...report.operational_telemetry,
      pricing_version: "hidden",
      calls: [],
    },
  };
}

/** Fails when a blinded report still names a model, provider or response. */
export function telltaleIn(report: AuditReport): string | null {
  return JSON.stringify(report).match(TELLTALE)?.[0] ?? null;
}
