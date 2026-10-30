/**
 * Step 3 model comparison (founder request, 2026-10-28): after Firecrawl
 * reads the own site with the new page picker, which model turns the pages
 * into the best quiz options, and how fast.
 *
 * Each site's pages are read once (the live `readOwnSiteLive`), then every
 * model reads the same pages with the live instructions (`extractionRequest`
 * with `pages_read`), twice for timing:
 * - today's GPT-5.6 Luna, low, through OpenAI (reference);
 * - GPT-6 Luna low and medium, DeepSeek 4.1 Flash 1017 low and GLM 5.3
 *   Flash low, through Cheaper Inference;
 * - Claude Haiku 5.5 and Sonnet 5.5, low, through Anthropic.
 * - GPT-6.1 Terra and GPT-6.1 Sol, low and medium, through Cheaper
 *   Inference (founder request, second round).
 * A model that refuses low effort is asked again at medium, and the run
 * says so.
 *
 *   STEP3_MODELS_LIVE=1 npx vitest run --config vitest.live-provider.config.ts \
 *     scripts/step3-reading-test/models.spec.ts
 *
 * - GPT-5.6 Luna medium and GPT-6 Luna low and medium, straight from
 *   OpenAI (founder request, third round).
 *
 * - DeepSeek-V4.1-Flash-1017 low, straight from DeepSeek (founder request,
 *   fourth round). Its id is "deepseek-flash" (GET /models, 2026-10-28,
 *   which lists effort low, high and max, default high).
 *
 * STEP3_MODELS (comma-separated keys) runs only those models;
 * STEP3_PAGES=saved reuses the pages an earlier run saved (no Firecrawl
 * credit); STEP3_PAGES=reread reads again, with the live reader, the sites
 * named in STEP3_REREAD (hostnames) from the pages an earlier run chose
 * (no site map, so five credits a site) and reuses the others' saved pages;
 * STEP3_OUT names the results file (default models.json).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { claudeClient } from "../../src/lib/audit/anthropic-report";
import {
  extractBusinessDraft,
  extractionModelDraftSchema,
  extractionRequest,
} from "../../src/lib/audit/openai";
import { cheaperInferenceBilledCostUsd } from "../../src/lib/audit/questions-id-glm";
import { serverOwnedAuditBudget } from "../../src/lib/audit/telemetry";
import { readOwnSiteLive, type OwnPages } from "../../src/lib/orders/pages";
import {
  cappedFetch,
  firecrawlFetcher,
  patientFetch,
  readPagesForReport,
} from "../../src/lib/reading/page-reader";
import OpenAI from "openai";

const LIVE = process.env.STEP3_MODELS_LIVE === "1";
const OUT = join(process.cwd(), ".local-evidence", "step3-reading-test");
const CHEAPER = "https://api.cheaperinference.com/v1/chat/completions";
const DEEPSEEK = "https://api.deepseek.com/chat/completions";
const RUNS = 2;

const SITES = [
  { url: "https://sozoskinclinic.com/", name: "SOZO Skin Clinic" },
  { url: "https://www.audydental.com/", name: "Audy Dental" },
  { url: "https://brawijayahospital.com/", name: "Brawijaya Hospital" },
] as const;
type Site = (typeof SITES)[number];
type Effort = "low" | "medium";

const MODELS = [
  // The live step 3 call, at the deploy's NUAVE_READING_MODEL and
  // NUAVE_READING_EFFORT (default GPT-5.6 Luna medium). Results before
  // 2026-10-28's switch to medium carry the key "gpt-5.6-luna-low (today)".
  { key: "production-reading", via: "openai", model: "gpt-5.6-luna" },
  { key: "gpt-6-luna-low", via: "cheaper", model: "gpt-6-luna", effort: "low" },
  {
    key: "gpt-6-luna-medium",
    via: "cheaper",
    model: "gpt-6-luna",
    effort: "medium",
  },
  {
    key: "deepseek-4.1-flash-1017-low",
    via: "cheaper",
    model: "deepseek-v4.1-flash-1017",
    effort: "low",
  },
  {
    key: "glm-5.3-flash-low",
    via: "cheaper",
    model: "glm-5.3-flash",
    effort: "low",
  },
  ...(["gpt-6.1-terra", "gpt-6.1-sol"] as const).flatMap((model) =>
    (["low", "medium"] as const).map((effort) => ({
      key: `${model}-${effort}`,
      via: "cheaper" as const,
      model,
      effort,
    })),
  ),
  ...(
    [
      ["gpt-5.6-luna", "medium"],
      ["gpt-6-luna", "low"],
      ["gpt-6-luna", "medium"],
    ] as const
  ).map(([model, effort]) => ({
    key: `${model}-${effort} (OpenAI)`,
    via: "openai-direct" as const,
    model,
    effort,
  })),
  {
    key: "deepseek-v4.1-flash-1017-low (DeepSeek)",
    via: "deepseek-direct",
    model: "deepseek-flash",
    effort: "low",
  },
  {
    key: "haiku-5.5-low",
    via: "anthropic",
    model: "claude-haiku-5-5",
    effort: "low",
  },
  {
    key: "sonnet-5.5-low",
    via: "anthropic",
    model: "claude-sonnet-5-5",
    effort: "low",
  },
] as const;
type Model = (typeof MODELS)[number];

const ONLY = process.env.STEP3_MODELS?.split(",").map((key) => key.trim());
const REREAD = process.env.STEP3_PAGES === "reread";
const SAVED_PAGES = process.env.STEP3_PAGES === "saved" || REREAD;
const REREAD_SITES = (process.env.STEP3_REREAD ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const OUT_FILE = process.env.STEP3_OUT?.trim() || "models.json";
const pagesFile = (site: Site) =>
  join(OUT, `models-pages-${new URL(site.url).hostname}.json`);
const rereadFile = (site: Site) =>
  join(OUT, `models-pages-reread-${new URL(site.url).hostname}.json`);
/** gpt-5.6-luna short-context price, as in telemetry.ts PRICING (USD per
 * million tokens). GPT-6 Luna has no price in Nuave's code: its tokens are
 * recorded instead. */
const LUNA_PRICE = { input: 0.2, cachedInput: 0.02, output: 1.2 };

/** deepseek-flash (DeepSeek-V4.1-Flash-1017), USD per million tokens, from
 * https://api-docs.deepseek.com/quick_start/pricing/ (read 2026-10-28).
 * Peak hours (01:00-04:00 and 06:00-10:00 UTC, Monday to Friday) cost
 * these; all other hours cost half. Chinese public holidays are off-peak
 * too and are not modelled here. */
const DEEPSEEK_PEAK_PRICE = { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 };
const deepseekPeak = (at: Date) => {
  const day = at.getUTCDay();
  const hour = at.getUTCHours();
  return (
    day >= 1 &&
    day <= 5 &&
    ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10))
  );
};

/** USD per million tokens (claude-api skill table, cached 2026-10-06). */
const CLAUDE_PRICE: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
};

type Result = {
  model: string;
  site: string;
  run: number;
  seconds: number;
  usd: number | null;
  /** Set when low effort was refused and medium ran instead. */
  effort?: Effort;
  ok: boolean;
  error?: string;
  draft?: unknown;
  tokens?: { input: number; output: number; reasoning: number };
};

const seconds = (start: number) =>
  Math.round((performance.now() - start) / 100) / 10;

/** The live reading request for a site's pages. */
function requestFor(site: Site, own: OwnPages, model: string) {
  const request = extractionRequest(
    {
      website_url: site.url,
      brand_name: site.name,
      market_context: "",
      category: "",
      identity_unverified: true,
      safety_identifier: "nuave-step3-models-test",
      pages_read: own.pages,
    },
    model,
    [],
  );
  return {
    developer: request.input[0].content,
    user: request.input[1].content,
  };
}

/** A model's answer as a draft: a JSON object that fits the live format. */
function parseDraft(text: string) {
  const json = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "");
  const parsed = extractionModelDraftSchema.safeParse(JSON.parse(json));
  return parsed.success
    ? { ok: true as const, draft: parsed.data }
    : {
        ok: false as const,
        draft: JSON.parse(json) as unknown,
        error: `answer did not fit the format: ${parsed.error.issues
          .slice(0, 3)
          .map((issue) => issue.path.join("."))
          .join(", ")}`,
      };
}

async function viaOpenAI(site: Site, own: OwnPages): Promise<Partial<Result>> {
  const result = await extractBusinessDraft({
    website_url: site.url,
    brand_name: site.name,
    market_context: "",
    category: "",
    identity_unverified: true,
    safety_identifier: "nuave-step3-models-test",
    budget: serverOwnedAuditBudget(),
    pages_read: own.pages,
  });
  return {
    usd: result.telemetry.reduce(
      (sum, call) => sum + (call.accounted_cost_usd ?? 0),
      0,
    ),
    ok: result.draft.verified_offerings.length > 0 || !!result.draft.category,
    draft: result.draft,
  };
}

/** The live request (pages, no search) sent straight to OpenAI with the
 * model and effort under test. */
async function viaOpenAIDirect(
  model: string,
  effort: Effort,
  site: Site,
  own: OwnPages,
): Promise<Partial<Result>> {
  const request = extractionRequest(
    {
      website_url: site.url,
      brand_name: site.name,
      market_context: "",
      category: "",
      identity_unverified: true,
      safety_identifier: "nuave-step3-models-test",
      pages_read: own.pages,
    },
    model,
    [],
  );
  const response = await new OpenAI({ maxRetries: 0 }).responses.parse(
    { ...request, reasoning: { effort } },
    { timeout: 180_000 },
  );
  const usage = response.usage;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const parsed = response.output_parsed
    ? extractionModelDraftSchema.safeParse(response.output_parsed)
    : null;
  return {
    usd:
      usage && model === "gpt-5.6-luna"
        ? ((usage.input_tokens - cached) * LUNA_PRICE.input +
            cached * LUNA_PRICE.cachedInput +
            usage.output_tokens * LUNA_PRICE.output) /
          1e6
        : null,
    ...(usage
      ? {
          tokens: {
            input: usage.input_tokens,
            output: usage.output_tokens,
            reasoning: usage.output_tokens_details?.reasoning_tokens ?? 0,
          },
        }
      : {}),
    ok: Boolean(parsed?.success),
    draft: parsed?.success ? parsed.data : response.output_parsed,
    ...(parsed?.success
      ? {}
      : { error: `no usable answer (${response.status})` }),
  };
}

const SCHEMA = z.toJSONSchema(extractionModelDraftSchema);

async function viaCheaper(
  model: string,
  effort: Effort,
  site: Site,
  own: OwnPages,
): Promise<Partial<Result>> {
  const { developer, user } = requestFor(site, own, model);
  const call = async (format: "schema" | "object", tryEffort: Effort) => {
    const response = await fetch(CHEAPER, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.CHEAPERINFERENCE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16_000,
        reasoning_effort: tryEffort,
        response_format:
          format === "schema"
            ? {
                type: "json_schema",
                json_schema: { name: "nuave_business_draft", schema: SCHEMA },
              }
            : { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              format === "schema"
                ? developer
                : `${developer}\nAnswer with one JSON object that follows this JSON schema exactly:\n${JSON.stringify(SCHEMA)}`,
          },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const body = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    } | null;
    return { status: response.status, body };
  };
  let usedEffort = effort;
  let format: "schema" | "object" = "schema";
  let answer = await call(format, usedEffort);
  const refused = (text: string, word: RegExp) =>
    answer.status >= 400 && word.test(text);
  const errorText = () => JSON.stringify(answer.body?.error ?? answer.body);
  if (refused(errorText(), /reasoning|effort/i) && effort === "low") {
    usedEffort = "medium";
    answer = await call(format, usedEffort);
  }
  if (refused(errorText(), /response_format|json_schema|schema/i)) {
    format = "object";
    answer = await call(format, usedEffort);
  }
  const text = answer.body?.choices?.[0]?.message?.content ?? "";
  const cost = cheaperInferenceBilledCostUsd(answer.body);
  if (answer.status >= 400 || !text)
    return {
      ok: false,
      usd: cost,
      error: `HTTP ${answer.status}: ${errorText().slice(0, 300)}`,
      ...(usedEffort !== effort ? { effort: usedEffort } : {}),
    };
  const parsed = parseDraft(text);
  return {
    usd: cost,
    ...parsed,
    ...(usedEffort !== effort ? { effort: usedEffort } : {}),
  };
}

/** The same request as viaCheaper, straight to DeepSeek's own API. DeepSeek
 * documents only json_object, so a refused schema falls back to it. */
async function viaDeepSeek(
  model: string,
  effort: Effort,
  site: Site,
  own: OwnPages,
): Promise<Partial<Result>> {
  const { developer, user } = requestFor(site, own, model);
  const call = async (format: "schema" | "object") => {
    const response = await fetch(DEEPSEEK, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16_000,
        thinking: { type: "enabled" },
        reasoning_effort: effort,
        response_format:
          format === "schema"
            ? {
                type: "json_schema",
                json_schema: { name: "nuave_business_draft", schema: SCHEMA },
              }
            : { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              format === "schema"
                ? developer
                : `${developer}\nAnswer with one JSON object that follows this JSON schema exactly:\n${JSON.stringify(SCHEMA)}`,
          },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const body = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
        prompt_tokens?: number;
        completion_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      };
      error?: { message?: string };
    } | null;
    return { status: response.status, body, at: new Date() };
  };
  let answer = await call("schema");
  const errorText = () => JSON.stringify(answer.body?.error ?? answer.body);
  if (
    answer.status >= 400 &&
    /response_format|json_schema|schema/i.test(errorText())
  )
    answer = await call("object");
  const usage = answer.body?.usage;
  const price = Object.fromEntries(
    Object.entries(DEEPSEEK_PEAK_PRICE).map(([kind, usd]) => [
      kind,
      deepseekPeak(answer.at) ? usd : usd / 2,
    ]),
  ) as typeof DEEPSEEK_PEAK_PRICE;
  const billed = usage
    ? {
        usd:
          ((usage.prompt_cache_hit_tokens ?? 0) * price.cacheHit +
            (usage.prompt_cache_miss_tokens ?? 0) * price.cacheMiss +
            (usage.completion_tokens ?? 0) * price.output) /
          1e6,
        tokens: {
          input: usage.prompt_tokens ?? 0,
          output: usage.completion_tokens ?? 0,
          reasoning: usage.completion_tokens_details?.reasoning_tokens ?? 0,
        },
      }
    : { usd: null };
  const text = answer.body?.choices?.[0]?.message?.content ?? "";
  if (answer.status >= 400 || !text)
    return {
      ok: false,
      ...billed,
      error: `HTTP ${answer.status}: ${errorText().slice(0, 300)}`,
    };
  return { ...billed, ...parseDraft(text) };
}

async function viaAnthropic(
  model: string,
  site: Site,
  own: OwnPages,
): Promise<Partial<Result>> {
  const { developer, user } = requestFor(site, own, model);
  const { type, schema } = zodOutputFormat(extractionModelDraftSchema);
  const response = await claudeClient()
    .messages.stream({
      model,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type, schema } },
      system: developer,
      messages: [{ role: "user", content: user }],
    })
    .finalMessage();
  const price = CLAUDE_PRICE[model]!;
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  return {
    usd:
      (response.usage.input_tokens * price.input +
        response.usage.output_tokens * price.output) /
      1e6,
    ...(text
      ? parseDraft(text)
      : { ok: false, error: `no answer (${response.stop_reason})` }),
  };
}

async function runModel(
  candidate: Model,
  site: Site,
  own: OwnPages,
  run: number,
): Promise<Result> {
  const start = performance.now();
  try {
    const result =
      candidate.via === "openai"
        ? await viaOpenAI(site, own)
        : candidate.via === "openai-direct"
          ? await viaOpenAIDirect(candidate.model, candidate.effort, site, own)
          : candidate.via === "cheaper"
            ? await viaCheaper(candidate.model, candidate.effort, site, own)
            : candidate.via === "deepseek-direct"
              ? await viaDeepSeek(candidate.model, candidate.effort, site, own)
              : await viaAnthropic(candidate.model, site, own);
    return {
      model: candidate.key,
      site: site.url,
      run,
      seconds: seconds(start),
      usd: result.usd ?? null,
      ok: result.ok ?? false,
      ...result,
    };
  } catch (error) {
    return {
      model: candidate.key,
      site: site.url,
      run,
      seconds: seconds(start),
      usd: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The live reader on the pages an earlier run chose (its site map
 * replaced by those addresses, so no map credit): today's trimming and
 * branch-page limit on fresh text. */
async function rereadOwn(site: Site, earlier: OwnPages): Promise<OwnPages> {
  const home = earlier.pages[0]!.url;
  const read = await readPagesForReport({
    ownSite: site.url,
    sources: [],
    concurrency: 2,
    fetcher: {
      ...firecrawlFetcher(
        process.env.FIRECRAWL_API_KEY!.trim(),
        cappedFetch(patientFetch(fetch), earlier.pages.length),
      ),
      map: async () =>
        earlier.pages
          .filter((page) => page.url !== home)
          .map((page) => ({ url: page.url })),
    },
  });
  return { pages: read.pages, unread: read.unread, requests: 0 };
}

describe("step 3 model comparison", () => {
  it("builds one request per model from the live instructions, with pages and no search", () => {
    const { developer, user } = requestFor(
      SITES[0],
      {
        pages: [
          {
            url: SITES[0].url,
            domain: "sozoskinclinic.com",
            title: "SOZO",
            kind: "own",
            cited_in: [],
            text: "Halaman contoh.",
          },
        ],
        unread: [],
        requests: 1,
      },
      "glm-5.3-flash",
    );
    expect(developer).toContain(
      "pages_read holds pages of the official website",
    );
    expect(developer).not.toContain("Web search remains restricted");
    expect(JSON.parse(user).pages_read).toHaveLength(1);
  });

  it.runIf(LIVE)(
    "runs every model on the founder's three sites",
    async () => {
      const models = MODELS.filter(
        (candidate) => !ONLY || ONLY.includes(candidate.key),
      );
      for (const key of [
        "OPENAI_API_KEY",
        "CHEAPERINFERENCE_API_KEY",
        "NUAVE_ANTHROPIC_API_KEY",
        ...(SAVED_PAGES ? [] : ["FIRECRAWL_API_KEY"]),
        ...(models.some((candidate) => candidate.via === "deepseek-direct")
          ? ["DEEPSEEK_API_KEY"]
          : []),
      ])
        expect(process.env[key], key).toBeTruthy();
      expect(models.length).toBeGreaterThan(0);
      mkdirSync(OUT, { recursive: true });
      const reads: Record<string, unknown>[] = [];
      const results: Result[] = [];
      const save = () =>
        writeFileSync(
          join(OUT, OUT_FILE),
          JSON.stringify({ reads, results }, null, 2),
        );
      for (const site of SITES) {
        const start = performance.now();
        const host = new URL(site.url).hostname;
        const saved = (): OwnPages => ({
          pages: JSON.parse(readFileSync(pagesFile(site), "utf8")),
          unread: [],
          requests: 0,
        });
        const own: OwnPages | null =
          REREAD && REREAD_SITES.includes(host)
            ? await rereadOwn(site, saved())
            : SAVED_PAGES
              ? saved()
              : await readOwnSiteLive({
                  apiKey: process.env.FIRECRAWL_API_KEY,
                  website: site.url,
                });
        reads.push({
          site: site.url,
          source:
            REREAD && REREAD_SITES.includes(host)
              ? "reread"
              : SAVED_PAGES
                ? "saved"
                : "read",
          chars: own?.pages.map((page) => page.text.length) ?? [],
          seconds: seconds(start),
          pages: own?.pages.map((page) => page.url) ?? [],
          unread: own?.unread ?? [],
          requests: own?.requests ?? 0,
        });
        save();
        if (!own) continue;
        if (!SAVED_PAGES)
          writeFileSync(pagesFile(site), JSON.stringify(own.pages, null, 2));
        if (REREAD && REREAD_SITES.includes(host))
          writeFileSync(rereadFile(site), JSON.stringify(own.pages, null, 2));
        for (let run = 1; run <= RUNS; run += 1)
          for (const candidate of models) {
            results.push(await runModel(candidate, site, own, run));
            save();
          }
      }
      console.table(reads);
      console.table(
        results.map(
          ({ model, site, run, seconds, usd, effort, ok, error }) => ({
            model,
            site: new URL(site).hostname,
            run,
            seconds,
            usd: usd === null ? "" : usd.toFixed(4),
            effort: effort ?? "",
            ok,
            error: error ?? "",
          }),
        ),
      );
    },
    60 * 60_000,
  );
});
