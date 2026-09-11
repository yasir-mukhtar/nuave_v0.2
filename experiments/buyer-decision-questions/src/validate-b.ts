/**
 * Condition B output parsing and contract validation.
 *
 * B is validated against its own experimental contract only — never pushed
 * through the old ten-slot predicates (slot identity policies, comparison
 * relation markers, fit/misfit/trade-off wording, forced question forms).
 * Failures are exposed in the record; B is never silently repaired with the
 * old deterministic fallback.
 */
import type { MinimizedIndonesianBrief } from "../../../src/lib/audit/questions-id";
import {
  classifyIndonesianQuestion,
  normalizeIndonesianIdentity,
} from "../../../src/lib/audit/questions-id";
import {
  B_COMPOSITION,
  B_MIN_COVERAGE,
  COVERAGE_VALUES,
  type CoverageValue,
} from "./experiment-config";
import type { BValidationIssue } from "./records";

export type BQuestion = {
  text: string;
  coverage: CoverageValue;
  limitation?: string;
};

export type BPack = {
  questions: BQuestion[];
  limitations: string[];
};

function isBQuestion(value: unknown): value is BQuestion {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.text !== "string") return false;
  if (
    typeof record.coverage !== "string" ||
    !COVERAGE_VALUES.some((value) => value === record.coverage)
  ) {
    return false;
  }
  if (record.limitation !== undefined && typeof record.limitation !== "string") {
    return false;
  }
  return true;
}

/** Parses a Responses API body into the B output contract. Returns an error
 * reason instead of throwing so callers can record the unresolved attempt. */
export function parseBResponseBody(body: unknown):
  | { kind: "parsed"; pack: BPack }
  | { kind: "error"; reason: string } {
  if (typeof body !== "object" || body === null) {
    return { kind: "error", reason: "Provider returned no body." };
  }
  const record = body as Record<string, unknown>;
  const error = record.error as { message?: string } | undefined;
  if (error?.message) {
    return { kind: "error", reason: `Provider error: ${error.message}` };
  }
  if (record.status && record.status !== "completed") {
    return { kind: "error", reason: `Provider status ${String(record.status)}.` };
  }
  const items = (record.output as Array<Record<string, unknown>> | undefined) ?? [];
  for (const item of items) {
    if (item.type !== "message") continue;
    const content = (item.content as Array<Record<string, unknown>> | undefined) ?? [];
    for (const part of content) {
      if (part.type === "refusal") {
        return { kind: "error", reason: "Provider refused the request." };
      }
      if (part.type !== "output_text") continue;
      let parsed: unknown = part.parsed;
      if (parsed === null || parsed === undefined) {
        if (typeof part.text !== "string") continue;
        try {
          parsed = JSON.parse(part.text);
        } catch {
          return { kind: "error", reason: "Structured output text was not valid JSON." };
        }
      }
      if (typeof parsed !== "object" || parsed === null) continue;
      const parsedRecord = parsed as Record<string, unknown>;
      const questions = parsedRecord.questions;
      const limitations = parsedRecord.limitations;
      if (
        !Array.isArray(questions) ||
        questions.length !== 10 ||
        !questions.every(isBQuestion)
      ) {
        return {
          kind: "error",
          reason:
            "Provider output did not match the B contract (expected 10 items with text and a valid coverage tag).",
        };
      }
      if (!Array.isArray(limitations) || !limitations.every((item) => typeof item === "string")) {
        return { kind: "error", reason: "Provider output limitations must be an array of strings." };
      }
      return {
        kind: "parsed",
        pack: { questions: questions as BQuestion[], limitations: limitations as string[] },
      };
    }
  }
  return { kind: "error", reason: "Provider returned no usable output." };
}

const UNEXECUTABLE_MIN_LENGTH = 8;
const MAX_QUESTION_LENGTH = 700;

/**
 * Deterministic B contract checks. Every issue is surfaced in the run record;
 * nothing here rewrites a question.
 */
export function validateBPack(
  pack: BPack,
  minimized: MinimizedIndonesianBrief,
): BValidationIssue[] {
  const issues: BValidationIssue[] = [];
  const { questions } = pack;

  if (questions.length !== 10) {
    issues.push({
      index: null,
      rule: "count",
      message: `Condition B must return exactly 10 requests, received ${questions.length}.`,
    });
    return issues;
  }

  questions.forEach((question, position) => {
    const index = position + 1;
    const text = question.text.trim();
    if (!text) {
      issues.push({
        index,
        rule: "empty",
        message: `Request ${index} is empty.`,
      });
      return;
    }
    if (text.length < UNEXECUTABLE_MIN_LENGTH) {
      issues.push({
        index,
        rule: "length",
        message: `Request ${index} is too short to be a standalone customer request.`,
      });
    }
    if (text.length > MAX_QUESTION_LENGTH) {
      issues.push({
        index,
        rule: "length",
        message: `Request ${index} exceeds ${MAX_QUESTION_LENGTH} characters.`,
      });
    }
    if (!COVERAGE_VALUES.some((value) => value === question.coverage)) {
      issues.push({
        index,
        rule: "coverage_tag",
        message: `Request ${index} has an unknown coverage tag "${String(question.coverage)}".`,
      });
    }
  });

  const seen = new Set<string>();
  questions.forEach((question, position) => {
    const key = normalizeIndonesianIdentity(question.text);
    if (seen.has(key)) {
      issues.push({
        index: position + 1,
        rule: "duplicate",
        message: `Request ${position + 1} is an exact duplicate of another request in the pack.`,
      });
    } else {
      seen.add(key);
    }
  });

  const namedCount = questions.filter(
    (question) =>
      classifyIndonesianQuestion(question.text, minimized) === "menyebut_bisnis_anda",
  ).length;
  if (namedCount !== B_COMPOSITION.named) {
    issues.push({
      index: null,
      rule: "named_composition",
      message: `Condition B must contain ${B_COMPOSITION.named} requests naming the business and ${B_COMPOSITION.unnamed} without, counted from the final text; found ${namedCount} named.`,
    });
  }

  const counts: Record<CoverageValue, number> = {
    discover_options: 0,
    find_for_need: 0,
    evaluate_business: 0,
    compare_alternatives: 0,
    drawback_check: 0,
  };
  for (const question of questions) {
    counts[question.coverage] += 1;
  }
  for (const requirement of Object.entries(B_MIN_COVERAGE)) {
    const tag = requirement[0] as CoverageValue;
    if (counts[tag] < requirement[1]) {
      issues.push({
        index: null,
        rule: "coverage_requirement",
        message: `Condition B must include at least ${requirement[1]} request tagged ${tag}; found ${counts[tag]}.`,
      });
    }
  }

  const namedComparison = questions.some(
    (question) =>
      question.coverage === "compare_alternatives" &&
      classifyIndonesianQuestion(question.text, minimized) === "menyebut_bisnis_anda",
  );
  const unnamedComparison = questions.some(
    (question) =>
      question.coverage === "compare_alternatives" &&
      classifyIndonesianQuestion(question.text, minimized) === "tanpa_menyebut_bisnis_anda",
  );
  if (!namedComparison) {
    issues.push({
      index: null,
      rule: "coverage_requirement",
      message:
        "Condition B must include at least one named comparison request (a comparison that names the audited business).",
    });
  }
  if (!unnamedComparison) {
    issues.push({
      index: null,
      rule: "coverage_requirement",
      message:
        "Condition B must include at least one unnamed comparison request (a comparison that does not name the audited business).",
    });
  }

  return issues;
}
