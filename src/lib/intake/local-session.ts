import { z } from "zod";
import {
  auditCallTelemetrySchema,
  type AuditCallTelemetry,
} from "../audit/types";
import type { IntakeFixture } from "./fixtures";
import type { IntakeState } from "./state";
import { INTAKE_SCREEN_ORDER, type IntakeScreenId } from "./screens";
import type { LocalQuestionPack } from "./local-questions";

/** A separate local-only record. No live workflow/session key is read or written. */
export const LOCAL_INTAKE_STORAGE_KEY = "nuave.localIntake.v1";

/** Spec 010 R-06: one record per GLM question-generation attempt the client
 * started. `succeeded`/`failed` mean a response reached the browser
 * (execution "confirmed" — a real provider call is accounted); `interrupted`
 * means the request never produced a usable response (fetch threw, aborted,
 * timed out or returned nothing readable) so provider execution stays
 * "unknown" and cost is always null. A failed response that carried provider
 * billing keeps that cost; anything else records null. Requests rejected
 * before provider work (switch off, method 400, rate-limit 429, credential or
 * frozen-attempt refusals) record no attempt at all — zero calls, zero cost. */
export type GenerationAttempt = {
  started_at: string;
  outcome: "succeeded" | "failed" | "interrupted";
  execution: "confirmed" | "unknown";
  cost_usd: number | null;
};

export type LocalSession = {
  version: 1;
  fixture: IntakeFixture;
  /** Spec 010 R-08: how the journey began. A stored session restores only
   * into a matching start — a fixture-seeded session never seeds the public
   * blank entry, and a blank session never overrides a fixture seed.
   * Sessions written before this marker existed count as "fixture". */
  origin?: "blank" | "fixture";
  answers: IntakeState;
  current: IntakeScreenId;
  visited: IntakeScreenId[];
  confirmed: IntakeScreenId[];
  identityReady: boolean;
  pack: LocalQuestionPack | null;
  /** Identity/extraction boundary telemetry from the reading phase — folded
   * into the audit session's budget ledger so authorized preparation spend
   * is never lost across a reload. Absent on deterministic fixtures. */
  preparationCalls?: AuditCallTelemetry[];
  /** Which preparation path served this session — explicit provenance from
   * the boundary, surfaced in the audit record and evidence export. */
  preparationMode?: "synthetic-local" | "live";
  /** Spec 010 R-06: every GLM question-generation attempt this session
   * started — the client-side ledger the evidence export totals read. */
  generation_attempts?: GenerationAttempt[];
};

const text = z.string().max(2000);
const ids = z.array(text).max(100);
const item = z
  .object({ id: text, label: text, on: z.boolean(), detail: text.optional() })
  .strict();
const single = z
  .object({ selectedId: text.nullable(), custom: z.array(item).max(100) })
  .strict();
const multiple = z
  .object({ onIds: ids, custom: z.array(item).max(100) })
  .strict();
const identity = z.object({ name: text, source: text }).strict();
const screen = z.enum(INTAKE_SCREEN_ORDER);
const generationAttempt = z
  .object({
    started_at: z.string().max(60),
    outcome: z.enum(["succeeded", "failed", "interrupted"]),
    execution: z.enum(["confirmed", "unknown"]),
    cost_usd: z.number().nonnegative().nullable(),
  })
  .strict();
const stateSchema = z
  .object({
    scope: z.enum(["brand", "cabang", "produk"]),
    scopeOptionId: text.nullable(),
    scopeCommitted: z.boolean(),
    brandCorrected: identity.nullable(),
    brandFixDraft: identity,
    branch: single,
    product: single,
    category: z
      .object({ selectedId: text.nullable(), customLabel: text.nullable() })
      .strict(),
    offerings: multiple,
    customers: multiple,
    service: z
      .object({
        onIds: z.array(
          z.enum([
            "service-location",
            "service-customer",
            "service-delivery",
            "service-online",
          ]),
        ),
      })
      .strict(),
    market: z
      .object({
        kind: z.enum(["sekitar", "beberapa", "seluruh", "luar"]).nullable(),
        areaIds: ids,
        customAreas: ids,
      })
      .strict(),
    competitors: z
      .object({ keptIds: ids, custom: ids, noDirect: z.boolean() })
      .strict(),
    facts: z.object({ text }).strict(),
    factVersion: z.number().int().positive(),
  })
  .strict();
const fixtureSchema = z
  .object({
    entry: screen,
    screens: z.record(
      screen,
      z
        .object({
          prepared: z.array(item).max(100),
          selected: ids,
          note: text.optional(),
        })
        .strict(),
    ),
  })
  .strict();
const sessionSchema = z
  .object({
    version: z.literal(1),
    fixture: fixtureSchema,
    origin: z.enum(["blank", "fixture"]).optional(),
    answers: stateSchema,
    current: screen,
    visited: z.array(screen).max(100),
    confirmed: z.array(screen).max(15),
    identityReady: z.boolean(),
    pack: z.unknown(),
    preparationCalls: z.array(auditCallTelemetrySchema).max(10).optional(),
    preparationMode: z.enum(["synthetic-local", "live"]).optional(),
    generation_attempts: z.array(generationAttempt).max(40).optional(),
  })
  .strict();

/** Structural validation first; question contract validation belongs to its boundary. */
export function parseLocalSession(
  raw: string | null,
): (Omit<LocalSession, "pack"> & { pack: unknown }) | null {
  if (!raw || raw.length > 400_000) return null;
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const value = parsed.data;
    const state = value.answers;
    if (state.scope !== "cabang" && state.branch.selectedId !== null)
      return null;
    if (state.scope !== "produk" && state.product.selectedId !== null)
      return null;
    if (state.scope === "produk" && state.offerings.onIds.length) return null;
    if (
      state.competitors.noDirect &&
      (state.competitors.keptIds.length || state.competitors.custom.length)
    )
      return null;
    if (
      ["seluruh", "luar"].includes(state.market.kind ?? "") &&
      (state.market.areaIds.length || state.market.customAreas.length)
    )
      return null;
    if (value.current !== "s-crawl" && !value.identityReady) return null;
    return value;
  } catch {
    return null;
  }
}
