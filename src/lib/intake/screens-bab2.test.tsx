/**
 * Bab 2-3 screen tests (s-market, s-competitors, s-facts, s-review,
 * s-questions). Offline, no DOM harness: structure assertions go through
 * `renderToStaticMarkup` (same technique as the isolation guard) and
 * interaction logic goes through the exported pure helpers.
 *
 * F1 (rich case) must render rich end-to-end across all five screens.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IntakeJourney from "./IntakeJourney";
import { INTAKE_FIXTURES } from "./fixtures";
import { continueLabelFor, type IntakeScreenSlotProps } from "./navigation";
import {
  BAB2_SCREENS,
  BRANDED_INTENTS,
  containsSensitiveData,
  deriveQuestionSlots,
  deriveReviewRows,
  isMarketAnswerValid,
  isMarketSkippedFixture,
  isThinCompetitorState,
  isUnbrandedViolation,
  resolveAliases,
  resolveBrandName,
  toggleId,
  UNBRANDED_INTENTS,
} from "./screens-bab2";
import { INTAKE_SCREEN_ORDER } from "./screens";

const F1 = INTAKE_FIXTURES["F1"];
const F2 = INTAKE_FIXTURES["F2"];
const F3 = INTAKE_FIXTURES["F3"];
const F5 = INTAKE_FIXTURES["F5"];

const noopEmit = () => {};
const stubNav: IntakeScreenSlotProps["nav"] = {
  onContinue: () => {},
  onBack: () => {},
  canContinue: true,
  canGoBack: true,
  continueLabel: "Lanjut",
};

function renderBab2(
  screenId: keyof typeof BAB2_SCREENS,
  fixture: unknown = F1,
): string {
  const Slot = BAB2_SCREENS[screenId];
  if (!Slot) throw new Error(`missing Bab 2-3 screen ${screenId}`);
  return renderToStaticMarkup(
    createElement(Slot, {
      screenId,
      fixture,
      nav: stubNav,
      emit: noopEmit,
    }),
  );
}

describe("Bab 2-3 wiring map", () => {
  it("exports exactly the five owned screens, all valid screen ids", () => {
    expect(Object.keys(BAB2_SCREENS).sort()).toEqual(
      [
        "s-competitors",
        "s-facts",
        "s-market",
        "s-questions",
        "s-review",
      ].sort(),
    );
    for (const id of Object.keys(BAB2_SCREENS)) {
      expect(INTAKE_SCREEN_ORDER).toContain(id);
    }
  });
});

describe("s-market (F1 rich)", () => {
  const html = renderBab2("s-market");

  it("renders the workbench heading, lead, and four reach cards", () => {
    expect(html).toContain("Di mana pelanggan Anda berada?");
    expect(html).toContain("Pilih jangkauan utama untuk audit ini.");
    for (const card of [
      "Sekitar satu area",
      "Beberapa area",
      "Seluruh Indonesia",
      "Indonesia dan luar negeri",
    ]) {
      expect(html).toContain(card);
    }
  });

  it("reveals the area panel for the prepared nearby reach with area chips", () => {
    // Panel heading is reach-dependent (workbench: sekitar = pick one).
    expect(html).toContain("Pilih satu kota atau area");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Tangerang Selatan");
    expect(html).toContain("Tambah area lain");
    expect(html).not.toContain("Pelanggan harus datang ke lokasi Anda?");
  });

  it("uses radiogroup grammar with 44px targets and reduced-motion CSS", () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain("44px");
    expect(html).toContain("prefers-reduced-motion");
  });

  it("has no skip state: any fixture renders the reach cards", () => {
    const always = renderBab2("s-market", { marketSkipped: true });
    expect(always).toContain("Di mana pelanggan Anda berada?");
    expect(always).toContain("Sekitar satu area");
    expect(always).not.toContain("dilewati");
  });

  it("empty fixture degrades to reach cards, never a dead end", () => {
    const empty = renderBab2("s-market", {});
    expect(empty).toContain("Sekitar satu area");
    expect(empty).not.toContain("Pilih satu kota atau area");
    expect(empty).not.toContain("Pilih semua kota atau area");
  });
});

describe("s-competitors (F1 rich)", () => {
  const html = renderBab2("s-competitors");

  it("renders the workbench heading with the rich lead", () => {
    expect(html).toContain(
      "Bisnis apa yang menjadi alternatif bagi pelanggan Anda?",
    );
    expect(html).toContain(
      "Pilih bisnis yang dipertimbangkan pelanggan untuk kebutuhan yang sama.",
    );
    expect(html).not.toContain("belum menemukan pembanding");
  });

  it("renders 4 prepared checkbox rows, add-line, and the no-direct toggle", () => {
    expect(html).toContain("Fore Coffee");
    expect(html).toContain("Starbucks");
    expect(html).toContain("Tambah bisnis lain");
    expect(html).toContain("Tidak ada pesaing langsung yang saya tahu");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
  });

  it("thin fixture switches to the thin lead", () => {
    const thin = renderBab2("s-competitors", F2);
    expect(thin).toContain("belum menemukan pembanding");
  });

  it("manual empty state still routes forward via add-line + toggle", () => {
    const empty = renderBab2("s-competitors", { screens: {} });
    expect(empty).toContain("Tambah bisnis lain");
    expect(empty).toContain("Tidak ada pesaing langsung yang saya tahu");
  });
});

describe("s-facts (optional, never blocks)", () => {
  const html = renderBab2("s-facts");

  it("renders the workbench heading, pill, lead, label, and hint", () => {
    expect(html).toContain("Apa yang tidak boleh Nuave salah pahami?");
    expect(html).toContain("Opsional");
    expect(html).toContain(
      "Tambahkan satu fakta publik yang dapat memengaruhi hasil audit",
    );
    expect(html).toContain("Satu fakta yang wajib benar");
    expect(html).toContain(
      "Jangan masukkan data pribadi, informasi pembayaran, atau rahasia bisnis.",
    );
    expect(html).toContain("<textarea");
  });

  it("starts empty for F1 (skipped state) with no error association", () => {
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('role="alert"');
  });
});

describe("s-review readback (F1 rich)", () => {
  const html = renderBab2("s-review");

  it("renders the workbench heading, lead, and the ten row labels", () => {
    expect(html).toContain("Konfirmasi informasi brand Anda");
    expect(html).toContain(
      "Pastikan informasi ini sudah tepat sebelum Nuave menyusun pertanyaan audit.",
    );
    for (const label of [
      "Brand",
      "Fokus audit",
      "Target audit",
      "Kategori",
      "Produk dan layanan",
      "Alasan pelanggan",
      "Cara layanan",
      "Pasar",
      "Pembanding",
      "Hal yang wajib benar",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Nama lain dan sumber");
  });

  it("shows meaning-level F1 values, not engine dumps", () => {
    expect(html).toContain("Seluruh brand Kopi Sudut");
    expect(html).toContain("Kopi Sudut · kopisudut.id");
    expect(html).toContain("Kopi Susu Sudut");
    expect(html).toContain("Ngopi enak dekat kantor");
    expect(html).toContain("Di lokasi bisnis Anda");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Fore Coffee");
    expect(html).toContain("Tidak ditambahkan");
  });

  it("links every row via whole-row chevron buttons with valid targets", () => {
    const html = renderBab2("s-review");
    const targets = [...html.matchAll(/data-correction-target="([^"]+)"/g)].map(
      (match) => match[1],
    );
    // Direct render (no activeScreens): 10 rows including Target audit.
    expect(targets.length).toBe(10);
    for (const target of targets) {
      expect(INTAKE_SCREEN_ORDER).toContain(target);
    }
    expect(targets).toContain("s-brand");
    expect(targets).toContain("s-scope");
    expect(targets).toContain("s-category");
    expect(targets).toContain("s-offerings");
    expect(targets).toContain("s-customers");
    expect(targets).toContain("s-service");
    expect(targets).toContain("s-market");
    expect(targets).toContain("s-competitors");
    expect(targets).toContain("s-facts");
    // Chevron grammar: no visible Ubah links (handoff 2026-09-05).
    expect(html).not.toContain(">Ubah</button>");
    expect(html).toContain("›");
  });

  it("omits the Target audit row on whole-brand routes (activeScreens)", () => {
    const brandRoute = [
      "s-crawl",
      "s-brand",
      "s-scope",
      "s-category",
      "s-offerings",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
      "s-facts",
      "s-review",
      "s-questions",
    ] as const;
    const Slot = BAB2_SCREENS["s-review"];
    if (!Slot) throw new Error("missing s-review slot");
    const html = renderToStaticMarkup(
      createElement(Slot, {
        screenId: "s-review",
        fixture: F1,
        nav: stubNav,
        emit: noopEmit,
        activeScreens: brandRoute,
      }),
    );
    expect(html).not.toContain("Target audit");
    const targets = [...html.matchAll(/data-correction-target="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(targets.length).toBe(9);
  });

  it("adds the F3 advisory conflict row without blocking wording", () => {
    const conflict = renderBab2("s-review", F3);
    expect(conflict).toContain("Perbedaan sumber");
    expect(conflict).toContain("tidak menghalangi");
  });

  it("review market row always targets s-market (no skip fallback)", () => {
    const rows = deriveReviewRows({ marketSkipped: true });
    const market = rows.find((row) => row.key === "market");
    expect(market?.value).toBe("Belum dipilih");
    expect(market?.target).toBe("s-market");
  });

  it("empty fixture falls back per the workbench value list", () => {
    const rows = deriveReviewRows({});
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    expect(byKey.get("brand")).toBe("Belum dipilih");
    expect(byKey.get("scope")).toBe("Belum dipilih");
    expect(byKey.get("category")).toBe("Belum dipilih");
    expect(byKey.get("offerings")).toBe("Belum dikonfirmasi");
    expect(byKey.get("service")).toBe("Belum dipilih");
    expect(byKey.get("market")).toBe("Belum dipilih");
    expect(byKey.get("competitors")).toBe("Belum dikonfirmasi");
    expect(byKey.get("facts")).toBe("Tidak ditambahkan");
    // No aliases row exists anymore.
    expect(byKey.get("aliases")).toBeUndefined();
  });
});

describe("s-questions review (no generation connected)", () => {
  const html = renderBab2("s-questions");

  it("renders the deck heading, lead, and exact 6+4 group labels", () => {
    expect(html).toContain("Periksa pertanyaan audit");
    expect(html).toContain("akan diuji ke model AI");
    expect(html).toContain("Tanpa menyebut bisnis Anda");
    expect(html).toContain("6 pertanyaan");
    expect(html).toContain("Menyebut bisnis Anda");
    expect(html).toContain("4 pertanyaan");
  });

  it("renders all ten slot intents in final order", () => {
    for (const intent of [...UNBRANDED_INTENTS, ...BRANDED_INTENTS]) {
      expect(html).toContain(intent);
    }
    expect(deriveQuestionSlots(F1)).toHaveLength(10);
    expect(
      deriveQuestionSlots(F1).filter((slot) => slot.unbranded),
    ).toHaveLength(6);
  });

  it("offers per-question Ubah with Simpan pairing in the deck wording", () => {
    expect(html).toContain("Ubah pertanyaan 1");
    expect(html).toContain("Ubah pertanyaan 10");
  });

  it("source never mentions prompt generation or live calls", () => {
    const source = readFileSync(
      new URL("./screens-bab2.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /generate[A-Z]\w*Prompt|promptPack|fetch\(|XMLHttpRequest/g,
    );
    expect(source).not.toContain("intake_validation_failed");
  });
});

describe("pure helpers", () => {
  it("toggleId adds and removes symmetrically", () => {
    expect(toggleId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleId(["a", "b"], "b")).toEqual(["a"]);
  });

  it("market skip is retired: the helper is always false (handoff 2026-09-05)", () => {
    expect(isMarketSkippedFixture({ marketSkipped: true })).toBe(false);
    expect(isMarketSkippedFixture(F1)).toBe(false);
    expect(isMarketSkippedFixture({})).toBe(false);
  });

  it("detects thin competitor states", () => {
    expect(isThinCompetitorState(null)).toBe(true);
    expect(isThinCompetitorState(F1.screens["s-competitors"])).toBe(false);
    expect(isThinCompetitorState(F2.screens["s-competitors"])).toBe(true);
  });

  it("screens unbranded edits against brand + aliases, case-insensitively", () => {
    expect(
      isUnbrandedViolation("apakah Kopi Sudut enak?", ["kopi sudut"]),
    ).toBe(true);
    expect(
      isUnbrandedViolation("kedai kopi susu enak di Jakarta", ["kopi sudut"]),
    ).toBe(false);
    expect(isUnbrandedViolation("anything", [])).toBe(false);
  });

  it("flags sensitive facts text without blocking", () => {
    expect(containsSensitiveData("hubungi saya di owner@example.com")).toBe(
      true,
    );
    expect(containsSensitiveData("telp 0812-3456-7890")).toBe(true);
    expect(containsSensitiveData("kopi kami disangrai medium")).toBe(false);
  });

  it("resolves brand display and aliases from fixture data", () => {
    expect(resolveBrandName(F1)).toContain("Kopi Sudut");
    expect(resolveBrandName({})).toBe("brand Anda");
    expect(resolveAliases(F5)).toEqual([]);
  });
});

describe("Bab 2-3 house rules", () => {
  const all = (
    ["s-market", "s-competitors", "s-facts", "s-review", "s-questions"] as const
  )
    .map((id) => renderBab2(id))
    .join("\n");

  it("shows no provenance, confidence, or AI-decoration badges", () => {
    for (const banned of [
      "Terdeteksi",
      "Perkiraan",
      "Saran Nuave",
      "✨",
      "confidence",
    ]) {
      expect(all).not.toContain(banned);
    }
  });

  it("keeps every touch target at 44px+", () => {
    expect(all).toContain("44px");
  });
});

describe("shell pairing (transitions + terminal)", () => {
  it("pairs s-review with 'Buat pertanyaan audit' and s-questions with 'Mulai audit'", () => {
    expect(continueLabelFor("s-review")).toBe("Buat pertanyaan audit");
    expect(continueLabelFor("s-questions")).toBe("Mulai audit");
  });

  it("renders F1-rich Bab 2-3 screens inside the real shell frame", () => {
    function DispatchSlot(props: IntakeScreenSlotProps) {
      const Slot = BAB2_SCREENS[props.screenId] ?? null;
      if (!Slot) return null;
      return createElement(Slot, { ...props, fixture: F1 });
    }
    for (const [screenId, heading] of [
      ["s-market", "Di mana pelanggan Anda berada?"],
      [
        "s-competitors",
        "Bisnis apa yang menjadi alternatif bagi pelanggan Anda?",
      ],
      ["s-facts", "Apa yang tidak boleh Nuave salah pahami"],
      ["s-review", "Konfirmasi informasi brand Anda"],
      ["s-questions", "Periksa pertanyaan audit"],
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(IntakeJourney, {
          initialScreenId: screenId,
          ScreenSlot: DispatchSlot,
        }),
      );
      expect(html).toContain("data-new-intake-shell");
      expect(html).toContain(heading);
    }
    const questions = renderToStaticMarkup(
      createElement(IntakeJourney, {
        initialScreenId: "s-questions",
        ScreenSlot: DispatchSlot,
      }),
    );
    expect(questions).toContain("Mulai audit");
  });
});

describe("founder Gate 1 review fixes (2026-09-05): blocking gates", () => {
  /* #5/#6/#7: the shell Continue gate blocks until the screen publishes
   * validity; a blocked tap shows the inline workbench message. */

  it("market: sekitar seed clamps to a single selected area", () => {
    const html = renderBab2("s-market");
    // F1 seeds sekitar: exactly one of the three prepared areas is on.
    const onCount = (html.match(/aria-pressed="true"/g) ?? []).length;
    expect(onCount).toBe(1);
    expect(html).toContain("Jakarta Selatan");
  });

  it("market: area chips render as tappable options with checkmarks", () => {
    const html = renderBab2("s-market");
    // Options are selectable chips (aria-pressed), not just removable tags.
    expect(html).toContain('aria-label="Pilih Jakarta Selatan"');
    expect(html).toContain("✓");
  });

  it("competitors: error message renders after a blocked attempt", () => {
    const Slot = BAB2_SCREENS["s-competitors"];
    if (!Slot) throw new Error("missing s-competitors");
    const html = renderToStaticMarkup(
      createElement(Slot, {
        screenId: "s-competitors",
        fixture: {
          screens: { "s-competitors": { prepared: [], selected: [] } },
        },
        nav: stubNav,
        emit: noopEmit,
        invalidAttempts: 1,
      }),
    );
    expect(html).toContain("Pilih setidaknya satu bisnis, atau pilih");
  });

  it("competitors: F1 stays clean — no error before a blocked attempt", () => {
    const html = renderBab2("s-competitors");
    expect(html).not.toContain("Pilih setidaknya satu bisnis");
  });

  it("market: error message renders after a blocked attempt (empty areas)", () => {
    const Slot = BAB2_SCREENS["s-market"];
    if (!Slot) throw new Error("missing s-market");
    /* Sekitar reach with NO prepared areas and no seed → blocked attempt
     * shows the area error (workbench string). */
    const html = renderToStaticMarkup(
      createElement(Slot, {
        screenId: "s-market",
        fixture: {
          screens: {
            "s-market": {
              prepared: [
                {
                  id: "market-type-nearby",
                  label: "Sekitar satu area",
                  selected: false,
                },
              ],
              selected: [],
            },
          },
        },
        nav: stubNav,
        emit: noopEmit,
        invalidAttempts: 1,
      }),
    );
    expect(html).toContain("Pilih jangkauan utama untuk melanjutkan.");
  });

  it("market: area error shows when sekitar is picked but no area is", () => {
    const Slot = BAB2_SCREENS["s-market"];
    if (!Slot) throw new Error("missing s-market");
    /* Reach seeded to sekitar with no prepared/selected areas: the area
     * requirement error (workbench string) shows after a blocked attempt. */
    const html = renderToStaticMarkup(
      createElement(Slot, {
        screenId: "s-market",
        fixture: {
          screens: {
            "s-market": {
              prepared: [
                {
                  id: "market-type-nearby",
                  label: "Sekitar satu area",
                  selected: true,
                },
              ],
              selected: ["market-type-nearby"],
            },
          },
        },
        nav: stubNav,
        emit: noopEmit,
        invalidAttempts: 1,
      }),
    );
    expect(html).toContain("Pilih satu kota atau area.");
  });

  it("market: no error nags before the first attempt", () => {
    const html = renderBab2("s-market");
    expect(html).not.toContain("Pilih setidaknya satu kota atau area");
    expect(html).not.toContain("Pilih jangkauan utama untuk melanjutkan");
  });

  it("isMarketAnswerValid: reach required; area kinds need ≥1 area", () => {
    expect(isMarketAnswerValid(null, 0)).toBe(false);
    expect(isMarketAnswerValid("sekitar", 0)).toBe(false);
    expect(isMarketAnswerValid("beberapa", 0)).toBe(false);
    expect(isMarketAnswerValid("sekitar", 1)).toBe(true);
    expect(isMarketAnswerValid("beberapa", 2)).toBe(true);
    expect(isMarketAnswerValid("seluruh", 0)).toBe(true);
    expect(isMarketAnswerValid("luar", 0)).toBe(true);
  });
});
