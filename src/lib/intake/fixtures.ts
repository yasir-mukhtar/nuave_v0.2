/**
 * Skeleton fixture data for the new intake journey (plan Phase 4, data part).
 *
 * Six fixture sets (F1–F6) per `docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md` §1.
 * Display strings mirror the approved prototype's own mocked scenario data
 * (`intake-prototype.html` SCENARIOS.lengkap/tipis/keliru/manual,
 * COFFEE_CATS/COFFEE_CUST/COFFEE_COMPS) verbatim — that file is the
 * experience authority and its data is openly mocked prototype fiction, so
 * nothing here invents facts about a real business. Screens render these
 * labels verbatim; customer-language labels only, never internal vocabulary.
 * No answer text, contact/payment data, or real business facts appear here.
 *
 * Routing: every fixture's `path` ends at `s-review` with review-confirm
 * enabled (all blockers satisfied), and from every screen on the path
 * Kembali/Lanjut or a stated fallback reaches `s-review` — no dead end.
 * `s-crawl` and `s-brand-fix` are transition/correction overlays excluded
 * from the screen budget.
 */

import type { IntakeScreenId } from "./screens";
import { INTAKE_SCREEN_ORDER } from "./screens";

/** One prepared value shown on a screen. `on` = pre-selected by evidence. */
export type PreparedItem = {
  /** Stable id (e.g. "offering-kopi-susu-sudut"). */
  id: string;
  /** Customer-language display label, rendered verbatim by screens. */
  label: string;
  /** True when the item arrives pre-on (confirm mode); false = tap-to-add. */
  on: boolean;
  /** Optional second line (source handle/URL, row descriptor). */
  detail?: string;
};

/** Prepared-values-per-screen state for one screen in a fixture. */
export type FixtureScreenState = {
  prepared: PreparedItem[];
  /** Ids (subset of prepared ids, or custom-added ids) the owner confirms. */
  selected: string[];
  note?: string;
};

/** Pinned wave-2 fixture shape. */
export type IntakeFixture = {
  screens: Record<IntakeScreenId, FixtureScreenState>;
  entry: IntakeScreenId;
};

export type FixtureId = "F1" | "F2" | "F3" | "F4" | "F5" | "F6";

/** Source derivation + routable path metadata (not part of the pinned shape). */
export type FixtureMeta = {
  id: FixtureId;
  label: string;
  /** §0 source register pointer — what this fixture derives from. */
  source: string;
  /** Screen path; always terminates at s-review. */
  path: IntakeScreenId[];
};

function item(id: string, label: string, on: boolean): PreparedItem {
  return { id, label, on };
}

function itemDetail(
  id: string,
  label: string,
  detail: string,
  on: boolean,
): PreparedItem {
  return { id, label, on, detail };
}

function onIds(prepared: PreparedItem[]): string[] {
  return prepared.filter((p) => p.on).map((p) => p.id);
}

function empty(note: string): FixtureScreenState {
  return { prepared: [], selected: [], note: note };
}

function state(
  prepared: PreparedItem[],
  selected: string[],
  note?: string,
): FixtureScreenState {
  return { prepared, selected, note };
}

/** All 15 canonical ids must be present (empty-state rule: empty lists + note, never absent). */
function assertFullCoverage(
  screens: Record<IntakeScreenId, FixtureScreenState>,
): void {
  for (const id of INTAKE_SCREEN_ORDER) {
    if (!screens[id]) throw new Error(`fixture missing screen ${id}`);
  }
}

function buildFixture(
  entry: IntakeScreenId,
  screens: Record<IntakeScreenId, FixtureScreenState>,
): IntakeFixture {
  assertFullCoverage(screens);
  return { screens, entry };
}

const CRAWL_OK: FixtureScreenState = empty(
  "Preparation succeeded; auto-advances to the brand card.",
);
const BRAND_FIX_EMPTY: FixtureScreenState = state(
  [
    item("fix-name", "Kopi Sudut", false),
    itemDetail("fix-source", "kopisudut.id", "", false),
  ],
  [],
  "Prefill carries the current card; both fields editable; name required, source optional.",
);
const QUESTIONS_POST: FixtureScreenState = empty(
  "Post-intake (after review-confirm); outside the intake screen budget.",
);
const FACTS_EMPTY: FixtureScreenState = empty(
  "Optional screen, user-skipped (Lanjut with empty text). Never blocks; counts as shown.",
);

/* ------------------------------------------------------------------ */
/* Shared rich-path screen states (F1 data backbone, source S1)        */
/* ------------------------------------------------------------------ */

function brandCard(
  name: string,
  initials: string,
  source: string,
  description: string,
): FixtureScreenState {
  return state(
    [itemDetail("brand-card", name, source, true)],
    [],
    `${initials}::${description}`,
  );
}

function richBrand(): FixtureScreenState {
  return brandCard(
    "Kopi Sudut",
    "KS",
    "kopisudut.id",
    "Kedai kopi susu di Jakarta Selatan dengan langganan bulanan yang dikirim ke seluruh Indonesia.",
  );
}

function richScope(): FixtureScreenState {
  const options = [
    item("scope-whole-brand", "Seluruh brand Kopi Sudut", true),
    item("scope-branch", "Cabang tertentu (3 gerai)", false),
    item("scope-product", "Produk tertentu (3 produk)", false),
  ];
  return state(options, ["scope-whole-brand"], "Scope = whole brand.");
}

function richCategory(preselected: boolean): FixtureScreenState {
  const cats = [
    item("category-kedai-susu", "Kedai kopi susu (chain lokal)", true),
    item("category-specialty", "Coffee shop specialty", false),
    item("category-roaster", "Coffee roaster dan retail biji kopi", false),
  ];
  return state(
    cats,
    preselected ? [cats[0].id] : [],
    preselected
      ? "Strongest-supported suggestion preselected."
      : "Thin evidence: no preselection; owner must pick or type one (blocking).",
  );
}

function richOfferingsConfirm(): FixtureScreenState {
  const offerings = [
    "Kopi Susu Sudut",
    "Americano dan espresso",
    "Latte gula aren",
    "Non-kopi (matcha, cokelat)",
    "Croissant dan pastry",
    "Biji kopi kemasan 200g",
    "Langganan kopi bulanan",
  ].map((label, i) => item(`offering-${i + 1}`, label, true));
  return state(
    offerings,
    onIds(offerings),
    "Confirm mode: 7 detected chips pre-on; corrections ≤2 taps, zero free-typing.",
  );
}

const RICH_CUSTOMERS: Array<[string, boolean]> = [
  ["Ngopi enak dekat kantor", true],
  ["Tempat nugas atau kerja yang nyaman", true],
  ["Kopi harian yang rasanya konsisten", true],
  ["Harga masuk akal untuk diminum tiap hari", true],
  ["Beli biji kopi untuk diseduh di rumah", false],
  ["Pesan kopi untuk meeting atau acara", false],
  ["Cari kopi susu yang tidak terlalu manis", false],
];

function richCustomers(onCount: number, total: number): FixtureScreenState {
  const chips = RICH_CUSTOMERS.slice(0, total).map(([label, on], i) =>
    item(`customer-chip-${i + 1}`, label, i < onCount && on),
  );
  return state(
    chips,
    onIds(chips),
    `A3 multi-select: ${onCount} on / ${total - onCount} off as mocked. Optional, never blocks.`,
  );
}

/** s-service channels (fixed set, handoff 2026-09-05: multi-select, ≥1). */
const SERVICE_CHANNEL_ITEMS: PreparedItem[] = [
  item("service-location", "Di lokasi bisnis Anda", true),
  item("service-customer", "Di lokasi pelanggan", false),
  item("service-delivery", "Dikirim ke pelanggan", false),
  item("service-online", "Digunakan secara online", false),
];

function serviceState(selectedIds: string[]): FixtureScreenState {
  return state(
    SERVICE_CHANNEL_ITEMS,
    selectedIds,
    "A3 fixed multi-select: at least one channel required (blocking).",
  );
}

function richMarket(cityCount: number): FixtureScreenState {
  const cities = ["Jakarta Selatan", "Tangerang Selatan", "Bandung"]
    .slice(0, cityCount)
    .map((label, i) => item(`city-${i + 1}`, label, true));
  const reach: PreparedItem[] = [
    item("market-type-nearby", "Sekitar satu area", true),
    item("market-type-cities", "Beberapa area", false),
    item("market-type-national", "Seluruh Indonesia", false),
    item("market-type-abroad", "Indonesia dan luar negeri", false),
  ];
  const prepared = [...reach, ...cities];
  return state(
    prepared,
    onIds(prepared),
    `${cityCount} area chips preselected; reach preselected.`,
  );
}

function richCompetitors(count: number, generic: boolean): FixtureScreenState {
  const names = generic
    ? [
        "Kopi Janji Jiwa — chain kopi susu nasional",
        "Toko Kopi Tuku — kopi susu lokal Jabodetabek",
        "Kedai kopi sekitar — independen di area yang sama",
      ]
    : [
        "Fore Coffee — chain kopi nasional, 200+ gerai",
        "Kopi Janji Jiwa — chain kopi susu nasional",
        "Toko Kopi Tuku — kopi susu lokal Jakarta",
        "Starbucks — chain internasional, segmen harga berbeda",
      ];
  const rows = names
    .slice(0, count)
    .map((label, i) =>
      item(
        generic ? `competitor-generic-${i + 1}` : `competitor-${i + 1}`,
        label,
        true,
      ),
    );
  return state(
    rows,
    onIds(rows),
    generic
      ? "Thin lead: 'belum menemukan pembanding' + generic category rows."
      : "4 kept; removed rows stay as negative signal, never re-rendered.",
  );
}

const REVIEW_ROWS: PreparedItem[] = [
  item("row-brand", "Kopi Sudut · kopisudut.id", true),
  item(
    "row-scope",
    "Seluruh brand Kopi Sudut · Kedai kopi susu (chain lokal)",
    true,
  ),
  item("row-target", "Seluruh brand Kopi Sudut", true),
  item("row-category", "Kedai kopi susu lokal", true),
  item("row-offerings", "7 produk dan layanan terkonfirmasi", true),
  item("row-customers", "4 alasan pelanggan terkonfirmasi", true),
  item("row-service", "Di lokasi bisnis Anda", true),
  item(
    "row-market",
    "Sekitar satu area · Jakarta Selatan dan 2 area lain",
    true,
  ),
  item("row-competitors", "4 pembanding terkonfirmasi", true),
  item("row-facts", "Tidak ditambahkan", true),
];

function reviewState(note: string): FixtureScreenState {
  const rows = [...REVIEW_ROWS];
  return state(
    rows,
    rows.map((r) => r.id),
    note,
  );
}

function branchConditional(shown: boolean): FixtureScreenState {
  if (!shown)
    return empty(
      "Conditional: not shown for whole-brand scope (other branch of the XOR).",
    );
  const rows = [
    "Kopi Sudut Senopati — Jl. Senopati No. 43, Jakarta Selatan",
    "Kopi Sudut BSD — The Breeze, Tangerang Selatan",
    "Kopi Sudut Dago — Jl. Ir. H. Juanda 92, Bandung",
  ].map((label, i) => item(`branch-${i + 1}`, label, false));
  return state(
    rows,
    [],
    "Shown only when scope = branch; blocks until one row chosen.",
  );
}

function productConditional(shown: boolean): FixtureScreenState {
  if (!shown)
    return empty(
      "Conditional: not shown for whole-brand scope (other branch of the XOR).",
    );
  const rows = [
    "Langganan kopi bulanan — dikirim ke seluruh Indonesia",
    "Biji kopi kemasan 200g — dikirim ke seluruh Indonesia",
    "Kopi Susu Sudut — menu di gerai",
  ].map((label, i) => item(`product-${i + 1}`, label, false));
  return state(
    rows,
    [],
    "Shown only when scope = product; blocks until one row chosen.",
  );
}

/* ------------------------------------------------------------------ */
/* F1 — Rich case (source S1: SCENARIOS.lengkap, flow() happy path)     */
/* ------------------------------------------------------------------ */

const F1: IntakeFixture = buildFixture("s-crawl", {
  "s-crawl": CRAWL_OK,
  "s-brand": richBrand(),
  "s-brand-fix": BRAND_FIX_EMPTY,
  "s-scope": richScope(),
  "s-branch": branchConditional(false),
  "s-product": productConditional(false),
  "s-category": richCategory(true),
  "s-offerings": richOfferingsConfirm(),
  "s-customers": richCustomers(4, 7),
  "s-service": serviceState(["service-location"]),
  "s-market": richMarket(3),
  "s-competitors": richCompetitors(4, false),
  "s-facts": FACTS_EMPTY,
  "s-review": reviewState(
    "All blocks satisfied; 'Buat pertanyaan audit' enabled. 10 dynamic rows; no aliases row (handoff 2026-09-05).",
  ),
  "s-questions": QUESTIONS_POST,
});

/* ------------------------------------------------------------------ */
/* F2 — Messy thin source (source S2: SCENARIOS.tipis, offeringsAsk)    */
/* ------------------------------------------------------------------ */

const F2_OFFERINGS_ASK: FixtureScreenState = (() => {
  const detected = ["Kopi susu gula aren", "Americano"].map((label, i) =>
    item(`offering-${i + 1}`, label, true),
  );
  const suggested = [
    "Latte",
    "Non-kopi (cokelat, teh)",
    "Roti bakar dan camilan",
    "Biji kopi kemasan",
  ].map((label, i) => item(`offering-suggest-${i + 1}`, label, false));
  const prepared = [...detected, ...suggested];
  return state(
    prepared,
    onIds(prepared),
    "Ask mode: 2 detected on + 4 suggestions off; positive selection required, still non-blocking.",
  );
})();

const F2_CUSTOMERS: FixtureScreenState = (() => {
  const chips: Array<[string, boolean]> = [
    ["Ngopi santai dekat rumah", true],
    ["Kopi harian yang harganya masuk akal", true],
    ["Tempat nugas atau kerja yang nyaman", false],
    ["Cari kopi susu yang tidak terlalu manis", false],
    ["Pesan kopi untuk acara", false],
  ].map(([label, on]) => [label, on] as [string, boolean]);
  const prepared = chips.map(([label], i) =>
    item(`customer-chip-${i + 1}`, label, i < 2),
  );
  return state(
    prepared,
    onIds(prepared),
    "Thin source: 2 on / 3 off as mocked. Optional, never blocks.",
  );
})();

const F2_MARKET: FixtureScreenState = (() => {
  const reach: PreparedItem[] = [
    item("market-type-nearby", "Sekitar satu area", true),
    item("market-type-cities", "Beberapa area", false),
    item("market-type-national", "Seluruh Indonesia", false),
    item("market-type-abroad", "Indonesia dan luar negeri", false),
    item("city-1", "Bekasi", true),
  ];
  return state(
    reach,
    onIds(reach),
    "Single area chip carried from the quiet source.",
  );
})();

const F2: IntakeFixture = buildFixture("s-crawl", {
  "s-crawl": CRAWL_OK,
  "s-brand": brandCard(
    "Kopi Ruang Kecil",
    "RK",
    "@kopiruangkecil",
    "Kedai kopi kecil di Bekasi. Sumber hanya sedikit bercerita, jadi sebagian perkiraan menunggu koreksi Anda.",
  ),
  "s-brand-fix": BRAND_FIX_EMPTY,
  "s-scope": richScope(),
  "s-branch": branchConditional(false),
  "s-product": productConditional(false),
  "s-category": richCategory(true),
  "s-offerings": F2_OFFERINGS_ASK,
  "s-customers": F2_CUSTOMERS,
  "s-service": serviceState(["service-location"]),
  "s-market": F2_MARKET,
  "s-competitors": richCompetitors(3, true),
  "s-facts": FACTS_EMPTY,
  "s-review": reviewState(
    "Ask-mode selections satisfy validate(); offerings row reflects tapped suggestions.",
  ),
  "s-questions": QUESTIONS_POST,
});

/* ------------------------------------------------------------------ */
/* F3 — Messy source conflict (sources S3 + S1: F1 data + warning pair) */
/* ------------------------------------------------------------------ */

const F3: IntakeFixture = buildFixture("s-crawl", {
  ...F1.screens,
  "s-review": state(
    [
      ...REVIEW_ROWS.map((r) => ({ ...r })),
      item(
        "row-conflict",
        "Sumber berbeda soal jam buka — versi situs vs Instagram",
        true,
      ),
    ],
    [
      "row-brand",
      "row-scope",
      "row-target",
      "row-category",
      "row-offerings",
      "row-customers",
      "row-service",
      "row-market",
      "row-competitors",
      "row-facts",
      "row-conflict",
    ],
    "Advisory conflict row with chevron to the owning screen; never blocking. Provenance backend-only.",
  ),
});

/* ------------------------------------------------------------------ */
/* F4 — Wrong / ambiguous identity (source S4: SCENARIOS.keliru + fix)  */
/* ------------------------------------------------------------------ */

const F4: IntakeFixture = buildFixture("s-brand", {
  ...F1.screens,
  "s-brand": brandCard(
    "Kopi Sudut Pandang",
    "KP",
    "kopisudutpandang.com",
    "Kedai kopi dan ruang baca di Yogyakarta.",
  ),
  "s-brand-fix": state(
    [
      item("fix-name", "Kopi Sudut", false),
      itemDetail("fix-source", "kopisudut.id", "", false),
    ],
    [],
    "Corrected card data; 'Periksa lagi' re-reads via s-crawl and resolves to the rich card.",
  ),
  "s-crawl": empty(
    "Re-read after brand fix; resolves the corrected source, then returns to the refreshed card.",
  ),
});

/* ------------------------------------------------------------------ */
/* F5 — Manual fallback, no readable source (source S5: SCENARIOS.manual) */
/* ------------------------------------------------------------------ */

const F5_OFFERINGS_SUGGESTED: FixtureScreenState = (() => {
  const suggested = [
    "Kopi susu",
    "Americano dan espresso",
    "Latte",
    "Non-kopi (cokelat, teh)",
    "Camilan",
    "Biji kopi kemasan",
  ].map((label, i) => item(`offering-suggest-${i + 1}`, label, false));
  return state(
    suggested,
    [],
    "Ask mode, all six suggested-only; owner taps to add or types custom items.",
  );
})();

const F5: IntakeFixture = buildFixture("s-scope", {
  "s-crawl": empty("Manual path never enters s-crawl."),
  "s-brand": empty(
    "Manual path skips s-brand; entered via manual name + optional city.",
  ),
  "s-brand-fix": BRAND_FIX_EMPTY,
  "s-scope": state(
    [
      item("scope-whole-brand", "Seluruh brand", false),
      item("scope-product", "Produk tertentu", false),
    ],
    [],
    "No branch option (nothing extracted). Blocks until one scope chosen.",
  ),
  "s-branch": empty(
    "No branch rows extracted; add-line only if scope = branch.",
  ),
  "s-product": empty(
    "No product rows extracted; add-line only if scope = product.",
  ),
  "s-category": richCategory(false),
  "s-offerings": F5_OFFERINGS_SUGGESTED,
  "s-customers": richCustomers(0, 7),
  "s-service": serviceState(["service-location"]),
  "s-market": state(
    [
      item("market-type-nearby", "Sekitar satu area", true),
      item("market-type-cities", "Beberapa area", false),
      item("market-type-national", "Seluruh Indonesia", false),
      item("market-type-abroad", "Indonesia dan luar negeri", false),
      item("city-manual", "Jakarta", true),
    ],
    ["market-type-nearby", "city-manual"],
    "Single area chip carried from the manual entry city.",
  ),
  "s-competitors": richCompetitors(3, true),
  "s-facts": FACTS_EMPTY,
  "s-review": state(
    [...REVIEW_ROWS.map((r) => ({ ...r }))],
    [
      "row-brand",
      "row-scope",
      "row-target",
      "row-category",
      "row-offerings",
      "row-customers",
      "row-service",
      "row-market",
      "row-competitors",
      "row-facts",
    ],
    "10 dynamic rows; no aliases row (handoff 2026-09-05). Category (blocking) satisfied by explicit choice.",
  ),
  "s-questions": QUESTIONS_POST,
});

/* ------------------------------------------------------------------ */
/* F6 — Preparation failure (source S6: extract retry ceiling = 2)      */
/* ------------------------------------------------------------------ */

/** Preparation retry ceiling: one initial attempt + one retry, never a third. */
export const PREPARATION_RETRY_CEILING = 2;

const F6: IntakeFixture = buildFixture("s-crawl", {
  ...F5.screens,
  "s-crawl": empty(
    "Attempt 1 fails -> inline notice with 'Coba lagi' (attempt 2, last) + 'Isi manual'. " +
      "Attempt 2 failing auto-routes to the F5 manual path with a notice; no third retry. " +
      "Two forward exits at every failure state; retry-success would enter at s-brand (F1/F2 path).",
  ),
});

export const INTAKE_FIXTURES: Record<FixtureId, IntakeFixture> = {
  F1,
  F2,
  F3,
  F4,
  F5,
  F6,
};

export const FIXTURE_META: Record<FixtureId, FixtureMeta> = {
  F1: {
    id: "F1",
    label: "Rich case",
    source:
      "S1 intake-prototype.html SCENARIOS.lengkap + flow(): brand card, 3 branches, 3 products, 3 categories, 7 offerings, 7 customer chips (4 on/3 off), 4 competitors, 3 cities.",
    path: [
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
    ],
  },
  F2: {
    id: "F2",
    label: "Messy thin source (ask mode)",
    source:
      "S2 intake-prototype.html SCENARIOS.tipis: thinNote on s-brand, offeringsAsk (2 detected + 4 suggestions), 5 customer chips, generic competitors.",
    path: [
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
    ],
  },
  F3: {
    id: "F3",
    label: "Messy source conflict (advisory)",
    source:
      "S3 docs/drafts/00-journey-fixtures.md warnings + provenance enum + S1 F1 data: source_conflict warning pair carried into review as one advisory row.",
    path: [
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
    ],
  },
  F4: {
    id: "F4",
    label: "Wrong / ambiguous identity",
    source:
      "S4 intake-prototype.html SCENARIOS.keliru + applyBrandFix(): wrong brand card first, s-brand-fix re-read resolving to rich data.",
    path: [
      "s-brand",
      "s-brand-fix",
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
    ],
  },
  F5: {
    id: "F5",
    label: "Manual fallback (no readable source)",
    source:
      "S5 intake-prototype.html SCENARIOS.manual + enterIntake(): name + optional city, entry at s-scope, catSel null, offerings suggested-only.",
    path: [
      "s-scope",
      "s-category",
      "s-offerings",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
      "s-facts",
      "s-review",
    ],
  },
  F6: {
    id: "F6",
    label: "Preparation failure with retry ceiling",
    source:
      "S6 src/lib/audit/telemetry.ts extract:2 ceiling + forced-failure spec: one retry then manual fallback; failure states always offer retry + manual, never a dead end.",
    path: [
      "s-crawl",
      "s-scope",
      "s-category",
      "s-offerings",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
      "s-facts",
      "s-review",
    ],
  },
};

/**
 * True when every screen on the fixture path exists in the fixture, the path
 * terminates at s-review, and every visited screen carries a forward route
 * (next path entry or, for s-review, review-confirm). No dead end by construction.
 */
export function fixturePathReachesReview(id: FixtureId): boolean {
  const fixture = INTAKE_FIXTURES[id];
  const { path } = FIXTURE_META[id];
  if (path[path.length - 1] !== "s-review") return false;
  if (fixture.entry !== path[0]) return false;
  return path.every((screenId) => fixture.screens[screenId] !== undefined);
}
