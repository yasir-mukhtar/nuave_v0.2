/**
 * Step 3 reading test (founder request, 2026-10-28): how much waiting time
 * Firecrawl would add to the paid website reading (step 3), and whether Luna
 * or Haiku reads Firecrawl's pages better.
 *
 * Four ways, on the same sites:
 * - A: today. Our homepage reader, then GPT-5.6 Luna with web search on the
 *   clinic's own domain (`extractBusinessDraft`, exactly as live).
 * - B: Firecrawl reads the homepage and up to four useful pages from the
 *   site map, two at a time (the live report's own-site reading).
 * - C: B's pages, then Luna with today's instructions and no web search.
 * - D: B's pages, then Claude Haiku 5.5 with the same instructions.
 *
 * B runs once per site (Firecrawl credits); A, C and D twice, for timing.
 * Live calls run only with STEP3_TEST_LIVE=1. Results go to the git-ignored
 * `.local-evidence/step3-reading-test/`.
 *
 *   STEP3_TEST_LIVE=1 npx vitest run --config vitest.live-provider.config.ts \
 *     scripts/step3-reading-test/run.spec.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { claudeClient } from "../../src/lib/audit/anthropic-report";
import {
  extractBusinessDraft,
  extractionModelDraftSchema,
  extractionRequest,
} from "../../src/lib/audit/openai";
import { fetchWebsiteExcerpt } from "../../src/lib/audit/source-excerpt";
import {
  AUDIT_MODEL,
  serverOwnedAuditBudget,
} from "../../src/lib/audit/telemetry";
import {
  cappedFetch,
  firecrawlFetcher,
  patientFetch,
  readPagesForReport,
  type ReadPage,
} from "../../src/lib/reading/page-reader";

const LIVE = process.env.STEP3_TEST_LIVE === "1";
const OUT = join(process.cwd(), ".local-evidence", "step3-reading-test");

/** The founder's three sites, with the name step 1 would have confirmed. */
const SITES = [
  { url: "https://sozoskinclinic.com/", name: "SOZO Skin Clinic" },
  { url: "https://www.audydental.com/", name: "Audy Dental" },
  { url: "https://brawijayahospital.com/", name: "Brawijaya Hospital" },
] as const;

/** Map plus up to five pages, with room for a 429 retry; 8 x 3 sites stays
 * under the founder's 50 credits. */
const FIRECRAWL_REQUESTS_PER_SITE = 8;
const TIMED_RUNS = 2;
const HAIKU = "claude-haiku-5-5";
/** USD per million tokens (claude-api skill table, cached 2026-10-06). */
const HAIKU_PRICE = { input: 0.1, output: 0.5 };
/** gpt-5.6-luna short-context price, as in telemetry.ts PRICING. */
const LUNA_PRICE = { input: 0.2, output: 1.2 };

/** Today's instructions that tell the model to search the site; C and D
 * read the pages instead, so these lines are replaced by one about them. */
const SEARCH_LINE =
  /Web search remains restricted|arahkan pencarian domain resmi|Pilih paling banyak satu halaman relevan/;
const PAGES_LINE =
  "pages_read holds pages of the official website, read for you (the homepage first). Use only them as the official source; there is no web search. A page's url is its source URL.";

const inputFor = (site: (typeof SITES)[number]) => ({
  website_url: site.url,
  brand_name: site.name,
  market_context: "",
  category: "",
  identity_unverified: true,
  safety_identifier: "nuave-step3-reading-test",
});

/** The same request as today, with pages instead of web search. */
function pagesRequest(
  site: (typeof SITES)[number],
  pages: ReadPage[],
  model: string,
) {
  const base = extractionRequest(inputFor(site), model, []);
  const developer = base.input[0].content
    .split("\n")
    .filter((line) => !SEARCH_LINE.test(line))
    .concat(PAGES_LINE)
    .join("\n");
  const user = JSON.stringify({
    ...JSON.parse(base.input[1].content),
    pages_read: pages.map(({ url, title, text }) => ({ url, title, text })),
  });
  return { base, developer, user };
}

type Run = {
  way: "A" | "B" | "C" | "D";
  site: string;
  run: number;
  seconds: number;
  /** For A: the homepage read and the model call apart. */
  parts?: Record<string, number>;
  usd: number | null;
  ok: boolean;
  error?: string;
  draft?: unknown;
  pages?: { url: string; chars: number }[];
  unread?: string[];
};

const seconds = (start: number) =>
  Math.round((performance.now() - start) / 100) / 10;

async function wayA(site: (typeof SITES)[number], run: number): Promise<Run> {
  const start = performance.now();
  try {
    const source = await fetchWebsiteExcerpt(site.url, {
      destinationRateLimiter: { limit: async () => ({ success: true }) },
    });
    const read = seconds(start);
    const result = await extractBusinessDraft({
      ...inputFor(site),
      budget: serverOwnedAuditBudget(),
      ...(source ? { public_source_data: source } : {}),
    });
    return {
      way: "A",
      site: site.url,
      run,
      seconds: seconds(start),
      parts: { homepage: read, model: seconds(start) - read },
      usd: result.telemetry.reduce(
        (sum, call) => sum + (call.accounted_cost_usd ?? 0),
        0,
      ),
      ok: true,
      draft: result.draft,
    };
  } catch (error) {
    return failed("A", site, run, start, error);
  }
}

async function wayB(site: (typeof SITES)[number]) {
  const start = performance.now();
  const fetcher = firecrawlFetcher(
    process.env.FIRECRAWL_API_KEY!.trim(),
    cappedFetch(patientFetch(fetch), FIRECRAWL_REQUESTS_PER_SITE),
  );
  const read = await readPagesForReport({
    ownSite: site.url,
    sources: [],
    fetcher,
    concurrency: 2,
  });
  const run: Run = {
    way: "B",
    site: site.url,
    run: 1,
    seconds: seconds(start),
    usd: null,
    ok: read.pages.length > 0,
    pages: read.pages.map((page) => ({
      url: page.url,
      chars: page.text.length,
    })),
    unread: read.unread,
    ...(read.stopped ? { error: `Firecrawl stopped: ${read.stopped}` } : {}),
  };
  return { run, pages: read.pages };
}

async function wayC(
  site: (typeof SITES)[number],
  pages: ReadPage[],
  run: number,
): Promise<Run> {
  const { base, developer, user } = pagesRequest(site, pages, AUDIT_MODEL);
  // Today's request without its web search tool.
  const {
    tools: _tools,
    tool_choice: _choice,
    include: _include,
    max_tool_calls: _calls,
    ...rest
  } = base;
  void [_tools, _choice, _include, _calls];
  const request = {
    ...rest,
    input: [
      { role: "developer" as const, content: developer },
      { role: "user" as const, content: user },
    ],
  };
  const start = performance.now();
  try {
    const response = await new OpenAI({ maxRetries: 0 }).responses.parse(
      request,
      { timeout: 180_000 },
    );
    const usage = response.usage;
    return {
      way: "C",
      site: site.url,
      run,
      seconds: seconds(start),
      usd: usage
        ? (usage.input_tokens * LUNA_PRICE.input +
            usage.output_tokens * LUNA_PRICE.output) /
          1e6
        : null,
      ok: Boolean(response.output_parsed),
      draft: response.output_parsed,
    };
  } catch (error) {
    return failed("C", site, run, start, error);
  }
}

async function wayD(
  site: (typeof SITES)[number],
  pages: ReadPage[],
  run: number,
): Promise<Run> {
  const { developer, user } = pagesRequest(site, pages, HAIKU);
  const { type, schema } = zodOutputFormat(extractionModelDraftSchema);
  const start = performance.now();
  try {
    const response = await claudeClient()
      .messages.stream({
        model: HAIKU,
        max_tokens: 16_000,
        thinking: { type: "adaptive" },
        // Luna reads at low effort today; Haiku is held to the same.
        output_config: { effort: "low", format: { type, schema } },
        system: developer,
        messages: [{ role: "user", content: user }],
      })
      .finalMessage();
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
    const parsed = extractionModelDraftSchema.safeParse(
      JSON.parse(text || "null"),
    );
    return {
      way: "D",
      site: site.url,
      run,
      seconds: seconds(start),
      usd:
        (response.usage.input_tokens * HAIKU_PRICE.input +
          response.usage.output_tokens * HAIKU_PRICE.output) /
        1e6,
      ok: parsed.success,
      draft: parsed.success ? parsed.data : text,
      ...(parsed.success
        ? {}
        : { error: `answer did not match the format (${response.stop_reason})` }),
    };
  } catch (error) {
    return failed("D", site, run, start, error);
  }
}

function failed(
  way: Run["way"],
  site: (typeof SITES)[number],
  run: number,
  start: number,
  error: unknown,
): Run {
  return {
    way,
    site: site.url,
    run,
    seconds: seconds(start),
    usd: null,
    ok: false,
    error:
      error instanceof Anthropic.APIError || error instanceof OpenAI.APIError
        ? `${error.status} ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error),
  };
}

describe("step 3 reading test", () => {
  it("builds the C and D requests without web search", () => {
    const { base, developer, user } = pagesRequest(
      SITES[0],
      [
        {
          url: SITES[0].url,
          domain: "sozoskinclinic.com",
          title: "SOZO",
          kind: "own",
          cited_in: [],
          text: "Halaman contoh.",
        },
      ],
      AUDIT_MODEL,
    );
    expect(base.tools).toBeDefined();
    expect(developer).not.toMatch(SEARCH_LINE);
    expect(developer).toContain(PAGES_LINE);
    expect(JSON.parse(user).pages_read).toHaveLength(1);
  });

  it.runIf(LIVE)(
    "times A to D on the founder's three sites",
    async () => {
      for (const key of [
        "OPENAI_API_KEY",
        "NUAVE_ANTHROPIC_API_KEY",
        "FIRECRAWL_API_KEY",
      ])
        expect(process.env[key], key).toBeTruthy();
      mkdirSync(OUT, { recursive: true });
      const runs: Run[] = [];
      const save = () =>
        writeFileSync(join(OUT, "runs.json"), JSON.stringify(runs, null, 2));
      for (const site of SITES) {
        for (let run = 1; run <= TIMED_RUNS; run += 1) {
          runs.push(await wayA(site, run));
          save();
        }
        const b = await wayB(site);
        runs.push(b.run);
        save();
        if (!b.pages.length) continue;
        writeFileSync(
          join(OUT, `pages-${new URL(site.url).hostname}.json`),
          JSON.stringify(b.pages, null, 2),
        );
        for (let run = 1; run <= TIMED_RUNS; run += 1) {
          runs.push(await wayC(site, b.pages, run));
          save();
          runs.push(await wayD(site, b.pages, run));
          save();
        }
      }
      console.table(
        runs.map(({ way, site, run, seconds, usd, ok, error }) => ({
          way,
          site: new URL(site).hostname,
          run,
          seconds,
          usd: usd === null ? "" : usd.toFixed(4),
          ok,
          error: error ?? "",
        })),
      );
    },
    30 * 60_000,
  );
});
