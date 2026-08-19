/**
 * Phase 1 — LIVE extraction for Kopi Kenangan (real business, OpenCode Go).
 *
 * Runs ONLY the 03 Business Facts extraction call against
 * https://kopikenangan.com/ through the low-cost OpenCode Go provider
 * (NUAVE_PROVIDER=opencodego). Output: the extracted draft + telemetry written
 * to .secrets/kk-live-run-2026-08-19/extraction.json (gitignored). The draft
 * is a SUGGESTION for human confirmation; questions are NOT run here.
 *
 * Runtime-only wiring workaround: the OpenAI SDK client in openai.ts reads
 * OPENAI_API_KEY, while the working OpenCode Go credential is
 * OPENCODEGO_API_KEY (and OPENAI_BASE_URL already points at the OpenCode Go
 * endpoint). This script sets OPENAI_API_KEY from OPENCODEGO_API_KEY in the
 * process only; no config file or src/ change.
 *
 * Run: npx --yes tsx scripts/kk/extract.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

// Runtime-only workaround (see header). OPENAI_BASE_URL is already set to the
// OpenCode Go endpoint in .env.local, so the SDK routes there and must send
// the OpenCode Go key. .env.local also carries an unrelated OPENAI_API_KEY that
// is invalid against the OpenCode endpoint (probe returned 401), so override
// it unconditionally for this OpenCode Go run.
if (process.env.OPENCODEGO_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPENCODEGO_API_KEY;
}

import { extractBusinessDraft } from "../../src/lib/audit/openai";
import type { AuditBudget } from "../../src/lib/audit/types";

const RUN_ID = "kk-live-run-2026-08-19";
const ARTIFACTS_DIR = join(process.cwd(), ".secrets", RUN_ID);
const SAFETY_IDENTIFIER = "nuave-private-live-run-2026-08-19-kopi-kenangan";
const LIMIT_USD = 5;

const INPUT = {
  website_url: "https://kopikenangan.com/",
  brand_name: "Kopi Kenangan",
  market_context: "Jakarta dan Indonesia",
  category: "Jaringan kedai kopi",
};

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  console.log(`Provider: ${process.env.NUAVE_PROVIDER}`);
  console.log(`Base URL: ${process.env.OPENAI_BASE_URL}`);
  console.log(
    `Model: ${process.env.OPENAI_AUDIT_MODEL || "default gpt-5.6-luna"}`,
  );
  console.log(`Extracting: ${INPUT.website_url}`);

  const budget: AuditBudget = { limit_usd: LIMIT_USD, carryover_cost_usd: 0, calls: [] };
  const startedAt = Date.now();

  try {
    const result = await extractBusinessDraft({
      website_url: INPUT.website_url,
      brand_name: INPUT.brand_name,
      market_context: INPUT.market_context,
      category: INPUT.category,
      safety_identifier: SAFETY_IDENTIFIER,
      budget,
    });

    const elapsedMs = Date.now() - startedAt;
    const artifact = {
      run_id: RUN_ID,
      input: INPUT,
      requested_model: "gpt-5.6-luna",
      returned_model: result.returned_model,
      response_id: result.response_id,
      elapsed_ms: elapsedMs,
      draft: result.draft,
      telemetry: result.telemetry,
    };
    writeFileSync(
      join(ARTIFACTS_DIR, "extraction.json"),
      JSON.stringify(artifact, null, 2),
      "utf8",
    );

    console.log("\n=== EXTRACTION DRAFT (suggestion — requires human confirmation) ===");
    console.log(JSON.stringify(result.draft, null, 2));
    console.log(
      `\nReturned model: ${result.returned_model} · response ${result.response_id} · ${elapsedMs}ms`,
    );
    console.log(`Artifacts: ${join(ARTIFACTS_DIR, "extraction.json")}`);
  } catch (error) {
    console.error("EXTRACTION FAILED:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("EXTRACT FAILED:", error);
  process.exit(1);
});