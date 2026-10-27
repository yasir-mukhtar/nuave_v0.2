import {
  sentences,
  subjectNoun,
  type ReportSubject,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import type { AuditObservation } from "@/lib/audit/types";
import { findNames } from "./mark-names";

/**
 * Spec 021 Part A: what the new two-source report shows, worked out from what
 * a saved Spec 018 report already holds. Nothing here calls a provider or
 * writes anything; counts are taken from the saved answers.
 */

export type Source = "chatgpt" | "google";

/** The dot looks (Figma "Legends" 2011:24), weakest to strongest, plus the
 * two states that are not a result. */
export type MentionState =
  "noaio" | "none" | "cited" | "mentioned" | "recommended" | "failed";

export function mentionState(
  question: TwoSourceQuestion,
  source: Source,
): MentionState {
  if (source === "chatgpt") {
    const c = question.chatgpt;
    if (c.outcome !== "answered") return "failed";
    if (c.named === "named") return c.recommended ? "recommended" : "mentioned";
    return c.named === "source_only" ? "cited" : "none";
  }
  const g = question.google;
  if (g.outcome === "failed") return "failed";
  if (g.outcome === "not_shown") return "noaio";
  if (g.named === "named") return "mentioned";
  return g.named === "source_only" ? "cited" : "none";
}

export const MENTION_LABEL: Record<MentionState, string> = {
  noaio: "Tidak ada AI Overview",
  none: "Tidak disebut",
  cited: "Situs dikutip, nama tidak disebut",
  mentioned: "Disebut",
  recommended: "Direkomendasikan",
  failed: "Tidak dapat diuji",
};

export const SOURCE_LABEL: Record<Source, string> = {
  chatgpt: "ChatGPT",
  google: "Google AI Overview",
};

/** The saved answer text of each completed check, by source. */
export function answerTexts(
  question: TwoSourceQuestion,
  observations: readonly AuditObservation[],
): Record<Source, string> {
  const observation = observations.find(
    (item) => item.prompt_id === question.prompt_id,
  );
  return {
    chatgpt:
      question.chatgpt.outcome === "answered" &&
      observation?.run_status === "completed"
        ? observation.raw_answer
        : "",
    google: question.google.outcome === "summary" ? question.google.text : "",
  };
}

export type CompetitorRow = {
  name: string;
  /** Answers per source that name the business. */
  chatgpt: number;
  google: number;
  /** The owner's own row; its counts come from the saved facts. */
  own?: { cited: number; recommended: number };
  /** Spec 021 Part C, saved with reports made after it: ChatGPT answers that
   * named it and showed it as a business card ("kartu ChatGPT"), and what
   * the sources' pages listed. */
  cards?: number;
  website?: string | null;
  rating?: { value: number; max: number } | null;
  reviews?: number | null;
};

/**
 * Spec 021 A-04: the other businesses the saved report lists, counted by how
 * many saved answers name them (an answer counts once, however often it
 * repeats the name). Reports saved before Part C hold names only, so this is
 * the count for them. The owner's row is added from the saved facts. The
 * owner's own names are matched too, longest first, so a competitor whose
 * name sits inside the owner's ("Natasha" in "Natasha Skin Clinic") is not
 * counted for an answer that only names the owner.
 */
export function competitorRows(
  two: TwoSourceReport,
  observations: readonly AuditObservation[],
  ownNames: readonly string[],
): { counted: CompetitorRow[]; uncounted: string[] } {
  if (two.competitors) return savedCompetitorRows(two, ownNames);
  const ownName = ownNames[0] ?? "";
  const seen = new Map<string, string>();
  for (const name of [
    ...two.other_businesses.chatgpt,
    ...two.other_businesses.google,
  ]) {
    const key = name.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  const names = [...seen.values()];
  const rows = new Map<string, CompetitorRow>(
    names.map((name) => [name, { name, chatgpt: 0, google: 0 }]),
  );
  for (const question of two.questions) {
    const texts = answerTexts(question, observations);
    for (const source of ["chatgpt", "google"] as const) {
      const found = new Set(
        findNames(texts[source], [...ownNames, ...names]).map((m) => m.name),
      );
      for (const name of found) {
        const row = rows.get(name);
        if (row) row[source] += 1;
      }
    }
  }
  const counted = [...rows.values()].filter((r) => r.chatgpt + r.google > 0);
  const uncounted = [...rows.values()]
    .filter((r) => r.chatgpt + r.google === 0)
    .map((r) => r.name);
  counted.push(ownRow(two, ownName));
  return { counted: sortRows(counted), uncounted };
}

/** The owner's row, from the saved facts. */
function ownRow(two: TwoSourceReport, name: string): CompetitorRow {
  const cited = two.questions.filter(
    (q) =>
      mentionState(q, "chatgpt") === "cited" ||
      mentionState(q, "google") === "cited",
  ).length;
  return {
    name,
    chatgpt: two.counts.chatgpt.named,
    google: two.counts.google.named,
    own: { cited, recommended: two.counts.chatgpt.recommended },
  };
}

function sortRows(rows: CompetitorRow[]): CompetitorRow[] {
  return rows.sort(
    (a, b) =>
      b.chatgpt + b.google - (a.chatgpt + a.google) ||
      (a.own ? -1 : b.own ? 1 : 0) ||
      (b.cards ?? 0) - (a.cards ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

/** Spec 021 Part C: the counts and listing details saved with the report. */
function savedCompetitorRows(
  two: TwoSourceReport,
  ownNames: readonly string[],
): { counted: CompetitorRow[]; uncounted: string[] } {
  const saved = two.competitors!;
  const rows = saved.others.map((fact): CompetitorRow => ({
    name: fact.name,
    chatgpt: fact.chatgpt.length,
    google: fact.google.length,
    cards: fact.cards.length,
    website: fact.website,
    rating: fact.rating,
    reviews: fact.reviews,
  }));
  const counted = rows.filter((r) => r.chatgpt + r.google > 0);
  const uncounted = rows
    .filter((r) => r.chatgpt + r.google === 0)
    .map((r) => r.name);
  counted.push({
    ...ownRow(two, ownNames[0] ?? ""),
    cards: saved.own.cards.length,
    website: saved.own.website,
    rating: saved.own.rating,
    reviews: saved.own.reviews,
  });
  return { counted: sortRows(counted), uncounted };
}

export type TopicGapRow = {
  ordinal: number;
  topic: string;
  volume: number | null;
  /** Other businesses named in this question's answers (when no volume). */
  othersNamed: number;
  /** Where the business stands for this topic, in one sentence. */
  standing: string;
  domains: string[];
};

/**
 * Spec 021 A-05: Celah Topik. A saved row whose topic is its whole question
 * has no topic name and is left out until Part B supplies one.
 */
export function topicGapRows(
  two: TwoSourceReport,
  observations: readonly AuditObservation[],
  subject?: ReportSubject,
): TopicGapRow[] {
  const names = [
    ...two.other_businesses.chatgpt,
    ...two.other_businesses.google,
  ];
  return two.topics_missing.flatMap((row) => {
    const question = two.questions.find((q) => q.prompt_id === row.prompt_id);
    if (
      !question ||
      !row.topic ||
      row.topic.trim() === question.question.trim()
    )
      return [];
    const texts = answerTexts(question, observations);
    const othersNamed = new Set(
      [
        ...findNames(texts.chatgpt, names),
        ...findNames(texts.google, names),
      ].map((m) => m.name.toLowerCase()),
    ).size;
    const answered: string[] = [];
    if (question.chatgpt.outcome === "answered") answered.push("ChatGPT");
    if (question.google.outcome === "summary")
      answered.push("Google AI Overview");
    const who = subjectNoun(subject, false);
    let standing = `Tidak disebut di ${answered.join(" maupun ")}.`;
    if (
      mentionState(question, "google") === "cited" ||
      mentionState(question, "chatgpt") === "cited"
    )
      standing = `Situs ${who} dikutip, tetapi namanya tidak disebut.`;
    return [
      {
        ordinal: row.ordinal,
        topic: row.topic,
        volume: row.volume,
        othersNamed,
        standing,
        domains: row.domains,
      },
    ];
  });
}

export const VERDICT_MAX = 220;

/**
 * Spec 021: the verdict for a report written before Part B is the saved
 * conclusion's first sentences up to 220 characters, cut at a sentence end.
 * A first sentence longer than that is cut at the last word with "…".
 */
export function verdictFromConclusion(conclusion: string): string {
  // A ";" ends a clause, not a sentence: keep it joined to what follows.
  const parts = sentences(conclusion.trim()).reduce<string[]>((out, part) => {
    const last = out.at(-1);
    if (last?.endsWith(";")) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
    return out;
  }, []);
  if (!parts.length) return "";
  let verdict = "";
  for (const part of parts) {
    const next = verdict ? `${verdict} ${part}` : part;
    if (next.length > VERDICT_MAX) break;
    verdict = next;
  }
  if (verdict) return verdict;
  const first = parts[0]!;
  const cut = first.slice(0, VERDICT_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "")}…`;
}

/** The address the audit started from, as a short host name. */
export function displayHost(source: string): string {
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    if (!host) return source;
    if (host === "instagram.com") {
      const account = url.pathname.split("/").filter(Boolean)[0];
      return account ? `instagram.com/${account}` : host;
    }
    return host;
  } catch {
    return source;
  }
}

/** Hosts whose icon is the platform's, not the business's: a profile or a
 * listing there gets initials, never that platform's logo (Spec 021 C-03). */
const SHARED_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "linktr.ee",
  "wa.me",
  "goo.gl",
  "bit.ly",
  "s.id",
  "lynk.id",
  "tinyurl.com",
  "t.co",
  "g.page",
  "business.site",
  "tokopedia.com",
  "shopee.co.id",
  "halodoc.com",
  "alodokter.com",
  "klikdokter.com",
  "traveloka.com",
  "tiket.com",
];

/** Spec 021 C-03: the address of a business's own site icon, or null (no
 * site, a shared platform, or not a plain https address). */
export function siteIcon(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (
      !host.includes(".") ||
      // An IP address is no business's own site.
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      // Google on every country domain (google.co.id, maps.google.com).
      /(^|\.)google\.[a-z.]+$/.test(host) ||
      SHARED_HOSTS.some(
        (shared) => host === shared || host.endsWith(`.${shared}`),
      )
    )
      return null;
    return `https://${host}/favicon.ico`;
  } catch {
    return null;
  }
}

const ratingFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});
const countFormat = new Intl.NumberFormat("id-ID");

/** "Rating 4,7 · 222 ulasan"; a rating out of anything but 5 says so. */
export function ratingLine(
  rating: { value: number; max: number } | null | undefined,
  reviews: number | null | undefined,
): string {
  if (!rating) return "";
  const score = `Rating ${ratingFormat.format(rating.value)}${
    rating.max === 5 ? "" : `/${countFormat.format(rating.max)}`
  }`;
  return reviews ? `${score} · ${countFormat.format(reviews)} ulasan` : score;
}
