"use client";

import { useEffect, useState } from "react";
import {
  IconMapPin,
  IconMapPins,
  IconMap,
  IconWorld,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { Chip } from "@/components/product/selection/Chip";
import { AddLine } from "@/components/product/selection/AddLine";
import { Reveal } from "@/components/product/selection/Reveal";
import type { FixtureScreenState } from "./fixtures";
import type { IntakeScreenSlot, IntakeScreenSlotProps } from "./navigation";
import { INTAKE_SCREEN_ORDER, type IntakeScreenId } from "./screens";
import {
  addCompetitor,
  addMarketArea,
  deriveReviewRowsFromState,
  isReviewApprovable,
  isScreenAnswerValid,
  marketKindFromId,
  removeCompetitor,
  removeMarketArea,
  setCompetitorsNoDirect,
  setFactsText,
  setMarketKind,
  toggleCompetitor,
  toggleMarketArea,
  useIntakeAnswers,
  type MarketKind,
  type ReviewRow,
} from "./state";
import styles from "./controls.module.css";

export { isMarketAnswerValid } from "./state";
export type { ReviewRow } from "./state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFixtureScreen(
  fixture: unknown,
  screenId: IntakeScreenId,
): FixtureScreenState | null {
  if (!isRecord(fixture)) return null;
  const screens = fixture["screens"];
  if (!isRecord(screens)) return null;
  const state = screens[screenId];
  if (!isRecord(state)) return null;
  const prepared = Array.isArray(state["prepared"])
    ? (state["prepared"] as FixtureScreenState["prepared"])
    : [];
  const selected = Array.isArray(state["selected"])
    ? (state["selected"] as string[]).filter((id) => typeof id === "string")
    : [];
  const note = typeof state["note"] === "string" ? state["note"] : undefined;
  return { prepared, selected, note };
}

/** Labels of prepared items currently selected (meaning-level readback). */
function selectedLabels(state: FixtureScreenState | null): string[] {
  if (!state) return [];
  const byId = new Map(state.prepared.map((item) => [item.id, item.label]));
  return state.selected
    .map((id) => byId.get(id))
    .filter((label): label is string => typeof label === "string");
}

/* ── Pure state helpers (unit-tested; no rendering) ── */

export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((entry) => entry !== id)
    : [...list, id];
}

/** Journey-level market skip removed (handoff 2026-09-05): s-market is
 *  always shown. Retained only as a deprecated no-op alias so the journey
 *  contract's older sections read clearly; always false. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isMarketSkippedFixture(_fixture: unknown): boolean {
  return false;
}

/** Thin/manual competitor lead when prepared rows are generic or absent.
 * Generic rows carry structural `competitor-generic-*` ids; detection never
 * sniffs display labels, so customer-language labels stay render-safe. */
export function isThinCompetitorState(
  state: FixtureScreenState | null,
): boolean {
  if (!state || state.prepared.length === 0) return true;
  return state.prepared.some((item) => /^competitor-generic/i.test(item.id));
}

/** Substring guard for unbranded question edits (screening strength is the
 *  engine's job per §8.12; the screen refuses plain identity leaks). */
export function isUnbrandedViolation(
  text: string,
  identities: readonly string[],
): boolean {
  const haystack = text.toLowerCase();
  return identities
    .map((identity) => identity.trim().toLowerCase())
    .filter((identity) => identity.length > 1)
    .some((identity) => haystack.includes(identity));
}

/** Client-side sensitive-data stop for s-facts (AGENTS.md rule 12).
 *  Never blocks navigation; the mapper must drop flagged text. */
export function containsSensitiveData(text: string): boolean {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return true;
  if (/(?:\+?62|0)[\d\s\-().]{8,}/.test(text)) return true;
  if (/\b\d{16}\b/.test(text)) return true;
  if (/\b(nik|ktp|no\.?\s*(rekening|ktp)|cvv|cvv2|pin\s*atm)\b/i.test(text))
    return true;
  return false;
}

/* ── Brand + alias resolution (data, never copy) ── */

export function resolveBrandName(fixture: unknown): string {
  const brand = getFixtureScreen(fixture, "s-brand");
  const first = brand?.prepared[0]?.label ?? brand?.selected[0];
  if (typeof first === "string" && first.trim().length > 0) {
    if (brand && brand.prepared.length > 0) {
      const byId = new Map(brand.prepared.map((item) => [item.id, item.label]));
      const sel = brand.selected
        .map((id) => byId.get(id))
        .find((label): label is string => typeof label === "string");
      if (sel) return sel;
      return brand.prepared[0].label;
    }
    return first;
  }
  return "brand Anda";
}

export function resolveAliases(fixture: unknown): string[] {
  const review = getFixtureScreen(fixture, "s-review");
  if (!review) return [];
  const aliases: string[] = [];
  for (const item of review.prepared) {
    if (!/^row-alias/.test(item.id)) continue;
    const fromSelected = review.selected.includes(item.id);
    if (!fromSelected) continue;
    // Explicit none-values ("...: none", "...: Tidak ada") mean no aliases.
    if (/:\s*(none|tidak ada)\b/i.test(item.label)) continue;
    const parts = item.label
      .split(/[:,;]/)
      .map((part) => part.trim())
      .filter(
        (part) =>
          part.length > 1 &&
          !/^readback row/i.test(part) &&
          !/^alias/i.test(part),
      );
    for (const part of parts) {
      if (!aliases.includes(part)) aliases.push(part);
    }
  }
  return aliases;
}

/* ── s-questions static structure (no prompt generation is connected) ── */

export const UNBRANDED_INTENTS = [
  "Rekomendasi kategori",
  "Situasi pelanggan",
  "Kebutuhan dan pertimbangan",
  "Produk untuk kebutuhan tertentu",
  "Shortlist",
  "Pertimbangan antar pilihan",
] as const;

export const BRANDED_INTENTS = [
  "Kecocokan untuk kebutuhan",
  "Rekomendasi eksplisit",
  "Perbandingan langsung",
  "Cocok, tidak cocok, kelebihan dan kekurangan",
] as const;

export type QuestionSlot = {
  number: number;
  intent: string;
  unbranded: boolean;
  text: string;
};

/** The 10 review slots in final order. Texts come from the fixture's
 *  s-questions prepared items when present; otherwise a structural
 *  placeholder (never invented question wording). */
export function deriveQuestionSlots(fixture: unknown): QuestionSlot[] {
  const state = getFixtureScreen(fixture, "s-questions");
  const byIndex = new Map<string, string>();
  if (state) {
    state.prepared.forEach((item, index) => {
      byIndex.set(String(index), item.label);
    });
  }
  const intents = [...UNBRANDED_INTENTS, ...BRANDED_INTENTS];
  return intents.map((intent, index) => ({
    number: index + 1,
    intent,
    unbranded: index < UNBRANDED_INTENTS.length,
    text: byIndex.get(String(index)) ?? `Pertanyaan ${index + 1} (${intent})`,
  }));
}

/* ── s-review row derivation (meaning-level, data contract §1-§2) ── */

export function deriveReviewRows(
  fixture: unknown,
  activeScreens?: readonly IntakeScreenId[],
): ReviewRow[] {
  const scopeLabels = selectedLabels(getFixtureScreen(fixture, "s-scope"));
  const branchLabels = selectedLabels(getFixtureScreen(fixture, "s-branch"));
  const productLabels = selectedLabels(getFixtureScreen(fixture, "s-product"));
  const categoryLabels = selectedLabels(
    getFixtureScreen(fixture, "s-category"),
  );
  const offeringLabels = selectedLabels(
    getFixtureScreen(fixture, "s-offerings"),
  );
  const customerLabels = selectedLabels(
    getFixtureScreen(fixture, "s-customers"),
  );
  const serviceLabels = selectedLabels(getFixtureScreen(fixture, "s-service"));
  const marketState = getFixtureScreen(fixture, "s-market");
  const competitorState = getFixtureScreen(fixture, "s-competitors");
  const factsState = getFixtureScreen(fixture, "s-facts");
  const reviewState = getFixtureScreen(fixture, "s-review");

  const active = (id: IntakeScreenId) =>
    activeScreens === undefined || activeScreens.includes(id);

  // Scope row: the committed scope choice label.
  const scopeValue = scopeLabels.length > 0 ? scopeLabels[0] : "Belum dipilih";

  // Target row: the conditional entity (branch or product) actually visited;
  // omitted entirely on whole-brand routes (handoff: omit inactive branches).
  const targetLabel =
    branchLabels.length > 0 ? branchLabels[0] : productLabels[0];
  const targetValue = targetLabel !== undefined ? targetLabel : "Belum dipilih";

  let marketValue: string;
  if (!marketState || marketState.selected.length === 0) {
    marketValue = "Belum dipilih";
  } else {
    const ids = marketState.selected;
    if (ids.some((id) => /luar|abroad|international/i.test(id))) {
      marketValue = "Indonesia dan luar negeri";
    } else if (ids.some((id) => /seluruh|nationwide|^all|national/i.test(id))) {
      marketValue = "Seluruh Indonesia";
    } else {
      const areas = selectedLabels(marketState).filter(
        (label) => !/^market (type|bound)/i.test(label),
      );
      const areaLabels = areas.filter(
        (label) =>
          label !== "Sekitar satu area" &&
          label !== "Beberapa area" &&
          label !== "Seluruh Indonesia" &&
          label !== "Indonesia dan luar negeri",
      );
      marketValue =
        areaLabels.length > 0
          ? `${areaLabels.join(", ")}`
          : (areas[0] ?? "Belum dipilih");
    }
  }

  let competitorValue: string;
  if (!competitorState || competitorState.selected.length === 0) {
    competitorValue = "Belum dikonfirmasi";
  } else {
    const kept = selectedLabels(competitorState);
    competitorValue =
      kept.length > 0
        ? kept.join(", ")
        : "Tidak ada pesaing langsung. Audit membandingkan dengan alternatif dalam kategori Anda.";
  }

  const factsText =
    factsState && factsState.selected.length > 0
      ? factsState.selected.join(" ")
      : "";
  const factsValue =
    factsText.trim().length > 0 ? factsText : "Tidak ditambahkan";

  const rows: ReviewRow[] = [
    {
      key: "brand",
      label: "Brand",
      value: brandRowValue(fixture),
      target: "s-brand",
    },
    {
      key: "scope",
      label: "Fokus audit",
      value: scopeValue,
      target: "s-scope",
    },
  ];
  if (active("s-branch") || active("s-product")) {
    rows.push({
      key: "target",
      label: "Target audit",
      value: targetValue,
      target: branchLabels.length > 0 ? "s-branch" : "s-product",
    });
  }
  rows.push(
    {
      key: "category",
      label: "Kategori",
      value: categoryLabels.length > 0 ? categoryLabels[0] : "Belum dipilih",
      target: "s-category",
    },
    {
      key: "offerings",
      label: "Produk dan layanan",
      value:
        offeringLabels.length > 0
          ? offeringLabels.join(", ")
          : "Belum dikonfirmasi",
      target: "s-offerings",
    },
    {
      key: "customers",
      label: "Alasan pelanggan",
      value:
        customerLabels.length > 0
          ? customerLabels.join(", ")
          : "Tidak ditambahkan",
      target: "s-customers",
    },
    {
      key: "service",
      label: "Cara layanan",
      value:
        serviceLabels.length > 0 ? serviceLabels.join(", ") : "Belum dipilih",
      target: "s-service",
    },
    { key: "market", label: "Pasar", value: marketValue, target: "s-market" },
    {
      key: "competitors",
      label: "Pembanding",
      value: competitorValue,
      target: "s-competitors",
    },
    {
      key: "facts",
      label: "Hal yang wajib benar",
      value: factsValue,
      target: "s-facts",
    },
  );

  if (reviewState) {
    for (const item of reviewState.prepared) {
      if (!/^row-conflict/.test(item.id)) continue;
      if (!reviewState.selected.includes(item.id)) continue;
      rows.push({
        key: item.id,
        label: "Perbedaan sumber",
        value: item.label,
        target: "s-brand",
        advisory: true,
      });
    }
  }
  return rows;
}

/** Meaning-level brand row value ("Kopi Sudut · kopisudut.id"). Reads the
 *  prepared brand card (label = name, detail = source) like BrandScreen;
 *  falls back to selected labels, then "Belum dipilih". */
function brandRowValue(fixture: unknown): string {
  const brand = getFixtureScreen(fixture, "s-brand");
  const card = brand?.prepared[0];
  if (card) {
    const source =
      typeof card.detail === "string" && card.detail.trim().length > 0
        ? ` · ${card.detail.trim()}`
        : "";
    return `${card.label}${source}`;
  }
  const selected = selectedLabels(brand);
  return selected.length > 0 ? selected[0] : "Belum dipilih";
}

function ScreenSection({
  heading,
  children,
  screenId,
}: {
  heading: string;
  children: React.ReactNode;
  screenId: IntakeScreenId;
}) {
  return (
    <section className={styles.screen} aria-labelledby={screenId + "-h"}>
      <h1 className="type-heading-lg" id={screenId + "-h"}>
        {heading}
      </h1>
      {children}
    </section>
  );
}

function useValidity(valid: boolean, nav: IntakeScreenSlotProps["nav"]) {
  const publish = nav.onValidityChange;
  useEffect(() => {
    publish?.(valid);
  }, [publish, valid]);
}

const reachOptions: {
  kind: MarketKind;
  title: string;
  description: string;
  icon: typeof IconMapPin;
}[] = [
  {
    kind: "sekitar",
    title: "Sekitar satu area",
    description: "Pelanggan terutama datang dari satu kota atau area.",
    icon: IconMapPin,
  },
  {
    kind: "beberapa",
    title: "Beberapa area",
    description: "Pelanggan berasal dari beberapa kota atau area tertentu.",
    icon: IconMapPins,
  },
  {
    kind: "seluruh",
    title: "Seluruh Indonesia",
    description: "Produk atau layanan tersedia secara nasional.",
    icon: IconMap,
  },
  {
    kind: "luar",
    title: "Indonesia dan luar negeri",
    description: "Pelanggan juga berada di negara lain.",
    icon: IconWorld,
  },
];

function MarketScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
  invalidAttempts,
}: IntakeScreenSlotProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const market = answers.market;
  const areas = (getFixtureScreen(fixture, "s-market")?.prepared ?? []).filter(
    (item) => marketKindFromId(item.id) === null && !/^market-/.test(item.id),
  );
  const areaBased = market.kind === "sekitar" || market.kind === "beberapa";
  const valid = isScreenAnswerValid("s-market", answers);
  useValidity(valid, nav);
  return (
    <ScreenSection screenId="s-market" heading="Di mana pelanggan Anda berada?">
      <p className={`${styles.lead} type-copy-lg`}>
        Pilih jangkauan utama untuk audit ini.
      </p>
      <div className={styles.choices}>
        <SelectionGroup
          label="Di mana pelanggan Anda berada?"
          value={market.kind ?? ""}
          onValueChange={(kind) =>
            updateAnswer((prev) => setMarketKind(prev, kind as MarketKind))
          }
        >
          {reachOptions.map(({ kind, title, description, icon: Icon }) => (
            <SelectionCard
              key={kind}
              value={kind}
              title={title}
              description={description}
              icon={<Icon stroke={1.5} />}
            />
          ))}
        </SelectionGroup>
      </div>
      <Reveal open={areaBased}>
        <div className={styles.areaPanel}>
          <h2 className="type-heading-sm">
            {market.kind === "sekitar"
              ? "Pilih satu kota atau area"
              : "Pilih semua kota atau area"}
          </h2>
          <div
            className={styles.chipList}
            role="group"
            aria-label="Kota atau area"
          >
            {areas.map((area) => (
              <Chip
                key={area.id}
                label={area.label}
                selected={market.areaIds.includes(area.id)}
                selectedIndicator="check"
                onToggle={() =>
                  updateAnswer((prev) => toggleMarketArea(prev, area.id))
                }
              />
            ))}
            {market.customAreas.map((area) => (
              <Chip
                key={area}
                label={area}
                selected
                selectedIndicator="check"
                onToggle={() =>
                  updateAnswer((prev) => removeMarketArea(prev, area))
                }
              />
            ))}
          </div>
          <div className={styles.manual}>
            <AddLine
              id="s-market-area-add"
              inputLabel="Tambah area lain"
              placeholder="Tambah area lain"
              buttonLabel="Tambahkan"
              onCommit={(area) =>
                updateAnswer((prev) => addMarketArea(prev, area))
              }
            />
          </div>
        </div>
      </Reveal>
      {!valid && (invalidAttempts ?? 0) > 0 ? (
        <p role="alert" className={`${styles.error} type-copy-sm`}>
          {areaBased
            ? market.kind === "sekitar"
              ? "Pilih satu kota atau area."
              : "Pilih setidaknya satu kota atau area."
            : "Pilih jangkauan utama untuk melanjutkan."}
        </p>
      ) : null}
    </ScreenSection>
  );
}

function CompetitorsScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
  invalidAttempts,
}: IntakeScreenSlotProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const competitors = answers.competitors;
  const rows = (
    getFixtureScreen(fixture, "s-competitors")?.prepared ?? []
  ).filter((item) => /^competitor/i.test(item.id));
  const valid = isScreenAnswerValid("s-competitors", answers);
  useValidity(valid, nav);
  return (
    <ScreenSection
      screenId="s-competitors"
      heading="Bisnis apa yang menjadi alternatif bagi pelanggan Anda?"
    >
      <p className={`${styles.lead} type-copy-lg`}>
        Pilih bisnis yang dipertimbangkan pelanggan untuk kebutuhan yang sama.
        Nuave akan menggunakannya untuk menguji perbandingan.
      </p>
      <div
        className={styles.checkboxList}
        role="group"
        aria-label="Bisnis pembanding"
      >
        {rows.map((item) => (
          <label key={item.id} className={styles.checkboxRow}>
            <span className="type-copy">{item.label}</span>
            <Checkbox
              className={styles.checkbox}
              checked={competitors.keptIds.includes(item.id)}
              onCheckedChange={() =>
                updateAnswer((prev) =>
                  toggleCompetitor(
                    setCompetitorsNoDirect(prev, false),
                    item.id,
                  ),
                )
              }
            />
          </label>
        ))}
        {competitors.custom.map((name) => (
          <label key={name} className={styles.checkboxRow}>
            <span className="type-copy">{name}</span>
            <Checkbox
              className={styles.checkbox}
              checked
              onCheckedChange={() =>
                updateAnswer((prev) => removeCompetitor(prev, name))
              }
            />
          </label>
        ))}
      </div>
      <Reveal trigger="Tambah bisnis lain" defaultOpen={!rows.length}>
        <div className={styles.manual}>
          <AddLine
            id="s-competitors-add"
            inputLabel="Tambah bisnis lain"
            placeholder="Tambah bisnis lain"
            buttonLabel="Tambahkan"
            onCommit={(name) => {
              const existing = rows.find(
                (item) =>
                  item.label.toLocaleLowerCase() === name.toLocaleLowerCase(),
              );
              updateAnswer((prev) =>
                existing
                  ? prev.competitors.keptIds.includes(existing.id)
                    ? prev
                    : toggleCompetitor(
                        setCompetitorsNoDirect(prev, false),
                        existing.id,
                      )
                  : addCompetitor(prev, name),
              );
            }}
          />
        </div>
      </Reveal>
      <label className={styles.checkboxRow}>
        <Checkbox
          className={styles.checkbox}
          checked={competitors.noDirect}
          onCheckedChange={(checked) =>
            updateAnswer((prev) => setCompetitorsNoDirect(prev, checked))
          }
        />
        <span className="type-copy">
          Tidak ada pesaing langsung yang saya tahu
        </span>
      </label>
      {!valid && (invalidAttempts ?? 0) > 0 ? (
        <p role="alert" className={`${styles.error} type-copy-sm`}>
          Pilih setidaknya satu bisnis, atau pilih &quot;Tidak ada pesaing
          langsung&quot;.
        </p>
      ) : null}
    </ScreenSection>
  );
}

function FactsScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
}: IntakeScreenSlotProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const [text, setText] = useState(answers.facts.text);
  const flagged = containsSensitiveData(text);
  useValidity(!flagged, nav);
  return (
    <ScreenSection
      screenId="s-facts"
      heading="Apa yang tidak boleh Nuave salah pahami?"
    >
      <p className={`${styles.lead} type-copy-lg`}>
        Tambahkan satu fakta publik yang dapat memengaruhi hasil audit, seperti
        harga, sertifikasi, wilayah layanan, atau istilah khusus. Kosongkan jika
        tidak ada.
      </p>
      <span className={`${styles.hint} type-label-sm`}>Opsional</span>
      <label className={styles.field}>
        <span className="type-label">Satu fakta yang wajib benar</span>
        <Textarea
          id="s-facts-text"
          rows={5}
          value={text}
          aria-invalid={flagged}
          aria-describedby={
            flagged ? "s-facts-sensitive-notice" : "s-facts-hint"
          }
          placeholder="Misalnya: harga tertentu, sertifikasi halal, wilayah layanan, atau istilah khas yang sering keliru."
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            if (!containsSensitiveData(value))
              updateAnswer((prev) => setFactsText(prev, value));
          }}
        />
      </label>
      {flagged ? (
        <p
          role="alert"
          id="s-facts-sensitive-notice"
          className={`${styles.error} type-copy-sm`}
        >
          Jangan masukkan data pribadi, informasi pembayaran, atau rahasia
          bisnis. Hapus bagian itu dan tulis fakta bisnis yang boleh dipahami
          AI.
        </p>
      ) : null}
      <p id="s-facts-hint" className={`${styles.hint} type-copy-sm`}>
        Jangan masukkan data pribadi, informasi pembayaran, atau rahasia bisnis.
      </p>
    </ScreenSection>
  );
}

function ReviewScreen({
  fixture,
  nav,
  activeScreens,
  answers: supplied,
  updateAnswer: update,
}: IntakeScreenSlotProps) {
  const [answers] = useIntakeAnswers(fixture, supplied, update);
  const rows = deriveReviewRowsFromState(answers, fixture, activeScreens);
  useValidity(
    isReviewApprovable(answers, activeScreens ?? INTAKE_SCREEN_ORDER),
    nav,
  );
  return (
    <ScreenSection
      screenId="s-review"
      heading="Konfirmasi informasi brand Anda"
    >
      <p className={`${styles.lead} type-copy-lg`}>
        Pastikan informasi ini sudah tepat sebelum Nuave menyusun pertanyaan
        audit.
      </p>
      <div className={styles.review}>
        {rows.map((row) => (
          <Button
            key={row.key}
            variant="ghost"
            className={styles.reviewRow}
            data-correction-target={row.target}
            aria-label={`Ubah ${row.label}`}
            onClick={() => nav.onGotoScreen?.(row.target)}
          >
            <span>
              <span className="type-heading-sm">{row.label}</span>
              <span className={`${styles.reviewValue} type-copy`}>
                {row.value}
              </span>
            </span>
            <IconChevronRight size={28} stroke={2} aria-hidden="true" />
          </Button>
        ))}
      </div>
    </ScreenSection>
  );
}

export const BAB2_SCREENS: Partial<Record<IntakeScreenId, IntakeScreenSlot>> = {
  "s-market": MarketScreen,
  "s-competitors": CompetitorsScreen,
  "s-facts": FactsScreen,
  "s-review": ReviewScreen,
};
export const BAB2_SCREEN_IDS = Object.keys(BAB2_SCREENS).filter(
  (id): id is IntakeScreenId =>
    (INTAKE_SCREEN_ORDER as readonly string[]).includes(id),
);
