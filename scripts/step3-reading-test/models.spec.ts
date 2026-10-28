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
 * STEP3_MODELS (comma-separated keys) runs only those models;
 * STEP3_PAGES=saved reuses the pages an earlier run saved (no Firecrawl
 * credit); STEP3_OUT names the results file (default models.json).
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

const LIVE = process.env.STEP3_MODELS_LIVE === "1";
const OUT = join(process.cwd(), ".local-evidence", "step3-reading-test");
const CHEAPER = "https://api.cheaperinference.com/v1/chat/completions";
const RUNS = 2;

const SITES = [
  { url: "https://sozoskinclinic.com/", name: "SOZO Skin Clinic" },
  { url: "https://www.audydental.com/", name: "Audy Dental" },
  { url: "https://brawijayahospital.com/", name: "Brawijaya Hospital" },
] as const;
type Site = (typeof SITES)[number];
type Effort = "low" | "medium";

const MODELS = [
  { key: "gpt-5.6-luna-low (today)", via: "openai", model: "gpt-5.6-luna" },
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
const SAVED_PAGES = process.env.STEP3_PAGES === "saved";
const OUT_FILE = process.env.STEP3_OUT?.trim() || "models.json";
const pagesFile = (site: Site) =>
  join(OUT, `models-pages-${new URL(site.url).hostname}.json`);

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
        : candidate.via === "cheaper"
          ? await viaCheaper(candidate.model, candidate.effort, site, own)
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
      for (const key of [
        "OPENAI_API_KEY",
        "CHEAPERINFERENCE_API_KEY",
        "NUAVE_ANTHROPIC_API_KEY",
        ...(SAVED_PAGES ? [] : ["FIRECRAWL_API_KEY"]),
      ])
        expect(process.env[key], key).toBeTruthy();
      const models = MODELS.filter(
        (candidate) => !ONLY || ONLY.includes(candidate.key),
      );
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
        const own: OwnPages | null = SAVED_PAGES
          ? {
              pages: JSON.parse(readFileSync(pagesFile(site), "utf8")),
              unread: [],
              requests: 0,
            }
          : await readOwnSiteLive({
              apiKey: process.env.FIRECRAWL_API_KEY,
              website: site.url,
            });
        reads.push({
          site: site.url,
          seconds: seconds(start),
          pages: own?.pages.map((page) => page.url) ?? [],
          unread: own?.unread ?? [],
          requests: own?.requests ?? 0,
        });
        save();
        if (!own) continue;
        if (!SAVED_PAGES)
          writeFileSync(pagesFile(site), JSON.stringify(own.pages, null, 2));
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
