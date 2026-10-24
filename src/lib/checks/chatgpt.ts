/**
 * Spec 018 R-12, R-13, R-14 and R-16: the ChatGPT check. The question goes to
 * the ChatGPT app through DataForSEO's ChatGPT LLM Scraper, always from
 * Indonesia (the scraper accepts countries only). The answer is saved as an
 * ordinary observation so the report pipeline reads it like any answer; phone
 * numbers are removed first, and whether it names the business is decided
 * here, by code.
 */
import { DATAFORSEO_CHATGPT_SYSTEM } from "../audit/approved-live-providers";
import type {
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
} from "../audit/types";
import { SOURCE_TITLE_MAX_LENGTH } from "../audit/types";
import { INDONESIA_LOCATION_CODE } from "../discovery/places";
import { namedOutcome, type NamedOutcome } from "./named";
import { stripPhoneNumbers } from "./phones";
import type { CheckSend } from "./send";

/** Recorded as the observation's instruction version: the question is sent
 * as it is, with no instruction around it. */
export const CHATGPT_APP_METHOD_VERSION = "nuave-chatgpt-app-v1";
/** No model can be chosen; the app decides. The returned model is recorded. */
export const CHATGPT_APP_REQUESTED_MODEL = "chatgpt-app";
export const DATAFORSEO_PRICING_VERSION = "dataforseo-2026-10";
export const CHATGPT_PLACE_NAME = "Indonesia";

/** R-12: the request, byte for byte the approved question (R-13). */
export function chatgptCheckBody(question: string): Record<string, unknown> {
  return {
    keyword: question,
    location_code: INDONESIA_LOCATION_CODE,
    language_code: "id",
    force_web_search: true,
  };
}

/** Facts saved beside the observation (R-12, R-13, R-16). */
export type ChatGptFacts = {
  named: NamedOutcome;
  location_code: number;
  location_name: string;
  item_types: string[];
  call_ms: number;
  /** Names ChatGPT itself listed (brand entities, local-business cards). */
  businesses: string[];
};

export type ChatGptAttempt =
  | {
      kind: "answered";
      observation: AuditObservation;
      facts: ChatGptFacts;
      telemetry: AuditCallTelemetry;
    }
  | {
      kind: "failed";
      /** False when another attempt cannot help (R-14). */
      retry: boolean;
      /** Credentials, access, balance or cost limit (R-14, R-21). */
      unavailable: boolean;
      reason: string;
      telemetry: AuditCallTelemetry;
    };

type Json = Record<string, unknown>;
const record = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
const list = (value: unknown): Json[] =>
  Array.isArray(value)
    ? value.flatMap((item): Json[] => {
        const entry = record(item);
        return entry ? [entry] : [];
      })
    : [];
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

function httpUrl(value: unknown): string | null {
  const url = text(value).trim();
  if (!/^https?:\/\//i.test(url) || url.length > 2_000) return null;
  try {
    return new URL(url).hostname ? url : null;
  } catch {
    return null;
  }
}

/** The sources ChatGPT cited, unique by address. */
export function chatgptSources(result: Json): { url: string; title: string }[] {
  const seen = new Set<string>();
  const sources: { url: string; title: string }[] = [];
  const add = (item: Json) => {
    const url = httpUrl(item.url);
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({
      url,
      title: stripPhoneNumbers(
        text(item.title) || text(item.source_name) || text(item.domain),
      ).slice(0, SOURCE_TITLE_MAX_LENGTH),
    });
  };
  list(result.sources).forEach(add);
  for (const item of list(result.items)) list(item.sources).forEach(add);
  return sources;
}

function cardLine(card: Json): string | null {
  const title = text(card.title).trim();
  if (!title) return null;
  const rating = record(card.rating)?.value;
  return [
    title,
    typeof rating === "number" ? `rating ${rating}` : null,
    text(card.address).trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The answer as saved: ChatGPT's markdown, plus the local-business cards and
 * tables it showed outside that markdown (name, rating, address; never the
 * phone), with every phone number removed (R-12, R-28).
 */
export function chatgptAnswerText(result: Json): string {
  const markdown = text(result.markdown).trim();
  const extra: string[] = [];
  for (const item of list(result.items)) {
    if (item.type === "chat_gpt_local_businesses") {
      const lines = list(item.items)
        .map(cardLine)
        .filter((line): line is string => Boolean(line))
        .filter((line) => !markdown.includes(line.split(" · ")[0]));
      if (lines.length)
        extra.push(
          [
            "Bisnis yang ditampilkan ChatGPT:",
            ...lines.map((l) => `- ${l}`),
          ].join("\n"),
        );
    }
    if (item.type === "chat_gpt_table") {
      const table = text(item.markdown).trim();
      if (table && !markdown.includes(table)) extra.push(table);
    }
  }
  return stripPhoneNumbers([markdown, ...extra].filter(Boolean).join("\n\n"));
}

/** Names ChatGPT listed itself: brand entities and local-business cards. */
export function chatgptBusinesses(result: Json): string[] {
  const names = [
    ...list(result.brand_entities).map((entity) => text(entity.title)),
    ...list(result.items).flatMap((item) => [
      ...list(item.brand_entities).map((entity) => text(entity.title)),
      ...(item.type === "chat_gpt_local_businesses"
        ? list(item.items).map((card) => text(card.title))
        : []),
    ]),
  ]
    .map((name) => stripPhoneNumbers(name.trim()))
    .filter(Boolean);
  return [...new Set(names)].slice(0, 20);
}

function telemetryFor(input: {
  send: CheckSend;
  attempt: number;
  status: "completed" | "failed";
  returnedModel: string;
  sources: number;
  failure: string;
  category?: string;
  outputText: boolean;
}): AuditCallTelemetry {
  return {
    stage: "observation",
    attempt: input.attempt,
    status: input.status,
    started_at: input.send.startedAt.toISOString(),
    completed_at: input.send.completedAt.toISOString(),
    latency_ms: Math.max(
      0,
      input.send.completedAt.getTime() - input.send.startedAt.getTime(),
    ),
    requested_model: CHATGPT_APP_REQUESTED_MODEL,
    returned_model: input.returnedModel,
    response_id: input.send.taskId,
    service_tier: "dataforseo-live",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    web_search_calls: input.sources > 0 ? 1 : 0,
    accounted_cost_usd: input.send.costUsd,
    cost_basis: "provider_usage",
    pricing_version: DATAFORSEO_PRICING_VERSION,
    failure_reason: input.failure,
    provider_status: String(input.send.statusCode ?? "transport").slice(0, 60),
    incomplete_reason: "",
    output_text_present: input.outputText,
    refusal_present: false,
    automatic: input.attempt > 1,
    ...(input.category ? { safe_failure_category: input.category } : {}),
  };
}

/** Reads one scraper call into an answer or a failed attempt (R-14). */
export function readChatGptAttempt(input: {
  send: CheckSend;
  prompt: AuditPrompt;
  attempt: number;
  /** The business name and confirmed aliases (R-16). */
  names: readonly string[];
}): ChatGptAttempt {
  const { send } = input;
  const failed = (
    reason: string,
    retry: boolean,
    category: string,
    unavailable = false,
  ): ChatGptAttempt => ({
    kind: "failed",
    retry,
    unavailable,
    reason,
    telemetry: telemetryFor({
      send,
      attempt: input.attempt,
      status: "failed",
      returnedModel: "",
      sources: 0,
      failure: reason,
      category,
      outputText: false,
    }),
  });
  if (send.outcome === "unavailable")
    return failed(
      `DataForSEO refused the request (status ${send.statusCode}).`,
      false,
      "non_retryable",
      true,
    );
  if (send.outcome === "retry")
    return failed(
      send.transportError
        ? "The ChatGPT check timed out or the network failed."
        : `DataForSEO asked to try again (status ${send.statusCode}).`,
      true,
      "temporary",
    );
  if (send.outcome === "no_results")
    return failed(
      "ChatGPT returned no answer (status 40102).",
      true,
      "empty_or_unusable",
    );
  if (send.outcome === "failed" || !send.result)
    return failed(
      `The ChatGPT check failed (status ${send.statusCode ?? "unknown"}).`,
      false,
      "non_retryable",
    );
  const result = send.result;
  const answer = chatgptAnswerText(result);
  if (!answer.trim())
    return failed(
      "ChatGPT returned no usable answer.",
      true,
      "empty_or_unusable",
    );
  const sources = chatgptSources(result);
  const returnedModel = text(result.model).trim().slice(0, 80) || "unknown";
  const telemetry = telemetryFor({
    send,
    attempt: input.attempt,
    status: "completed",
    returnedModel,
    sources: sources.length,
    failure: "",
    outputText: true,
  });
  const observation: AuditObservation = {
    prompt_id: input.prompt.prompt_id,
    category: input.prompt.category,
    branded: input.prompt.branded,
    question: input.prompt.question,
    instruction_version: CHATGPT_APP_METHOD_VERSION,
    system: DATAFORSEO_CHATGPT_SYSTEM,
    requested_model: CHATGPT_APP_REQUESTED_MODEL,
    returned_model: returnedModel,
    response_id: send.taskId,
    observed_at: send.completedAt.toISOString(),
    raw_answer: answer,
    sources,
    run_status: "completed",
    failure_reason: "",
    telemetry: [telemetry],
  };
  return {
    kind: "answered",
    observation,
    telemetry,
    facts: {
      named: namedOutcome({ text: answer, sources, names: input.names }),
      location_code: INDONESIA_LOCATION_CODE,
      location_name: CHATGPT_PLACE_NAME,
      item_types: list(result.items)
        .map((item) => text(item.type))
        .filter(Boolean)
        .slice(0, 20),
      call_ms: telemetry.latency_ms,
      businesses: chatgptBusinesses(result),
    },
  };
}

/** The honest record of a ChatGPT check whose attempts are used up: no
 * answer, the last reason, and every attempt's telemetry (R-20). */
export function failedChatGptObservation(input: {
  prompt: AuditPrompt;
  reason: string;
  telemetry: AuditCallTelemetry[];
  at: Date;
}): AuditObservation {
  return {
    prompt_id: input.prompt.prompt_id,
    category: input.prompt.category,
    branded: input.prompt.branded,
    question: input.prompt.question,
    instruction_version: CHATGPT_APP_METHOD_VERSION,
    system: DATAFORSEO_CHATGPT_SYSTEM,
    requested_model: CHATGPT_APP_REQUESTED_MODEL,
    returned_model: "",
    response_id: "",
    observed_at: input.at.toISOString(),
    raw_answer: "",
    sources: [],
    run_status: "failed",
    failure_reason: input.reason || "The ChatGPT check could not be completed.",
    telemetry: input.telemetry,
  };
}
