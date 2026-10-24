"use client";

import { useState } from "react";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { FloatingField } from "@/components/product/journey/FloatingField";
import {
  INDONESIA_SEARCH_PLACE,
  placeLabel,
  PLACES,
  SELURUH_INDONESIA,
  type SearchPlace,
} from "../discovery/places";
import { normalizedText } from "../discovery/text";
import {
  effectiveSearchPlace,
  type SmartSelection,
} from "./smart-intake-contract";

/** Spec 018 Experience 2: true for both sources. */
export const SEARCH_PLACE_HELPER =
  "Google kami tanya seolah-olah dari kota ini. ChatGPT hanya bisa diatur per negara, jadi ChatGPT ditanya dari Indonesia. Karena itu, pertanyaan tentang memilih tempat akan menyebut kota ini.";

const MAX_SHOWN = 24;

export function searchPlaceText(place: SearchPlace | null): string {
  if (!place) return "";
  if (place.kind === "indonesia") return SELURUH_INDONESIA;
  const entry = PLACES.find((item) => item.code === place.code);
  return entry ? placeLabel(entry) : place.display;
}

/** "Kota untuk pencarian": a searchable pick-list of the stored places plus
 * "Seluruh Indonesia" (R-03). Typing filters by name; the list shows names
 * that repeat with their regency and province. */
export function SearchPlaceFields({
  selection,
  onChange,
}: {
  selection: SmartSelection;
  onChange: (next: SmartSelection) => boolean | void;
}) {
  const [query, setQuery] = useState("");
  const current = effectiveSearchPlace(selection);
  const key = normalizedText(query);
  const matches = key
    ? PLACES.filter((place) =>
        normalizedText(placeLabel(place)).includes(key),
      ).slice(0, MAX_SHOWN)
    : [];
  const choose = (place: SearchPlace) =>
    onChange({
      ...selection,
      searchPlace: place,
      origins: { ...selection.origins, searchPlace: "owner" },
    });
  return (
    <div className="grid gap-3">
      <p className="type-copy-sm m-0 text-ink-600">{SEARCH_PLACE_HELPER}</p>
      <ChipGroup label="Kota untuk pencarian">
        {current && current.kind === "place" ? (
          <Chip
            label={searchPlaceText(current)}
            selected
            selectedIndicator="check"
            onToggle={() => {}}
          />
        ) : null}
        <Chip
          label={SELURUH_INDONESIA}
          selected={current?.kind === "indonesia"}
          selectedIndicator="check"
          onToggle={(on) => {
            if (on) choose(INDONESIA_SEARCH_PLACE);
          }}
        />
      </ChipGroup>
      <FloatingField
        label="Cari kota"
        value={query}
        placeholder="Contoh: Surabaya"
        maxLength={80}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(event) => setQuery(event.target.value)}
      />
      {key ? (
        matches.length ? (
          <ChipGroup label="Hasil pencarian kota">
            {matches.map((place) => (
              <Chip
                key={place.code}
                label={placeLabel(place)}
                selected={
                  current?.kind === "place" && current.code === place.code
                }
                selectedIndicator="check"
                onToggle={(on) => {
                  if (on)
                    choose({
                      kind: "place",
                      code: place.code,
                      display: place.display,
                    });
                }}
              />
            ))}
          </ChipGroup>
        ) : (
          <p className="type-copy-sm m-0 text-ink-500">
            Kota tidak ditemukan. Coba nama lain atau pilih Seluruh Indonesia.
          </p>
        )
      ) : null}
    </div>
  );
}
