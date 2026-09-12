import { parseSourceInput } from "../audit/source-input";
import {
  INTAKE_FIXTURES,
  type FixtureScreenState,
  type IntakeFixture,
  type PreparedItem,
} from "./fixtures";
import {
  createIntakeState,
  type IntakeState,
  type MultiSelectAnswer,
} from "./state";
import type { IntakeScreenId } from "./screens";

/** Local-only examples from the approved prototype. No retrieval or provider call. */
const LOCATIONS = [
  "Kopi Sudut Senopati — Jl. Senopati No. 43, Jakarta Selatan",
  "Kopi Sudut BSD — The Breeze, Tangerang Selatan",
  "Kopi Sudut Dago — Jl. Ir. H. Juanda 92, Bandung",
];
const PRODUCTS = [
  "Langganan kopi bulanan — dikirim ke seluruh Indonesia",
  "Biji kopi kemasan 200g — dikirim ke seluruh Indonesia",
  "Kopi Susu Sudut — menu di gerai",
];
const EMPTY: FixtureScreenState = { prepared: [], selected: [] };
const CONTEXT_SCREENS = [
  "s-category",
  "s-offerings",
  "s-customers",
  "s-service",
  "s-market",
  "s-competitors",
] as const;

function options(
  labels: string[],
  prefix: string,
  selected = false,
): FixtureScreenState {
  const prepared = labels.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    label,
    on: selected,
  }));
  return {
    prepared,
    selected: selected ? prepared.map((item) => item.id) : [],
  };
}

function isKnownRichBrand(base: IntakeFixture): boolean {
  const brand = base.screens["s-brand"].prepared[0];
  return (
    brand?.label === "Kopi Sudut" &&
    parseSourceInput(brand.detail ?? "")?.normalizedUrl ===
      "https://kopisudut.id/"
  );
}

function withoutContext(base: IntakeFixture): IntakeFixture {
  const result = structuredClone(base);
  for (const id of CONTEXT_SCREENS) result.screens[id] = structuredClone(EMPTY);
  result.screens["s-service"] = {
    ...structuredClone(base.screens["s-service"]),
    selected: [],
  };
  result.screens["s-market"] = {
    prepared: base.screens["s-market"].prepared
      .filter((item) => item.id.startsWith("market-type-"))
      .map((item) => ({ ...item, on: false })),
    selected: [],
  };
  return result;
}

function selectedLabel(state: IntakeState, fixture: IntakeFixture): string {
  if (state.category.selectedId === "category-custom-1")
    return state.category.customLabel ?? "";
  return (
    fixture.screens["s-category"].prepared.find(
      (item) => item.id === state.category.selectedId,
    )?.label ?? ""
  );
}

function pick(
  screen: FixtureScreenState,
  indexes: number[],
): FixtureScreenState {
  const prepared = indexes
    .map((index) => screen.prepared[index])
    .filter((item): item is PreparedItem => Boolean(item))
    .map((item) => ({ ...item }));
  return {
    prepared,
    selected: prepared
      .filter((item) => screen.selected.includes(item.id))
      .map((item) => item.id),
  };
}

/** Derive candidates from the actual chosen entity; unknown targets get manual fallbacks. */
export function deriveContextFixture(
  base: IntakeFixture,
  state: IntakeState,
): IntakeFixture {
  let result = structuredClone(base);
  const rich = isKnownRichBrand(base);
  if (rich) {
    result.screens["s-branch"] = options(LOCATIONS, "branch");
    result.screens["s-product"] = options(PRODUCTS, "product");
  }
  result.screens["s-scope"] = {
    prepared: [
      { id: "scope-whole-brand", label: "Brand secara keseluruhan", on: false },
      { id: "scope-branch", label: "Satu lokasi", on: false },
      { id: "scope-product", label: "Satu produk atau layanan", on: false },
    ],
    selected: [],
  };
  if (state.scope !== "brand") {
    const answer = state.scope === "cabang" ? state.branch : state.product;
    const targetId = answer.selectedId;
    const targetIndex = Number(targetId?.split("-").at(-1)) - 1;
    const knownTarget =
      rich &&
      targetId ===
        `${state.scope === "cabang" ? "branch" : "product"}-${targetIndex + 1}` &&
      targetIndex >= 0 &&
      targetIndex < 3 &&
      !answer.custom.some((item) => item.id === targetId);
    if (!knownTarget) {
      result = withoutContext(result);
    } else if (state.scope === "cabang") {
      result.screens["s-offerings"] = pick(
        base.screens["s-offerings"],
        [
          [0, 1, 2, 3, 4],
          [0, 1, 3],
          [0, 1, 4, 5],
        ][targetIndex],
      );
      result.screens["s-customers"] = pick(
        base.screens["s-customers"],
        [
          [0, 1, 2, 3],
          [0, 2, 3, 6],
          [1, 2, 4],
        ][targetIndex],
      );
      result.screens["s-market"] = {
        prepared: [
          ...base.screens["s-market"].prepared.filter((item) =>
            item.id.startsWith("market-type-"),
          ),
          {
            id: `city-branch-${targetIndex + 1}`,
            label: ["Jakarta Selatan", "Tangerang Selatan", "Bandung"][
              targetIndex
            ],
            on: true,
          },
        ],
        selected: ["market-type-nearby", `city-branch-${targetIndex + 1}`],
      };
      result.screens["s-service"].selected = ["service-location"];
      result.screens["s-competitors"] = pick(
        base.screens["s-competitors"],
        [
          [0, 1, 2],
          [0, 1],
          [1, 3],
        ][targetIndex],
      );
    } else {
      result.screens["s-category"] = options(
        [
          ["Langganan kopi bulanan"],
          ["Biji kopi kemasan", "Coffee roaster dan retail biji kopi"],
          ["Minuman kopi susu", "Kopi siap minum"],
        ][targetIndex],
        `category-product-${targetIndex + 1}`,
        true,
      );
      result.screens["s-category"].selected = result.screens[
        "s-category"
      ].selected.slice(0, 1);
      result.screens["s-customers"] = pick(
        base.screens["s-customers"],
        [[2, 3, 5], [4], [0, 2, 3, 6]][targetIndex],
      );
      result.screens["s-service"].selected = [
        targetIndex === 2 ? "service-location" : "service-delivery",
      ];
      result.screens["s-market"] =
        targetIndex === 2
          ? pick(base.screens["s-market"], [0, 1, 2, 3, 4])
          : {
              prepared: base.screens["s-market"].prepared
                .filter((item) => item.id.startsWith("market-type-"))
                .map((item) => ({
                  ...item,
                  on: item.id === "market-type-national",
                })),
              selected: ["market-type-national"],
            };
      result.screens["s-competitors"] = pick(
        base.screens["s-competitors"],
        [
          [0, 1],
          [2, 3],
          [1, 2],
        ][targetIndex],
      );
    }
  }

  const category = selectedLabel(state, result).toLocaleLowerCase("id-ID");
  if (category && state.category.selectedId === "category-custom-1") {
    // A typed category is buyer meaning, not proof of a coffee catalogue.
    result.screens["s-offerings"] = structuredClone(EMPTY);
    result.screens["s-customers"] = structuredClone(EMPTY);
    result.screens["s-competitors"] = structuredClone(EMPTY);
  } else if (category.includes("roaster") || category.includes("biji kopi")) {
    result.screens["s-offerings"] = {
      prepared: result.screens["s-offerings"].prepared.filter((item) =>
        /biji kopi/i.test(item.label),
      ),
      selected: result.screens["s-offerings"].selected.filter((id) =>
        result.screens["s-offerings"].prepared.some(
          (item) => item.id === id && /biji kopi/i.test(item.label),
        ),
      ),
    };
    result.screens["s-customers"] = pick(base.screens["s-customers"], [4]);
    result.screens["s-competitors"] = pick(
      result.screens["s-competitors"],
      [0],
    );
  } else if (category.includes("specialty")) {
    result.screens["s-offerings"] = pick(result.screens["s-offerings"], [1, 5]);
    result.screens["s-customers"] = pick(base.screens["s-customers"], [1, 4]);
    result.screens["s-competitors"] = pick(
      result.screens["s-competitors"],
      [0, 3],
    );
  }
  if (state.scope === "produk")
    result.screens["s-offerings"] = structuredClone(EMPTY);
  result.screens["s-competitors"].prepared = result.screens[
    "s-competitors"
  ].prepared.map((item) => {
    const [label, ...description] = item.label.split(" — ");
    return {
      ...item,
      label,
      ...(description.length ? { detail: description.join(" — ") } : {}),
    };
  });
  return result;
}

function keepCustom(
  previous: MultiSelectAnswer,
  seed: MultiSelectAnswer,
): MultiSelectAnswer {
  const custom = previous.custom.filter((item) => item.label.trim());
  return {
    onIds: [
      ...seed.onIds,
      ...previous.onIds.filter((id) => custom.some((item) => item.id === id)),
    ],
    custom,
  };
}

export type CommitReconciliation = {
  state: IntakeState;
  reconfirm: IntakeScreenId[];
};

/** Applies dependency changes once, when the owner commits; never during a click. */
export function reconcileOnCommit(
  previous: IntakeState,
  next: IntakeState,
  base: IntakeFixture,
  owner: IntakeScreenId,
): CommitReconciliation {
  const state = structuredClone(next);
  const reconfirm = new Set<IntakeScreenId>();
  const changed = (key: keyof IntakeState) =>
    JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
  const identityChanged = changed("brandCorrected");
  const scopeChanged = previous.scope !== next.scope;
  const targetChanged =
    (owner === "s-branch" && changed("branch")) ||
    (owner === "s-product" && changed("product"));
  if (scopeChanged || identityChanged) {
    state.branch = { selectedId: null, custom: [] };
    state.product = { selectedId: null, custom: [] };
  }
  if (state.scope !== "cabang") state.branch = { selectedId: null, custom: [] };
  if (state.scope !== "produk")
    state.product = { selectedId: null, custom: [] };
  if (identityChanged || scopeChanged || targetChanged)
    state.category = { selectedId: null, customLabel: null };
  const seeds = createIntakeState(deriveContextFixture(base, state));
  if (identityChanged || scopeChanged || targetChanged) {
    state.category = seeds.category;
    state.offerings = seeds.offerings;
    state.customers = seeds.customers;
    state.service = seeds.service;
    state.market = seeds.market;
    state.competitors = seeds.competitors;
    if (!identityChanged) {
      // Keep buyer additions available, but unselected, until their owner
      // reconfirms whether they still apply to the new scope or target.
      state.category.customLabel = next.category.customLabel;
      state.offerings.custom = structuredClone(next.offerings.custom);
      state.customers.custom = structuredClone(next.customers.custom);
    }
    for (const id of CONTEXT_SCREENS) reconfirm.add(id);
    if (scopeChanged || identityChanged) {
      if (state.scope === "cabang") reconfirm.add("s-branch");
      if (state.scope === "produk") reconfirm.add("s-product");
    }
    if (identityChanged) {
      state.scopeOptionId = null;
      state.scopeCommitted = false;
      reconfirm.add("s-scope");
      state.facts = { text: "" };
    } else if (state.facts.text.trim()) reconfirm.add("s-facts");
  } else if (owner === "s-category" && changed("category")) {
    state.offerings = keepCustom(state.offerings, seeds.offerings);
    state.customers = keepCustom(state.customers, seeds.customers);
    state.competitors = {
      ...seeds.competitors,
      custom: state.competitors.custom,
      noDirect: false,
    };
    for (const id of ["s-offerings", "s-customers", "s-competitors"] as const)
      reconfirm.add(id);
  } else if (
    owner === "s-service" &&
    changed("service") &&
    state.service.onIds.length === 1 &&
    state.service.onIds[0] === "service-location" &&
    (state.market.kind === "seluruh" || state.market.kind === "luar")
  ) {
    state.market = { kind: null, areaIds: [], customAreas: [] };
    reconfirm.add("s-market");
    reconfirm.add("s-competitors");
  } else if (owner === "s-market" && changed("market")) {
    reconfirm.add("s-competitors");
  }
  if (state.scope === "produk") {
    state.offerings = { onIds: [], custom: [] };
    reconfirm.delete("s-offerings");
  }
  if (state.market.kind === "seluruh" || state.market.kind === "luar") {
    state.market.areaIds = [];
    state.market.customAreas = [];
  }
  if (state.competitors.noDirect) {
    state.competitors.keptIds = [];
    state.competitors.custom = [];
  }
  const route: IntakeScreenId[] = [
    "s-scope",
    "s-branch",
    "s-product",
    "s-category",
    "s-offerings",
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
  ];
  return {
    state,
    reconfirm: route.filter((id) => id !== owner && reconfirm.has(id)),
  };
}

/** Validates an identity for the local adapter. Success makes no website-reading claim. */
export function prepareLocalIdentity(
  base: IntakeFixture,
  name: string,
  source: string,
): IntakeFixture {
  const trimmedName = name.trim();
  const parsed = parseSourceInput(source);
  if (!trimmedName) throw new Error("Masukkan nama brand.");
  if (!parsed)
    throw new Error("Masukkan situs web resmi atau akun Instagram yang valid.");
  const known = Object.values(INTAKE_FIXTURES).find((fixture) => {
    const card = fixture.screens["s-brand"].prepared[0];
    return (
      card?.label.toLocaleLowerCase("id-ID") ===
        trimmedName.toLocaleLowerCase("id-ID") &&
      parseSourceInput(card.detail ?? "")?.normalizedUrl ===
        parsed.normalizedUrl
    );
  });
  const result = known ? structuredClone(known) : withoutContext(base);
  if (!known) {
    result.screens["s-branch"] = structuredClone(EMPTY);
    result.screens["s-product"] = structuredClone(EMPTY);
    result.screens["s-review"] = structuredClone(EMPTY);
  }
  result.entry = "s-crawl";
  result.screens["s-crawl"] = structuredClone(EMPTY);
  result.screens["s-brand"] = {
    prepared: [
      {
        id: "brand-card",
        label: trimmedName,
        detail: parsed.normalizedUrl,
        on: true,
      },
    ],
    selected: [],
    note:
      known?.screens["s-brand"].note ??
      `${trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()}::Informasi awal dari nama dan sumber yang Anda masukkan.`,
  };
  result.screens["s-brand-fix"] = {
    prepared: [
      { id: "fix-name", label: trimmedName, on: false },
      { id: "fix-source", label: parsed.normalizedUrl, on: false },
    ],
    selected: [],
  };
  return result;
}
