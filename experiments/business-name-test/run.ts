/**
 * Reads each homepage in sites.json once, picks the name the way the free
 * check does, and compares it with the name written by hand. Plain page
 * reads only: no AI and no paid service. Run instructions: README.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
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
  return a.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]+/gu, "");
}

async function readName(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
    headers: { "user-agent": "Mozilla/5.0 (compatible; NuaveNameTest/1.0)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return parseSourceMetadata(html, "website", response.url).displayName;
}

const rows: string[] = ["url\texpected\tpicked\tresult"];
let right = 0;
let unread = 0;
for (const site of sites) {
  let picked = "";
  let result: string;
  try {
    picked = await readName(site.url);
    const accepted = [site.expected_name, ...site.also_correct].map(same);
    result = picked && accepted.includes(same(picked)) ? "right" : "wrong";
  } catch (error) {
    result = `unread (${error instanceof Error ? error.message : "error"})`;
  }
  if (result === "right") right += 1;
  if (result.startsWith("unread")) unread += 1;
  rows.push(`${site.url}\t${site.expected_name}\t${picked}\t${result}`);
  console.log(`${result.padEnd(7)} ${site.url} → ${picked || "(none)"}`);
}
writeFileSync(`${here}results.tsv`, `${rows.join("\n")}\n`);
console.log(
  `\n${right} right of ${sites.length - unread} read (${unread} could not be read).`,
);
