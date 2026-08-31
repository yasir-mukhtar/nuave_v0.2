/**
 * One-call LIVE smoke check for the free OpenRouter audit path.
 *
 * Verifies, in order: the key is present and accepted, the configured `:free`
 * slug actually has an endpoint, a plain observation returns usable text, and
 * JSON mode returns a parseable object (the extraction and report stages need
 * it). Costs nothing and uses 2 of the day's free requests.
 *
 *   npx vitest run scripts/openrouter
 *   OPENROUTER_AUDIT_MODEL=openai/gpt-oss-20b:free npx vitest run scripts/openrouter
 *
 * It lives outside src/ so `npm run test:audit` (`vitest run src/lib/audit`)
 * never picks it up, and it SKIPS itself when OPENROUTER_API_KEY is absent so
 * a bare `vitest run` never fails on a machine without the credential.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditModel,
  executeAuditPrompt,
  openrouterChat,
  parseJsonObject,
} from "../../src/lib/audit/openrouter";
import {
  AUDIT_COST_LIMIT_USD,
  auditObservationSchema,
  businessBriefSchema,
  promptSchema,
  type AuditBudget,
} from "../../src/lib/audit/types";
import { measurementSlotForOrder } from "../../src/lib/audit/measurement-matrix";

function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
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
    // A real env var wins, so a one-off command-line override still applies.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const configured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
const smokeSlot = measurementSlotForOrder(3);
if (!smokeSlot) throw new Error("OpenRouter smoke slot is missing.");

// Free models queue behind paid traffic; a cold start of 30-60s is normal.
const LIVE_TIMEOUT_MS = 180_000;

describe("OpenRouter free path smoke check", () => {
  it.skipIf(!configured)(
    "answers a plain question with usable text",
    async () => {
      const model = auditModel();
      console.log(`model: ${model}`);
      if (!model.endsWith(":free")) {
        console.warn(
          `WARN "${model}" is not a :free slug — this call is BILLED to your OpenRouter credits.`,
        );
      }
      const result = await openrouterChat({
        model,
        messages: [
          { role: "system", content: "Jawab singkat dalam Bahasa Indonesia." },
          { role: "user", content: "Sebutkan satu kota di Indonesia." },
        ],
        maxOutputTokens: 512,
      });
      console.log(`served by: ${result.returnedModel}`);
      console.log(`answer: ${result.text.trim().slice(0, 200)}`);
      expect(result.text.trim().length).toBeGreaterThan(0);
    },
    LIVE_TIMEOUT_MS,
  );

  it.skipIf(!configured)(
    "returns a parseable object in JSON mode, which 03 and 06 depend on",
    async () => {
      const result = await openrouterChat({
        model: auditModel(),
        messages: [
          { role: "system", content: "Output JSON only." },
          {
            role: "user",
            content: 'Return {"ok": true, "note": "<one short string>"}.',
          },
        ],
        jsonMode: true,
        maxOutputTokens: 128,
      });
      const parsed = parseJsonObject(result.text);
      console.log(`json: ${JSON.stringify(parsed).slice(0, 200)}`);
      expect(parsed).toMatchObject({ ok: true });
    },
    LIVE_TIMEOUT_MS,
  );
  it.skipIf(!configured)(
    "produces a schema-valid observation through the wired audit stage",
    async () => {
      // The full 05 stage, not just the transport: the returned object must
      // satisfy the same auditObservationSchema every other provider returns,
      // or the orchestrator and the report pipeline will reject it later.
      const prompt = promptSchema.parse({
        prompt_id: smokeSlot.id,
        category: smokeSlot.legacyCategory,
        role: smokeSlot.generatorSlotDescription,
        branded: smokeSlot.legacyBranded,
        question:
          "Klinik gigi yang bagus di Depok untuk pasang behel apa saja?",
        rationale: "Smoke check for the free OpenRouter path.",
        inputs_used: [...smokeSlot.allowedContextFields],
        review_status: "needs_human_review",
      });
      const brief = businessBriefSchema.parse({
        brand_name: "Contoh Klinik",
        entity_scope: "Depok",
        brand_type: "clinic",
        category: "dental clinic",
        market_context: "Depok, Jawa Barat",
        target_customer: "Adults seeking orthodontic treatment",
        official_sources: ["https://example.com"],
        verified_offerings: ["Orthodontics"],
        verified_customer_needs: [],
        verified_decision_criteria: [],
        verified_competitor: {
          name: "Contoh Pembanding",
          scope: "Depok",
          source_url: "https://example.com",
        },
        brand_name_variants: [],
        priority_offering: "",
        conversion_action: "",
        customer_supplied_facts: [],
        known_accuracy_questions: [],
        usp: "",
        regulated_category_notes: "",
        language: "en-US",
        agency_name: "",
        agency_logo_data_url: "",
      });
      const budget: AuditBudget = {
        limit_usd: AUDIT_COST_LIMIT_USD,
        carryover_cost_usd: 0,
        calls: [],
      };

      const observation = await executeAuditPrompt({
        prompt,
        brief,
        safety_identifier: "openrouter-smoke",
        budget,
      });
      console.log(`run_status: ${observation.run_status}`);
      console.log(`failure_reason: ${observation.failure_reason}`);
      console.log(`answer: ${observation.raw_answer.slice(0, 200)}`);

      expect(auditObservationSchema.safeParse(observation).success).toBe(true);
      expect(observation.run_status).toBe("completed");
      expect(observation.raw_answer.trim().length).toBeGreaterThan(0);
      // No search on this path — the empty source list is the honest record.
      expect(observation.sources).toEqual([]);
      expect(observation.telemetry[0].accounted_cost_usd).toBe(0);
    },
    LIVE_TIMEOUT_MS,
  );
});
