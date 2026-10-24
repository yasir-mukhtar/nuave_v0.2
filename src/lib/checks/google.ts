/**
 * Spec 018 R-12, R-13, R-16 and R-17: the Google check. The question goes to
 * Google Organic SERP (live, advanced, mobile) from the confirmed search
 * place, with the AI Overview loaded. Only the AI Overview's text and its
 * references are kept: never the rest of the page (it holds other businesses'
 * phone numbers), and never the raw response (R-28).
 */
import { SOURCE_TITLE_MAX_LENGTH } from "../audit/types";
import { namedOutcome, type NamedOutcome } from "./named";
import { stripPhoneNumbers } from "./phones";
import type { CheckSend } from "./send";

export const GOOGLE_CHECK_VERSION = "nuave-google-check-v1" as const;

/** R-12: the request, byte for byte the approved question (R-13). */
export function googleCheckBody(
  question: string,
  locationCode: number,
): Record<string, unknown> {
  return {
    keyword: question,
    location_code: locationCode,
    language_code: "id",
    device: "mobile",
    load_async_ai_overview: true,
  };
}

/** R-17: a completed Google check either showed an AI Overview with text, or
 * did not show one ("not shown" is a result, not a failure). */
export type GoogleOutcome = "summary" | "not_shown";

/** One saved Google result. */
export type GoogleCheck = {
  version: typeof GOOGLE_CHECK_VERSION;
  prompt_id: string;
  /** The text sent, byte for byte the approved question (R-13). */
  question: string;
  location_code: number;
  /** The place shown in the report ("Surabaya", "Indonesia"). */
  location_name: string;
  observed_at: string;
  outcome: GoogleOutcome;
  /** The AI Overview's text, phone numbers removed; empty when not shown. */
  text: string;
  references: { url: string; title: string }[];
  named: NamedOutcome;
  task_id: string;
  cost_usd: number;
  call_ms: number;
};

export type GoogleAttempt =
  | { kind: "done"; check: GoogleCheck }
  /** The element was there without text: retried once (R-17). */
  | { kind: "empty"; costUsd: number }
  | {
      kind: "failed";
      retry: boolean;
      unavailable: boolean;
      reason: string;
      costUsd: number;
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

function overviewText(item: Json): string {
  const markdown = text(item.markdown).trim();
  if (markdown) return markdown;
  return list(item.items)
    .map(
      (element) => text(element.markdown).trim() || text(element.text).trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Every reference inside the AI Overview element, unique by address. */
export function overviewReferences(
  item: Json,
): { url: string; title: string }[] {
  const seen = new Set<string>();
  const references: { url: string; title: string }[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    const node = record(value);
    if (!node) return;
    if (node.type === "ai_overview_reference") {
      const url = text(node.url).trim();
      if (/^https?:\/\//i.test(url) && url.length <= 2_000 && !seen.has(url)) {
        seen.add(url);
        references.push({
          url,
          title: stripPhoneNumbers(
            text(node.title) || text(node.source) || text(node.domain),
          ).slice(0, SOURCE_TITLE_MAX_LENGTH),
        });
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(item);
  return references;
}

/** Reads one SERP call into a Google result or a failed attempt. */
export function readGoogleAttempt(input: {
  send: CheckSend;
  promptId: string;
  question: string;
  locationCode: number;
  locationName: string;
  names: readonly string[];
}): GoogleAttempt {
  const { send } = input;
  const done = (
    outcome: GoogleOutcome,
    body = "",
    references: GoogleCheck["references"] = [],
  ): GoogleAttempt => ({
    kind: "done",
    check: {
      version: GOOGLE_CHECK_VERSION,
      prompt_id: input.promptId,
      question: input.question,
      location_code: input.locationCode,
      location_name: input.locationName,
      observed_at: send.completedAt.toISOString(),
      outcome,
      text: body,
      references,
      named:
        outcome === "summary"
          ? namedOutcome({
              text: body,
              sources: references,
              names: input.names,
            })
          : "absent",
      task_id: send.taskId,
      cost_usd: send.costUsd,
      call_ms: Math.max(
        0,
        send.completedAt.getTime() - send.startedAt.getTime(),
      ),
    },
  });
  const failed = (
    reason: string,
    retry: boolean,
    unavailable = false,
  ): GoogleAttempt => ({
    kind: "failed",
    retry,
    unavailable,
    reason,
    costUsd: send.costUsd,
  });
  if (send.outcome === "unavailable")
    return failed(
      `DataForSEO refused the request (status ${send.statusCode}).`,
      false,
      true,
    );
  if (send.outcome === "retry")
    return failed(
      send.transportError
        ? "The Google check timed out or the network failed."
        : `DataForSEO asked to try again (status ${send.statusCode}).`,
      true,
    );
  // R-14: no results means Google showed no AI Overview.
  if (send.outcome === "no_results") return done("not_shown");
  if (send.outcome === "failed" || !send.result)
    return failed(
      `The Google check failed (status ${send.statusCode ?? "unknown"}).`,
      false,
    );
  const overview = list(send.result.items).find(
    (item) => item.type === "ai_overview",
  );
  if (!overview) return done("not_shown");
  const body = stripPhoneNumbers(overviewText(overview));
  if (!body.trim()) return { kind: "empty", costUsd: send.costUsd };
  return done("summary", body, overviewReferences(overview));
}

/** R-17: an element empty twice is counted as not shown. */
export function notShownAfterEmpty(input: {
  send: CheckSend;
  promptId: string;
  question: string;
  locationCode: number;
  locationName: string;
}): GoogleCheck {
  return {
    version: GOOGLE_CHECK_VERSION,
    prompt_id: input.promptId,
    question: input.question,
    location_code: input.locationCode,
    location_name: input.locationName,
    observed_at: input.send.completedAt.toISOString(),
    outcome: "not_shown",
    text: "",
    references: [],
    named: "absent",
    task_id: input.send.taskId,
    cost_usd: input.send.costUsd,
    call_ms: Math.max(
      0,
      input.send.completedAt.getTime() - input.send.startedAt.getTime(),
    ),
  };
}
