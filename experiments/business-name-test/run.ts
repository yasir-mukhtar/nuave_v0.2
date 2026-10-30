/**
 * Reads each homepage in sites.json once, picks the name the way the free
 * check does, and compares it with the name written by hand. Also scores the
 * method used before 2026-10-29 (first of og:site_name, og:title, <title>).
 * Plain page reads only: no AI and no paid service. Run instructions:
 * README.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { cleanText } from "../../src/lib/audit/html-text";
import { parseSourceMetadata } from "../../src/lib/audit/source-identity";

interface Site {
  url: string;
  expected_name: string;
  also_correct: string[];
  kind: string;
}

// Run from the repository root.
const here = "experiments/business-name-test/";
const sites = JSON.parse(readFileSync(`${here}sites.json`, "utf8")) as Site[];

function same(a: string): string {
  return a
    .toLocaleLowerCase("id-ID")
    .replace(/\s*&\s*|\sdan\s/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function oldName(html: string): string {
  const end = html.search(/<\/head\s*>/i);
  const head = end < 0 ? html : html.slice(0, end);
  const meta = (key: string) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      if (!new RegExp(`(property|name)=["']${key}["']`, "i").test(tag))
        continue;
      return cleanText(/content=(["'])([\s\S]*?)\1/i.exec(tag)?.[2]);
    }
    return "";
  };
  return (
    meta("og:site_name") ||
    meta("og:title") ||
    cleanText(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1])
  );
}

async function read(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { "user-agent": "Mozilla/5.0 (compatible; NuaveNameTest/1.0)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const picked = parseSourceMetadata(html, "website", response.url);
  return { picked: picked.displayName, sure: picked.nameConfident, html };
}

const results = await Promise.all(
  sites.map(async (site) => {
    const accepted = [site.expected_name, ...site.also_correct].map(same);
    const isRight = (name: string) =>
      Boolean(name) && accepted.includes(same(name));
    try {
      const { picked, sure, html } = await read(site.url);
      const old = oldName(html);
      return {
        site,
        picked,
        sure,
        right: isRight(picked),
        old,
        oldRight: isRight(old),
      };
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause?.code;
      return {
        site,
        unread: cause ?? (error instanceof Error ? error.message : "error"),
        picked: "",
        sure: false,
        right: false,
        old: "",
        oldRight: false,
      };
    }
  }),
);

const rows = ["url\texpected\tpicked\tsure\tresult\told_method\told_result"];
for (const r of results) {
  if ("unread" in r && r.unread) {
    rows.push(
      `${r.site.url}\t${r.site.expected_name}\t\t\tunread (${r.unread})\t\t`,
    );
    continue;
  }
  rows.push(
    [
      r.site.url,
      r.site.expected_name,
      r.picked,
      r.sure ? "yes" : "no",
      r.right ? "right" : "wrong",
      r.old,
      r.oldRight ? "right" : "wrong",
    ].join("\t"),
  );
}
writeFileSync(`${here}results.tsv`, `${rows.join("\n")}\n`);

const read_ = results.filter((r) => !("unread" in r));
const count = (test: (r: (typeof results)[number]) => boolean) =>
  read_.filter(test).length;
console.log(`Read ${read_.length} of ${sites.length}.`);
console.log(`Old method right: ${count((r) => r.oldRight)}`);
console.log(`New picker right: ${count((r) => r.right)}`);
console.log(
  `Right and sure: ${count((r) => r.right && r.sure)}; wrong and unsure: ${count((r) => !r.right && !r.sure)}`,
);
console.log(`Old right, now wrong: ${count((r) => r.oldRight && !r.right)}`);
