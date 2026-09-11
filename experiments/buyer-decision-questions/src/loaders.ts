/**
 * Fixture and instruction loaders with freeze enforcement.
 *
 * Fixtures and the B instruction are frozen: every loader verifies the file
 * bytes against the recorded sha256 in the matching manifest and refuses to
 * proceed on any mismatch, so a later edit cannot silently change what runs.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  FIXTURES_DIR,
  FIXTURES_MANIFEST_FILE,
  INSTRUCTIONS_DIR,
  INSTRUCTIONS_MANIFEST_FILE,
} from "./experiment-config";
import type { Condition } from "./experiment-config";

export const sha256Hex = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

export type FixtureRole = "development" | "held-out";

/** The BusinessBrief-shaped subset the fixtures carry. Absent facts are empty
 * strings / empty arrays / an empty competitor name — never invented values.
 * The production zod schema (src/lib/audit/types.ts) additionally requires
 * provenance fields (official_sources, target_customer) that the fixtures
 * intentionally omit, so fixtures are validated by this shape check instead
 * of parsed through the production intake schema. */
export type ExperimentBusiness = {
  brand_name: string;
  brand_name_variants: string[];
  entity_scope: string;
  brand_type: string;
  category: string;
  market_context: string;
  target_customer: string;
  official_sources: string[];
  verified_offerings: string[];
  verified_customer_needs: string[];
  verified_decision_criteria: string[];
  verified_competitor: { name: string; scope: string; source_url: string };
  priority_offering: string;
  conversion_action: string;
  customer_supplied_facts: string[];
  known_accuracy_questions: string[];
  usp: string;
  regulated_category_notes: string;
  language: string;
  agency_name: string;
  agency_logo_data_url: string;
};

export type LoadedFixture = {
  fixture_id: string;
  role: FixtureRole;
  fictional: boolean;
  version: number;
  frozen_at: string;
  sha256: string;
  review_title: string;
  review_summary: string;
  business_summary: {
    name: string;
    scope: string;
    category: string;
    offering: string;
    buyer_need: string;
    note: string;
  };
  absent_context: string[];
  business: ExperimentBusiness;
};

export type LoadedInstruction = {
  instruction_id: string;
  version: string;
  frozen_at: string;
  sha256: string;
  text: string;
};

type FixturesManifest = {
  fixtures: Array<{
    fixture_id: string;
    file: string;
    role: FixtureRole;
    version: number;
    sha256: string;
  }>;
};

type InstructionsManifest = {
  instructions: Array<{
    instruction_id: string;
    file: string;
    version?: string;
    snapshot_of?: string;
    sha256: string;
  }>;
};

function readJsonFile<T>(filePath: string, label: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function fixturesManifest(): FixturesManifest {
  return readJsonFile<FixturesManifest>(
    path.join(FIXTURES_DIR, FIXTURES_MANIFEST_FILE),
    "Fixtures manifest",
  );
}

function instructionsManifest(): InstructionsManifest {
  return readJsonFile<InstructionsManifest>(
    path.join(INSTRUCTIONS_DIR, INSTRUCTIONS_MANIFEST_FILE),
    "Instructions manifest",
  );
}

function assertShape(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function validateBusinessShape(value: unknown): asserts value is ExperimentBusiness {
  assertShape(
    typeof value === "object" && value !== null && !Array.isArray(value),
    "fixture business must be an object",
  );
  const record = value as Record<string, unknown>;
  const stringKeys = [
    "brand_name",
    "entity_scope",
    "brand_type",
    "category",
    "market_context",
    "target_customer",
    "priority_offering",
    "conversion_action",
    "usp",
    "regulated_category_notes",
    "language",
    "agency_name",
    "agency_logo_data_url",
  ] as const;
  const stringArrayKeys = [
    "brand_name_variants",
    "official_sources",
    "verified_offerings",
    "verified_customer_needs",
    "verified_decision_criteria",
    "customer_supplied_facts",
    "known_accuracy_questions",
  ] as const;
  for (const key of stringKeys) {
    assertShape(
      typeof record[key] === "string",
      `fixture business.${key} must be a string`,
    );
  }
  for (const key of stringArrayKeys) {
    assertShape(
      Array.isArray(record[key]) &&
        (record[key] as unknown[]).every((item) => typeof item === "string"),
      `fixture business.${key} must be an array of strings`,
    );
  }
  const competitor = record.verified_competitor as Record<string, unknown>;
  assertShape(typeof competitor === "object" && competitor !== null, "verified_competitor must be an object");
  assertShape(
    typeof competitor.name === "string" &&
      typeof competitor.scope === "string" &&
      typeof competitor.source_url === "string",
    "verified_competitor must have string name/scope/source_url",
  );
  // A usable fixture needs a brand, a scope, a category and at least one
  // customer need; everything else may legitimately be absent.
  assertShape(record.brand_name !== "", "fixture brand_name must not be empty");
  assertShape(record.entity_scope !== "" || record.market_context !== "", "fixture needs entity_scope or market_context");
  assertShape(record.category !== "", "fixture category must not be empty");
  assertShape(
    (record.verified_customer_needs as string[]).length > 0,
    "fixture needs at least one verified customer need (buyer decision driver)",
  );
}

export function loadFixture(fixtureId: string): LoadedFixture {
  const manifest = fixturesManifest();
  const entry = manifest.fixtures.find(
    (item) => item.fixture_id === fixtureId,
  );
  if (!entry) {
    throw new Error(`Fixture "${fixtureId}" is not in the fixtures manifest.`);
  }
  const filePath = path.join(FIXTURES_DIR, entry.file);
  const bytes = readFileSync(filePath);
  const actualHash = sha256Hex(bytes);
  if (actualHash !== entry.sha256) {
    throw new Error(
      `Fixture "${fixtureId}" no longer matches its frozen hash (${entry.sha256}). ` +
        `Refusing to run: results must come from the frozen fixture set. If the fixture ` +
        `changed intentionally, record a new fixture version in fixtures/manifest.json first.`,
    );
  }
  const raw = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  assertShape(raw.fixture_id === fixtureId, "fixture file id mismatch");
  validateBusinessShape(raw.business);
  assertShape(
    raw.role === "development" || raw.role === "held-out",
    `fixture ${fixtureId} role must be development or held-out`,
  );
  assertShape(
    raw.version === entry.version,
    `fixture ${fixtureId} version disagrees with the manifest`,
  );
  assertShape(
    raw.role === entry.role,
    `fixture ${fixtureId} role disagrees with the manifest`,
  );
  assertShape(
    typeof raw.review_title === "string" &&
      typeof raw.review_summary === "string" &&
      typeof raw.business_summary === "object" &&
      Array.isArray(raw.absent_context) &&
      raw.absent_context.every((item) => typeof item === "string"),
    `fixture ${fixtureId} review metadata is malformed`,
  );
  return {
    fixture_id: fixtureId,
    role: raw.role as FixtureRole,
    fictional: raw.fictional === true,
    version: entry.version,
    frozen_at: typeof raw.frozen_at === "string" ? raw.frozen_at : "",
    sha256: entry.sha256,
    review_title: raw.review_title as string,
    review_summary: raw.review_summary as string,
    business_summary: raw.business_summary as LoadedFixture["business_summary"],
    absent_context: raw.absent_context as string[],
    business: raw.business,
  };
}

export function loadConditionBInstruction(
  instructionId: string = "condition-b-v1",
): LoadedInstruction {
  const manifest = instructionsManifest();
  const entry = manifest.instructions.find(
    (item) => item.instruction_id === instructionId,
  );
  if (!entry) {
    throw new Error(
      `${instructionId} is not in the instructions manifest; the experiment freeze is incomplete.`,
    );
  }
  const filePath = path.join(INSTRUCTIONS_DIR, entry.file);
  const bytes = readFileSync(filePath);
  const actualHash = sha256Hex(bytes);
  if (actualHash !== entry.sha256) {
    throw new Error(
      `${instructionId} no longer matches its frozen hash (${entry.sha256}). ` +
        `Refusing to run condition B: confirmation and challenger runs must reuse the ` +
        `frozen instruction. Record a new instruction version to change it.`,
    );
  }
  const raw = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  assertShape(
    typeof raw.text === "string" && raw.text.length > 0,
    `${instructionId} text is missing`,
  );
  return {
    instruction_id: instructionId,
    version: typeof raw.version === "string" ? raw.version : instructionId,
    frozen_at: typeof raw.frozen_at === "string" ? raw.frozen_at : "",
    sha256: entry.sha256,
    text: raw.text as string,
  };
}

export function listFixtureIds(): string[] {
  return fixturesManifest().fixtures.map((item) => item.fixture_id);
}

export function fixtureIdsForRole(role: FixtureRole): string[] {
  return fixturesManifest()
    .fixtures.filter((item) => item.role === role)
    .map((item) => item.fixture_id);
}

export function conditionLabel(condition: Condition): string {
  return condition === "A" ? "current approach" : "buyer-decision approach";
}

export type ConditionASnapshot = {
  captured_at: string;
  instruction_sha256: string;
};

/** Reads the informational freeze-time snapshot of the production writer
 * instruction (condition A). Returns null when the snapshot file is absent. */
export function loadConditionASnapshot(): ConditionASnapshot | null {
  const filePath = path.join(INSTRUCTIONS_DIR, "condition-a-snapshot.json");
  if (!existsSync(filePath)) return null;
  const raw = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as Record<string, unknown>;
  if (
    typeof raw.writer_instruction_sha256 !== "string" ||
    typeof raw.captured_at !== "string"
  ) {
    return null;
  }
  return {
    captured_at: raw.captured_at,
    instruction_sha256: raw.writer_instruction_sha256,
  };
}
