/**
 * Funnel allowlist tests: the privacy boundary for intake analytics.
 * Answer text, brand/source content, and contact/payment data must throw;
 * ids, timestamps, and counts/booleans pass. Offline, no I/O.
 */
import { describe, expect, it } from "vitest";
import { emitIntakeEvent } from "./events";

const BASE = { screenId: "s-brand", at: 1_700_000_000_000 } as const;

describe("intake funnel allowlist", () => {
  it("accepts a minimal valid event", () => {
    const event = emitIntakeEvent("intake_started", { ...BASE });
    expect(event.name).toBe("intake_started");
  });

  it("accepts allowlisted count/boolean keys", () => {
    const event = emitIntakeEvent("intake_answer_corrected", {
      ...BASE,
      correctionCount: 2,
      completed: false,
    });
    expect(event.payload.correctionCount).toBe(2);
  });

  it("rejects an unknown event name", () => {
    expect(() =>
      emitIntakeEvent("intake_hacked" as never, { ...BASE }),
    ).toThrow(/unknown intake funnel event/);
  });

  it("rejects answer text and brand/source content keys", () => {
    for (const key of [
      "answerText",
      "brandName",
      "sourceUrl",
      "offeringText",
      "freeText",
      "competitor",
    ]) {
      expect(() =>
        emitIntakeEvent("intake_continued", {
          ...BASE,
          [key]: "x",
        } as never),
      ).toThrow(/allowlisted|forbidden/);
    }
  });

  it("rejects contact/payment keys", () => {
    for (const key of ["email", "phone", "paymentToken"]) {
      expect(() =>
        emitIntakeEvent("intake_continued", {
          ...BASE,
          [key]: "x",
        } as never),
      ).toThrow(/allowlisted|forbidden/);
    }
  });

  it("rejects unknown screen ids and negative timestamps", () => {
    expect(() =>
      emitIntakeEvent("intake_started", {
        screenId: "s-narnia",
        at: BASE.at,
      } as never),
    ).toThrow(/unknown intake screen id/);
    expect(() =>
      emitIntakeEvent("intake_started", { ...BASE, at: -1 }),
    ).toThrow(/non-negative/);
  });
});
