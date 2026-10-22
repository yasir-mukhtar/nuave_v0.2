import { describe, expect, it } from "vitest";
import {
  contextMarketLabel,
  isDirectTenAuditContext,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import type { SpendDb } from "../spending/spend-ledger";
import { CONTEXT } from "./orders.test-helper";
import { readyEmailDetails } from "./ready-email-details";
import type { OrderRow } from "./store";

// J31: what the ready email says about where the audit looked and when the
// answers were observed. Read from what the order saved; a value that cannot
// be read is left out, never guessed.

type Row = { observation_json: string | null };

/** The one query the helper makes: the order's question rows. */
function questionsDb(rows: Row[] | Error): SpendDb {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => {
          if (rows instanceof Error) throw rows;
          return { results: rows };
        },
      }),
    }),
    batch: async () => [],
  } as unknown as SpendDb;
}

function order(intakeJson: string | null): OrderRow {
  return { id: "a".repeat(32), intake_json: intakeJson } as OrderRow;
}

const withContext = (context: DirectTenAuditContext) =>
  order(JSON.stringify({ context }));

const observed = (observed_at: unknown): Row => ({
  observation_json: JSON.stringify({ observed_at }),
});

describe("readyEmailDetails", () => {
  it("names the market for a whole-brand audit and the earliest observation", async () => {
    const details = await readyEmailDetails(
      questionsDb([
        observed("2026-10-18T03:12:00.000Z"),
        observed("2026-10-18T03:10:00.000Z"),
        { observation_json: null },
        observed("bukan-tanggal"),
        observed(42),
      ]),
      withContext(CONTEXT),
    );
    expect(details).toEqual({
      scope: contextMarketLabel(CONTEXT) || null,
      observedAt: "2026-10-18T03:10:00.000Z",
    });
    expect(details.scope).toBeTruthy();
  });

  it("names the branch or the product a focused audit looked at", async () => {
    const branch: DirectTenAuditContext = {
      ...CONTEXT,
      focus: {
        value: {
          kind: "cabang",
          name: "Kopi Nuave Kemang",
          address: "Jl. Kemang 1, Jakarta",
        },
        origin: "owner",
      },
    };
    const product: DirectTenAuditContext = {
      ...CONTEXT,
      focus: { value: { kind: "produk", name: "kopi susu" }, origin: "owner" },
    };
    expect(isDirectTenAuditContext(branch)).toBe(true);
    expect(isDirectTenAuditContext(product)).toBe(true);
    expect(
      (await readyEmailDetails(questionsDb([]), withContext(branch))).scope,
    ).toBe("Kopi Nuave Kemang");
    expect(
      (await readyEmailDetails(questionsDb([]), withContext(product))).scope,
    ).toBe("kopi susu");
  });

  it("leaves out what cannot be read instead of guessing", async () => {
    expect(
      await readyEmailDetails(questionsDb(new Error("D1 down")), order("{")),
    ).toEqual({ scope: null, observedAt: null });
    expect(
      await readyEmailDetails(
        questionsDb([observed("bukan-tanggal"), { observation_json: "{" }]),
        order(null),
      ),
    ).toEqual({ scope: null, observedAt: null });
    // Saved intake that is not a direct-ten context names no scope.
    expect(
      (
        await readyEmailDetails(
          questionsDb([]),
          order(JSON.stringify({ context: { version: 1 } })),
        )
      ).scope,
    ).toBeNull();
  });
});
