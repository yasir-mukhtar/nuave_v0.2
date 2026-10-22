import { describe, expect, it } from "vitest";
import { INDONESIAN_PLACES, placeSuggestions } from "./indonesian-places";

describe("placeSuggestions (J19b)", () => {
  it("offers places that start with the typed text first, then those containing it", () => {
    expect(placeSuggestions("jakarta", [], 10)).toEqual([
      "Jakarta Barat",
      "Jakarta Pusat",
      "Jakarta Selatan",
      "Jakarta Timur",
      "Jakarta Utara",
      "DKI Jakarta",
    ]);
    expect(placeSuggestions("lampung", [])).toEqual([
      "Lampung",
      "Bandar Lampung",
    ]);
  });

  it("ignores case and outer spaces", () => {
    expect(placeSuggestions("  BANDUNG ", [])).toEqual([
      "Bandung",
      "Bandung Barat",
    ]);
  });

  it("skips places already chosen, whatever their case", () => {
    expect(
      placeSuggestions("jakarta", ["jakarta barat", "DKI JAKARTA"], 10),
    ).toEqual([
      "Jakarta Pusat",
      "Jakarta Selatan",
      "Jakarta Timur",
      "Jakarta Utara",
    ]);
    expect(placeSuggestions("bandung", ["Bandung", "Bandung Barat"])).toEqual(
      [],
    );
  });

  it("offers three at most by default, each place once", () => {
    const offered = placeSuggestions("ba", []);
    expect(offered).toHaveLength(3);
    expect(offered.every((place) => /^ba/i.test(place))).toBe(true);
    // Bengkulu is both a province and a city.
    expect(
      INDONESIAN_PLACES.filter((place) => place === "Bengkulu"),
    ).toHaveLength(2);
    expect(placeSuggestions("bengkulu", [], 10)).toEqual(["Bengkulu"]);
  });

  it("offers nothing for empty input or an unknown place", () => {
    expect(placeSuggestions("", [])).toEqual([]);
    expect(placeSuggestions("   ", [])).toEqual([]);
    expect(placeSuggestions("xyzq", [])).toEqual([]);
  });
});
