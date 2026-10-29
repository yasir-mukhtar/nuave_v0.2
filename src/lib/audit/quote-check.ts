/**
 * Spec 023, founder's guide (2026-10-29): a quotation in the writer's prose
 * must be the saved words of a ChatGPT answer, a Google AI Overview or a
 * question the passage cites, or of a page Nuave read. The writer may cut a
 * quotation with "[…]"; every piece must then appear, in order, in one of
 * those texts. A sentence whose quotation cannot be found is listed for the
 * one revision, and dropped after it.
 */
import { stripPhoneNumbers } from "../checks/phones";
import type { TwoSourceReportFacts } from "./two-source-report";
import type { AuditObservation, ReportContent } from "./types";

/** A quotation is checked when it has at least this many words; a quoted
 * term or label ("Disebut") is not a quotation of an answer. */
const MIN_QUOTE_WORDS = 3;

/** Double quotation marks, curly or straight, and curly single ones. */
const QUOTE = /“([^”]+)”|"([^"]+)"|‘([^’]+)’/g;

/** A cut inside a quotation: "[…]", "[...]", "…" or "...". */
const CUT = /\s*(?:\[\s*(?:…|\.\.\.)\s*\]|…|\.\.\.)\s*/;

/** Text as compared: no markdown, links reduced to their words, one kind of
 * quotation mark and apostrophe, one space, lower case. */
export function normalizeForQuote(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\([^\s])/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/[*_](?=\S)|(?<=\S)[*_]/g, "")
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("id-ID");
}

const words = (text: string) => text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

/** Whether one quotation is found in one of the texts: each piece, in
 * order, after punctuation the writer closed the quotation with. */
export function quoteFound(quote: string, texts: readonly string[]): boolean {
  const pieces = quote
    .split(CUT)
    .map((piece) =>
      normalizeForQuote(piece).replace(/^[\s,.;:!?]+|[\s,.;:!?]+$/g, ""),
    )
    .filter((piece) => piece.length > 1);
  if (!pieces.length) return true;
  return texts.some((raw) => {
    const text = normalizeForQuote(raw);
    let at = 0;
    for (const piece of pieces) {
      const found = text.indexOf(piece, at);
      if (found < 0) return false;
      at = found + piece.length;
    }
    return true;
  });
}

/** The quotations in a text that are long enough to check, with where they
 * sit. */
function quotations(text: string) {
  return [...text.matchAll(QUOTE)]
    .map((m) => ({
      quote: m[1] ?? m[2] ?? m[3] ?? "",
      start: m.index!,
      end: m.index! + m[0].length,
    }))
    .filter((q) => words(q.quote) >= MIN_QUOTE_WORDS);
}

/** Sentence spans, never ending inside a quotation. A sentence ends at ".",
 * "!" or "?" before a space, or at a quotation closed by one of them. */
function sentenceSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  let start = 0;
  let open: string | null = null;
  const end = (i: number) => {
    if (!/\s/.test(text[i + 1] ?? "")) return;
    spans.push([start, i + 1]);
    start = i + 1;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (open) {
      if (
        (open === "“" && ch === "”") ||
        (open === '"' && ch === '"') ||
        (open === "‘" && ch === "’")
      ) {
        open = null;
        if (/[.!?]/.test(text[i - 1] ?? "")) end(i);
      }
      continue;
    }
    if (ch === "“" || ch === '"' || ch === "‘") open = ch;
    else if (/[.!?]/.test(ch)) end(i);
  }
  if (text.slice(start).trim()) spans.push([start, text.length]);
  return spans;
}

/** The texts a passage may quote: the saved answers, Google AI Overviews
 * and questions for these prompt IDs (all of them when none are given),
 * every page Nuave read, and the names and topics the report may put in
 * quotation marks as labels. Each as the writer read it: without phone
 * numbers. */
export function quotableTexts(
  ids: readonly string[] | undefined,
  facts: TwoSourceReportFacts,
  observations: readonly AuditObservation[],
  questions: ReadonlyMap<string, string>,
): string[] {
  const all = facts.writer?.questions.map((q) => q.prompt_id) ?? [
    ...questions.keys(),
  ];
  const wanted = new Set(ids?.length ? ids : all);
  return [
    ...observations
      .filter((o) => wanted.has(o.prompt_id) && o.run_status === "completed")
      .map((o) => o.raw_answer),
    ...(facts.writer?.questions ?? [])
      .filter((q) => wanted.has(q.prompt_id))
      .map((q) => q.google_text),
    ...[...questions]
      .filter(([id]) => wanted.has(id))
      .map(([, question]) => question),
    ...(facts.writer?.pages ?? []).map((page) => page.text),
    ...(facts.names ?? []),
    ...(facts.writer?.businesses ?? []),
    ...(facts.writer?.questions ?? []).map((q) => q.topic ?? ""),
  ]
    .filter(Boolean)
    .map(stripPhoneNumbers);
}

/** The sentences of a text whose quotations are not found. */
export function unfoundQuoteSentences(
  text: string,
  texts: readonly string[],
): string[] {
  const bad = quotations(text).filter((q) => !quoteFound(q.quote, texts));
  if (!bad.length) return [];
  return sentenceSpans(text)
    .filter(([s, e]) => bad.some((q) => q.start < e && q.end > s))
    .map(([s, e]) => text.slice(s, e).trim());
}

/** The text without the sentences whose quotations are not found. */
export function withoutUnfoundQuotes(
  text: string,
  texts: readonly string[],
): { text: string; dropped: number } {
  const bad = quotations(text).filter((q) => !quoteFound(q.quote, texts));
  if (!bad.length) return { text, dropped: 0 };
  const spans = sentenceSpans(text);
  const kept = spans.filter(
    ([s, e]) => !bad.some((q) => q.start < e && q.end > s),
  );
  return {
    text: kept
      .map(([s, e]) => text.slice(s, e).trim())
      .join(" ")
      .trim(),
    dropped: spans.length - kept.length,
  };
}

type Field = { label: string; text: string; ids?: readonly string[] };

function quoteFields(content: ReportContent): Field[] {
  const writing = content.two_source_writing;
  return [
    ...(writing ? [{ label: "The verdict", text: writing.verdict }] : []),
    { label: "The conclusion", text: content.conclusion },
    ...content.key_findings.flatMap((f, i): Field[] => [
      {
        label: `Finding ${i + 1} title`,
        text: f.title,
        ids: f.evidence_prompt_ids,
      },
      {
        label: `Finding ${i + 1} paragraph`,
        text: f.explanation,
        ids: f.evidence_prompt_ids,
      },
    ]),
    ...content.priorities.map((p, i): Field => ({
      label: `Recommendation ${i + 1} paragraph`,
      text: p.why,
      ids: p.evidence_prompt_ids,
    })),
    ...(writing?.competitor_reasons ?? []).map((r, i): Field => ({
      label: `Competitor line ${i + 1}`,
      text: r.reason,
    })),
    ...(writing?.takeaways ?? []).map((t, i): Field => ({
      label: `Takeaway ${i + 1}`,
      text: t.text,
    })),
    ...(writing?.plan ?? []).map((s, i): Field => ({
      label: `Plan step ${i + 1}`,
      text: s.text,
    })),
  ];
}

/** Writing violations for the one revision. */
export function quoteViolations(
  content: ReportContent,
  facts: TwoSourceReportFacts,
  observations: readonly AuditObservation[],
  questions: ReadonlyMap<string, string>,
): string[] {
  return quoteFields(content).flatMap(({ label, text, ids }) =>
    unfoundQuoteSentences(
      text,
      quotableTexts(ids, facts, observations, questions),
    ).map(
      (sentence) =>
        `${label}: "${sentence}" puts in quotation marks words that are not in the saved answers or questions it cites. Copy the words exactly (mark a cut with […]), or say it in your own words without quotation marks.`,
    ),
  );
}

/** A text's quotations without their quotation marks. */
const unquoted = (text: string) =>
  text.replace(QUOTE, (_, a, b, c) => a ?? b ?? c).trim();

/**
 * Past the revision: a sentence whose quotation is not found is dropped. A
 * finding a drop empties goes while another finding remains. A required
 * paragraph a drop empties gets the caller's fallback sentence; an emptied
 * verdict stays empty (the page shows its own); a plan step or a lone
 * finding title keeps its words without the quotation marks.
 */
export function repairQuotes(
  content: ReportContent,
  facts: TwoSourceReportFacts,
  observations: readonly AuditObservation[],
  questions: ReadonlyMap<string, string>,
  fallback: string,
): { content: ReportContent; dropped: number } {
  let dropped = 0;
  const fix = (text: string, ids?: readonly string[]) => {
    const result = withoutUnfoundQuotes(
      text,
      quotableTexts(ids, facts, observations, questions),
    );
    dropped += result.dropped;
    return result.text;
  };
  const findings = content.key_findings.map((f) => ({
    ...f,
    title: fix(f.title, f.evidence_prompt_ids),
    explanation: fix(f.explanation, f.evidence_prompt_ids),
  }));
  const whole = findings.filter((f) => f.title && f.explanation);
  const key_findings = (whole.length ? whole : findings).map((f, i) => ({
    ...f,
    title: f.title || unquoted(content.key_findings[i]!.title) || fallback,
    explanation: f.explanation || fallback,
  }));
  const priorities = content.priorities.map((p) => ({
    ...p,
    why: fix(p.why, p.evidence_prompt_ids) || fallback,
  }));
  const writing = content.two_source_writing;
  const next: ReportContent = {
    ...content,
    conclusion: fix(content.conclusion) || fallback,
    key_findings,
    priorities,
    two_source_writing: writing && {
      ...writing,
      verdict: fix(writing.verdict),
      competitor_reasons: writing.competitor_reasons
        .map((r) => ({ ...r, reason: fix(r.reason) }))
        .filter((r) => r.reason),
      takeaways: writing.takeaways
        .map((t) => ({ ...t, text: fix(t.text) }))
        .filter((t) => t.text),
      plan: writing.plan.map((s) => ({
        ...s,
        text: fix(s.text) || unquoted(s.text),
      })),
    },
  };
  return { content: dropped ? next : content, dropped };
}
