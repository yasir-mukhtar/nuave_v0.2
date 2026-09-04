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

  it("renders the deck heading, lead, and four market cards", () => {
    expect(html).toContain("Di mana pelanggan Anda berada?");
    expect(html).toContain(
      "Ditanyakan karena lokasi memengaruhi rekomendasi untuk bisnis Anda.",
    );
    for (const card of [
      "Sekitar lokasi tertentu",
      "Beberapa kota",
      "Seluruh Indonesia",
      "Juga di luar negeri",
    ]) {
      expect(html).toContain(card);
    }
  });

  it("reveals the city panel for the prepared nearby type with 3 city chips", () => {
    expect(html).toContain("Kota atau area mana?");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Tangerang Selatan");
    expect(html).toContain("Tambah kota atau area");
    expect(html).toContain("Pelanggan harus datang ke lokasi Anda?");
    expect(html).toContain("Ya, bisnis kami lokal");
    expect(html).toContain("Tidak, kami juga melayani online");
  });

  it("uses radiogroup grammar with 44px targets and reduced-motion CSS", () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain("44px");
    expect(html).toContain("prefers-reduced-motion");
  });

  it("renders the shipped-product skip state instead of choices", () => {
    const skipped = renderBab2("s-market", { marketSkipped: true });
    expect(skipped).toContain("Di mana pelanggan Anda berada?");
    expect(skipped).not.toContain("Beberapa kota");
    expect(skipped).toContain("dilewati");
  });

  it("empty fixture degrades to cards + add-line, never a dead end", () => {
    const empty = renderBab2("s-market", {});
    expect(empty).toContain("Sekitar lokasi tertentu");
    expect(empty).not.toContain("Kota atau area mana?");
  });
});

describe("s-competitors (F1 rich)", () => {
  const html = renderBab2("s-competitors");

  it("renders the deck heading with the rich lead", () => {
    expect(html).toContain("Ini yang mungkin dibandingkan dengan Anda");
    expect(html).toContain("Hapus yang tidak relevan, tambah yang kurang.");
    expect(html).not.toContain("belum menemukan pembanding");
  });

  it("renders 4 prepared rows with Hapus, add-line, and the toggle", () => {
    expect(html).toContain("Fore Coffee");
    expect(html).toContain("Starbucks");
    expect(html).toContain("Hapus");
    expect(html).toContain("Tambah pembanding");
    expect(html).toContain("Tidak ada pesaing langsung yang saya tahu");
    expect(html).toContain('role="checkbox"');
  });

  it("thin fixture switches to the thin lead", () => {
    const thin = renderBab2("s-competitors", F2);
    expect(thin).toContain("belum menemukan pembanding");
  });

  it("manual empty state still routes forward via add-line + toggle", () => {
    const empty = renderBab2("s-competitors", { screens: {} });
    expect(empty).toContain("Tambah pembanding");
    expect(empty).toContain("Tidak ada pesaing langsung yang saya tahu");
  });
});

describe("s-facts (optional, never blocks)", () => {
  const html = renderBab2("s-facts");

  it("renders the deck heading, pill, lead, placeholder, and hint", () => {
    expect(html).toContain(
      "Apa yang tidak boleh salah dipahami tentang brand Anda?",
    );
    expect(html).toContain("Opsional");
    expect(html).toContain(
      "Satu hal yang, kalau AI salah paham, akan membuat seluruh audit meleset.",
    );
    expect(html).toContain("Misalnya: keunggulan yang sering terlewat");
    expect(html).toContain("Boleh dikosongkan.");
    expect(html).toContain("<textarea");
  });

  it("starts empty for F1 (skipped state) with no error association", () => {
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('role="alert"');
  });
});

describe("s-review readback (F1 rich)", () => {
  const html = renderBab2("s-review");

  it("renders the deck heading, lead, and all seven row labels", () => {
    expect(html).toContain("Ini yang akan Nuave audit");
    expect(html).toContain("Periksa sekali lagi. Semua bisa diubah.");
    for (const label of [
      "Yang diaudit",
      "Produk dan layanan",
      "Kenapa pelanggan mencari",
      "Pasar",
      "Pembanding",
      "Hal yang wajib benar",
      "Nama lain dan sumber",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("shows meaning-level F1 values, not engine dumps", () => {
    expect(html).toContain("Seluruh brand Kopi Sudut");
    expect(html).toContain("Kopi Susu Sudut");
    expect(html).toContain("Ngopi enak dekat kantor");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Ya, bisnis kami lokal");
    expect(html).toContain("Fore Coffee");
    expect(html).toContain("Tidak diisi");
  });

  it("links every meaning row back via nav with valid correction targets", () => {
    const targets = [...html.matchAll(/data-correction-target="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(targets.length).toBeGreaterThanOrEqual(6);
    for (const target of targets) {
      expect(INTAKE_SCREEN_ORDER).toContain(target);
    }
    expect(targets).toContain("s-scope");
    expect(targets).toContain("s-offerings");
    expect(targets).toContain("s-customers");
    expect(targets).toContain("s-market");
    expect(targets).toContain("s-competitors");
    expect(targets).toContain("s-facts");
    expect(html).toContain("Ubah");
  });

  it("adds the F3 advisory conflict row without blocking wording", () => {
    const conflict = renderBab2("s-review", F3);
    expect(conflict).toContain("Perbedaan sumber");
    expect(conflict).toContain("tidak menghalangi");
  });

  it("market-skipped review points Pasar at the skip fallback", () => {
    const rows = deriveReviewRows({ marketSkipped: true });
    const market = rows.find((row) => row.key === "market");
    expect(market?.value).toContain("Tidak relevan untuk audit ini");
    expect(market?.target).toBe("s-competitors");
  });

  it("empty fixture falls back per the deck value list", () => {
    const rows = deriveReviewRows({});
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    expect(byKey.get("scope")).toBe("Belum diisi");
    expect(byKey.get("offerings")).toBe("Belum diisi");
    expect(byKey.get("market")).toBe("Belum diisi");
    expect(byKey.get("facts")).toBe("Tidak diisi");
    expect(byKey.get("aliases")).toBe("Tidak ada");
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

  it("detects the shipped-product market skip without defaulting", () => {
    expect(isMarketSkippedFixture({ marketSkipped: true })).toBe(true);
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
      ["s-competitors", "Ini yang mungkin dibandingkan dengan Anda"],
      ["s-facts", "Apa yang tidak boleh salah dipahami"],
      ["s-review", "Ini yang akan Nuave audit"],
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
