import { z } from "zod";
import type { IntakeFixture } from "./fixtures";
import type { IntakeState } from "./state";
import { INTAKE_SCREEN_ORDER, type IntakeScreenId } from "./screens";
import type { LocalQuestionPack } from "./local-questions";

/** A separate local-only record. No live workflow/session key is read or written. */
export const LOCAL_INTAKE_STORAGE_KEY = "nuave.localIntake.v1";

export type LocalSession = {
  version: 1;
  fixture: IntakeFixture;
  answers: IntakeState;
  current: IntakeScreenId;
  visited: IntakeScreenId[];
  confirmed: IntakeScreenId[];
  identityReady: boolean;
  pack: LocalQuestionPack | null;
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
    answers: stateSchema,
    current: screen,
    visited: z.array(screen).max(100),
    confirmed: z.array(screen).max(15),
    identityReady: z.boolean(),
    pack: z.unknown(),
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
