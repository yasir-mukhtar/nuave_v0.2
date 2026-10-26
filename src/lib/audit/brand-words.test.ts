import { describe, expect, it } from "vitest";
import { CONTEXT } from "../orders/orders.test-helper";
import type { DirectTenAuditContext } from "./direct-ten-context-v2";
import { projectQuestionFactsV2 } from "./question-facts-v3";
import { minimizedBriefFromQuestionFacts } from "./questions-id-glm";
import {
  distinctiveBrandTokens,
  mentionsIndonesianBrand,
} from "./questions-id";

// 2026-10-26: for "Sozo Skin Clinic", "skin" counted as a brand word, so its
// own offering "Skin Booster" became a name of the business and every
// question about skin boosters was rejected as naming it. The question writer
// then failed for that clinic every time.

describe("distinctiveBrandTokens", () => {
  it("keeps the words that identify a business and drops generic ones", () => {
    expect(
      distinctiveBrandTokens("Sozo Skin Clinic", "Klinik kecantikan"),
    ).toEqual(["sozo"]);
    expect(
      distinctiveBrandTokens("Natasha Skin Care", "Klinik kecantikan"),
    ).toEqual(["natasha"]);
    expect(distinctiveBrandTokens("Erha Dermatology", "Klinik kulit")).toEqual([
      "erha",
    ]);
    expect(distinctiveBrandTokens("Kopi Kenangan", "Kedai kopi")).toEqual([
      "kenangan",
    ]);
    expect(
      distinctiveBrandTokens("Beauty Glow Clinic", "Klinik kecantikan"),
    ).toEqual([]);
  });
});

function sozo(offerings: string[]): DirectTenAuditContext {
  return {
    ...CONTEXT,
    identity: {
      name: "Sozo Skin Clinic",
      source: "https://sozoskinclinic.com/",
      sourceOrigin: "owner",
      aliases: ["SOZO"],
      origin: "owner",
    },
    category: { value: "klinik kecantikan", origin: "website" },
    offerings: { value: offerings, origin: "website" },
  };
}

describe("a clinic with a generic word in its name", () => {
  it("keeps its ordinary services usable in questions, and still guards its branded ones", () => {
    const projection = projectQuestionFactsV2({
      context: sozo(["Skin Booster", "Laser Treatment", "Sozo Glow Booster"]),
      factVersion: 1,
    });
    if (projection.status !== "projected") throw new Error("not projected");
    const { facts } = projection;
    expect(facts.identity.targets).not.toContain("Skin Booster");
    expect(facts.identity.targets).not.toContain("Laser Treatment");
    expect(facts.identity.targets).toContain("Sozo Glow Booster");
    const brief = minimizedBriefFromQuestionFacts(facts);
    expect(
      mentionsIndonesianBrand(
        "Ada rekomendasi klinik skin booster yang bagus?",
        brief,
      ),
    ).toBe(false);
    expect(
      mentionsIndonesianBrand("Berapa harga skin booster di Sozo?", brief),
    ).toBe(true);
    expect(
      mentionsIndonesianBrand(
        "Apakah Sozo Glow Booster aman untuk kulit kering?",
        brief,
      ),
    ).toBe(true);
    expect(
      mentionsIndonesianBrand("Review Sozo Skin Clinic Kelapa Gading?", brief),
    ).toBe(true);
  });
});
