/**
 * Spec 023, founder's guide (2026-10-29): a quotation in the writer's prose
 * must be the saved words of a ChatGPT answer, a Google AI Overview or a
 * question the passage cites, or of a page Nuave read. The writer may cut a
 * quotation with "[…]"; every piece must then appear, in order, in one
 * paragraph of one of those texts. Words are compared, not characters, so
 * punctuation, dashes, Markdown and quotation marks never matter. A
 * sentence whose quotation cannot be found is listed for the one revision,
 * and dropped after it.
 */
import { stripPhoneNumbers } from "../checks/phones";
import { ABBREVIATION, type TwoSourceReportFacts } from "./two-source-report";
import type { AuditObservation, ReportContent } from "./types";

/** A quotation is checked when it has at least this many words; a quoted
 * word ("Disebut") is a label, not a quotation of an answer. */
const MIN_QUOTE_WORDS = 2;
/** A cut quotation: at most this many cuts, each piece this many words. */
const MAX_CUTS = 2;
const MIN_PIECE_WORDS = 2;

/** The report's own labels, which the writer may put in quotation marks. */
const LABELS = [
  "Tidak disebut",
  "Situs dikutip",
  "Hanya situs",
  "Celah Topik",
  "Peta Pesaing",
  "Menurut jawaban AI",
  "Google AI Overview",
];

/** A cut inside a quotation: "[…]", "[...]", "…" or "...". */
const CUT = /\[\s*(?:…|\.\.\.)\s*\]|…|\.\.\./;

const isWordChar = (ch: string | undefined) =>
  ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

/** Text as compared: links, link citations and ChatGPT's citation markers
 * removed (a link keeps its words unless they are only a domain), paragraphs
 * apart, each a list of lower-case words. "sampai" or "hingga" between two
 * numbers is left out, since the dash rule writes "7–8" as "7 sampai 8". */
export function quoteWords(text: string): string[][] {
  return text
    .replace(/[-]/g, " ")
    .replace(/\bcite(?:turn\d+[a-z]+\d+)+/gi, " ")
    .replace(/\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, " ")
    .replace(/\[([^\]\s]+\.[^\]\s]+)\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const words =
        paragraph.toLocaleLowerCase("id-ID").match(/[\p{L}\p{N}]+/gu) ?? [];
      return words.filter(
        (word, i) =>
          !(
            (word === "sampai" || word === "hingga") &&
            /\d/.test(words[i - 1] ?? "") &&
            /\d/.test(words[i + 1] ?? "")
          ),
      );
    })
    .filter((words) => words.length);
}

const joined = (words: string[]) => ` ${words.join(" ")} `;

/** Whether one quotation is found in one paragraph of one of the texts:
 * each piece, whole words, in order. */
export function quoteFound(quote: string, texts: readonly string[]): boolean {
  const pieces = quote
    .split(CUT)
    .map((piece) => quoteWords(piece).flat())
    .filter((words) => words.length);
  if (!pieces.length) return true;
  if (
    pieces.length > MAX_CUTS + 1 ||
    (pieces.length > 1 && pieces.some((p) => p.length < MIN_PIECE_WORDS))
  )
    return false;
  return texts.some((text) =>
    quoteWords(text).some((paragraph) => {
      const haystack = joined(paragraph);
      let at = 0;
      for (const piece of pieces) {
        const needle = joined(piece);
        const found = haystack.indexOf(needle, at);
        if (found < 0) return false;
        at = found + needle.length - 1;
      }
      return true;
    }),
  );
}

type Quotation = { quote: string; start: number; end: number };

/** Every quotation in a text, with where it sits. A quotation opens with
 * “, ‘, " or ' not after a letter or digit (so 5" or Jum'at never open
 * one) and closes with a mark of the same kind not before one; quotation
 * marks of the other kind inside it are part of it. */
function allQuotations(text: string): Quotation[] {
  const out: Quotation[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const double = ch === "“" || ch === '"';
    if (!double && ch !== "‘" && ch !== "'") continue;
    if (isWordChar(text[i - 1])) continue;
    const closers = double ? ["”", '"'] : ["’", "'"];
    let close = -1;
    for (let j = i + 1; j < text.length; j++) {
      if (/^\n\s*\n/.test(text.slice(j, j + 8))) break;
      if (closers.includes(text[j]!) && !isWordChar(text[j + 1])) {
        close = j;
        break;
      }
    }
    if (close < 0) continue;
    out.push({ quote: text.slice(i + 1, close), start: i, end: close + 1 });
    i = close;
  }
  return out;
}

const wordCount = (text: string) => quoteWords(text).flat().length;

/** Sentence spans. A sentence ends at ".", "!" or "?" before a space, never
 * inside a quotation or after an abbreviation ("dr.", "Jl."), or at a
 * quotation closed by one of them. */
function sentenceSpans(
  text: string,
  quotes: readonly Quotation[],
): [number, number][] {
  const spans: [number, number][] = [];
  let start = 0;
  const end = (i: number) => {
    if (!/\s/.test(text[i + 1] ?? "")) return;
    spans.push([start, i + 1]);
    start = i + 1;
  };
  for (let i = 0; i < text.length; i++) {
    const quote = quotes.find((q) => q.start === i);
    if (quote) {
      i = quote.end - 1;
      if (/[.!?]/.test(text[i - 1] ?? "")) end(i);
      continue;
    }
    const ch = text[i]!;
    if (ch === "." && ABBREVIATION.test(text.slice(start, i + 1))) continue;
    if (/[.!?]/.test(ch)) end(i);
  }
  if (text.slice(start).trim()) spans.push([start, text.length]);
  return spans;
}

/** The saved texts a passage may quote, by where they come from. Each as
 * the writer read it: without phone numbers. */
export type QuotableTexts = {
  chatgpt: string[];
  google: string[];
  /** Questions, names, topics and the report's labels. */
  shared: string[];
  pages: string[];
};

/** The texts a passage may quote: for these prompt IDs (all of them when
 * none are given) the completed ChatGPT answers and the titles of the
 * sources they cite, the Google AI Overviews and the questions; every page
 * Nuave read; and the names, topics and labels the report may put in
 * quotation marks. */
export function quotableTexts(
  ids: readonly string[] | undefined,
  facts: TwoSourceReportFacts,
  observations: readonly AuditObservation[],
  questions: ReadonlyMap<string, string>,
): QuotableTexts {
  const all = facts.writer?.questions.map((q) => q.prompt_id) ?? [
    ...questions.keys(),
  ];
  const wanted = new Set(ids?.length ? ids : all);
  const clean = (texts: string[]) =>
    texts.filter(Boolean).map(stripPhoneNumbers);
  const answered = observations.filter(
    (o) => wanted.has(o.prompt_id) && o.run_status === "completed",
  );
  return {
    chatgpt: clean([
      ...answered.map((o) => o.raw_answer),
      ...answered.flatMap((o) => (o.sources ?? []).map((s) => s.title ?? "")),
    ]),
    google: clean(
      (facts.writer?.questions ?? [])
        .filter((q) => wanted.has(q.prompt_id))
        .map((q) => q.google_text),
    ),
    shared: clean([
      ...[...questions]
        .filter(([id]) => wanted.has(id))
        .map(([, question]) => question),
      ...(facts.names ?? []),
      ...(facts.writer?.businesses ?? []),
      ...(facts.writer?.questions ?? []).map((q) => q.topic ?? ""),
      ...LABELS,
    ]),
    pages: clean(
      (facts.writer?.pages ?? []).flatMap((page) => [page.title, page.text]),
    ),
  };
}

/** The texts one sentence may quote: a sentence that credits ChatGPT alone
 * quotes its answers, one that credits Google alone its AI Overviews; pages
 * only when the sentence names no source or speaks of a page or site. */
function textsForSentence(sentence: string, texts: QuotableTexts): string[] {
  const chatgpt = /\bchatgpt\b/i.test(sentence);
  const google = /\bgoogle\b|\bai overview\b/i.test(sentence);
  const page =
    !(chatgpt || google) ||
    /\b(?:situs|halaman|laman|website)\b/i.test(sentence);
  return [
    ...(chatgpt && !google ? texts.chatgpt : []),
    ...(google && !chatgpt ? texts.google : []),
    ...(chatgpt === google ? [...texts.chatgpt, ...texts.google] : []),
    ...texts.shared,
    ...(page ? texts.pages : []),
  ];
}

/** Sentences of a text whose quotations are not found, and the rest. */
function splitByQuotes(text: string, texts: QuotableTexts) {
  const quotes = allQuotations(text);
  const spans = sentenceSpans(text, quotes);
  const bad = spans.filter(([s, e]) => {
    const sentence = text.slice(s, e);
    return quotes.some(
      (q) =>
        q.start >= s &&
        q.end <= e &&
        wordCount(q.quote) >= MIN_QUOTE_WORDS &&
        !quoteFound(q.quote, textsForSentence(sentence, texts)),
    );
  });
  return {
    bad: bad.map(([s, e]) => text.slice(s, e).trim()),
    kept: spans
      .filter((span) => !bad.includes(span))
      .map(([s, e]) => text.slice(s, e).trim())
      .join(" ")
      .trim(),
  };
}

/** The sentences of a text whose quotations are not found. */
export function unfoundQuoteSentences(
  text: string,
  texts: QuotableTexts,
): string[] {
  return splitByQuotes(text, texts).bad;
}

/** The text without the sentences whose quotations are not found. */
export function withoutUnfoundQuotes(
  text: string,
  texts: QuotableTexts,
): { text: string; dropped: number } {
  const { bad, kept } = splitByQuotes(text, texts);
  return bad.length
    ? { text: kept, dropped: bad.length }
    : { text, dropped: 0 };
}

type Field = { label: string; text: string; ids?: readonly string[] };

function quoteFields(content: ReportContent): Field[] {
  const writing = content.two_source_writing;
  return [
    ...(writing ? [{ label: "The verdict", text: writing.verdict }] : []),
    { label: "The conclusion", text: content.conclusion },
    ...content.key_findings.flatMap((f, i): Field[] => {
      const ids = f.evidence_prompt_ids;
      return [
        { label: `Finding ${i + 1} title`, text: f.title, ids },
        { label: `Finding ${i + 1} paragraph`, text: f.explanation, ids },
        ...(f.headline
          ? [
              {
                label: `Finding ${i + 1} headline caption`,
                text: f.headline.caption,
                ids,
              },
            ]
          : []),
      ];
    }),
    ...content.priorities.flatMap((p, i): Field[] => [
      {
        label: `Recommendation ${i + 1} title`,
        text: p.action,
        ids: p.evidence_prompt_ids,
      },
      {
        label: `Recommendation ${i + 1} paragraph`,
        text: p.why,
        ids: p.evidence_prompt_ids,
      },
    ]),
    ...(writing?.competitor_reasons ?? []).map((r, i): Field => ({
      label: `Competitor line ${i + 1}`,
      text: r.reason,
    })),
    ...(writing?.takeaways ?? []).flatMap((t, i): Field[] => [
      { label: `Takeaway ${i + 1} title`, text: t.title },
      { label: `Takeaway ${i + 1}`, text: t.text },
    ]),
    ...(writing?.plan ?? []).flatMap((s, i): Field[] => [
      { label: `Plan step ${i + 1} title`, text: s.title },
      { label: `Plan step ${i + 1}`, text: s.text },
    ]),
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
        `${label}: "${sentence}" puts in quotation marks words that are not in the saved answers or questions it cites (words credited to ChatGPT must be in its answers, words credited to Google in its AI Overview). Copy the words exactly from one answer (mark a cut with […]), or say it in your own words without quotation marks.`,
    ),
  );
}

/** A text's quotations without their quotation marks. */
const unquoted = (text: string) =>
  allQuotations(text)
    .reverse()
    .reduce(
      (out, q) => out.slice(0, q.start) + q.quote + out.slice(q.end),
      text,
    )
    .trim();

/**
 * Past the revision: a sentence whose quotation is not found is dropped. A
 * finding or recommendation a drop empties goes while another remains;
 * otherwise a required paragraph gets the caller's fallback sentence and a
 * title keeps its words without the quotation marks. A headline whose
 * caption fails goes. An emptied verdict stays empty (the page shows its
 * own); a plan step keeps its words without the quotation marks.
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

  const findings = content.key_findings.map((f) => {
    const { headline, ...rest } = f;
    const caption = headline && fix(headline.caption, f.evidence_prompt_ids);
    return {
      ...rest,
      title: fix(f.title, f.evidence_prompt_ids),
      explanation: fix(f.explanation, f.evidence_prompt_ids),
      ...(headline && caption === headline.caption ? { headline } : {}),
    };
  });
  const wholeFindings = findings.filter((f) => f.title && f.explanation);
  const key_findings = wholeFindings.length
    ? wholeFindings
    : findings.map((f, i) => ({
        ...f,
        title: f.title || unquoted(content.key_findings[i]!.title) || fallback,
        explanation: f.explanation || fallback,
      }));

  const priorities = content.priorities.map((p) => ({
    ...p,
    action: fix(p.action, p.evidence_prompt_ids),
    why: fix(p.why, p.evidence_prompt_ids),
  }));
  const wholePriorities = priorities.filter((p) => p.action && p.why);
  const keptPriorities = (
    wholePriorities.length || !priorities.length
      ? wholePriorities
      : priorities.map((p, i) => ({
          ...p,
          action: p.action || unquoted(content.priorities[i]!.action),
          why: p.why || fallback,
        }))
  ).map((p, i) => ({ ...p, order: i + 1 }));

  const writing = content.two_source_writing;
  const next: ReportContent = {
    ...content,
    conclusion: fix(content.conclusion) || fallback,
    key_findings,
    priorities: keptPriorities,
    ...(writing
      ? {
          two_source_writing: {
            ...writing,
            verdict: fix(writing.verdict),
            competitor_reasons: writing.competitor_reasons
              .map((r) => ({ ...r, reason: fix(r.reason) }))
              .filter((r) => r.reason),
            takeaways: writing.takeaways
              .map((t) => ({ title: fix(t.title), text: fix(t.text) }))
              .filter((t) => t.title && t.text),
            plan: writing.plan.map((s) => ({
              ...s,
              title: fix(s.title) || unquoted(s.title),
              text: fix(s.text) || unquoted(s.text),
            })),
          },
        }
      : {}),
  };
  return { content: dropped ? next : content, dropped };
}
