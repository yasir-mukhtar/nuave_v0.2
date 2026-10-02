"use client";

import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { AddLine } from "@/components/product/selection/AddLine";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import {
  smartComparatorsReady,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";

type ScreenProps = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  onChange: (next: SmartSelection) => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  error?: string | null;
};

const originText = {
  website: "Dari website Anda",
  nuave: "Saran Nuave",
  owner: "Dari Anda",
} as const;
const sameText = (a: string, b: string) =>
  a.trim().toLocaleLowerCase("id-ID") === b.trim().toLocaleLowerCase("id-ID");

function Notice({ error }: { error?: string | null }) {
  return error ? (
    <p role="alert" className="type-copy-sm text-destructive">
      {error}
    </p>
  ) : null;
}

export function SmartCustomerNeedsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const proposed = prepared.customerNeeds.proposed ?? [];
  const ownerAdded = selection.customerNeeds.filter(
    (need) => !proposed.some((item) => sameText(item, need)),
  );
  const [limitError, setLimitError] = useState<string | null>(null);
  const toggle = (need: string, on: boolean) => {
    if (on && selection.customerNeeds.some((item) => sameText(item, need)))
      return;
    if (on && (selection.customerNeeds.length >= 12 || need.length > 300)) {
      setLimitError(
        "Pilih paling banyak 12 kebutuhan, masing-masing paling panjang 300 karakter.",
      );
      return;
    }
    setLimitError(null);
    onChange({
      ...selection,
      customerNeeds: on
        ? [...selection.customerNeeds, need]
        : selection.customerNeeds.filter((item) => item !== need),
      origins: { ...selection.origins, customerNeeds: "owner" },
    });
  };
  return (
    <section className="grid gap-5" data-intake-screen="customer-needs">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Kenapa pelanggan biasanya mencari yang seperti ini?
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Opsional · Pilih yang sesuai, hapus yang tidak, atau tambahkan kebutuhan
        pelanggan Anda.
      </p>
      {proposed.length ? (
        <div className="grid gap-2">
          <h2 className="type-label m-0">
            {originText[prepared.customerNeeds.origin]}
          </h2>
          <ChipGroup label={originText[prepared.customerNeeds.origin]}>
            {proposed.map((need) => (
              <Chip
                key={need}
                label={need}
                selected={selection.customerNeeds.includes(need)}
                selectedIndicator="check"
                onToggle={(on) => toggle(need, on)}
              />
            ))}
          </ChipGroup>
        </div>
      ) : null}
      {ownerAdded.length ? (
        <div className="grid gap-2">
          <h2 className="type-label m-0">Dari Anda</h2>
          <ChipGroup label="Dari Anda">
            {ownerAdded.map((need) => (
              <Chip
                key={need}
                label={need}
                selected
                onToggle={(on) => toggle(need, on)}
              />
            ))}
          </ChipGroup>
        </div>
      ) : null}
      <AddLine
        inputLabel="Kebutuhan pelanggan lain"
        placeholder="Tambah kebutuhan pelanggan"
        onCommit={(value) =>
          toggle(proposed.find((need) => sameText(need, value)) ?? value, true)
        }
      />
      <Notice error={error ?? limitError} />
    </section>
  );
}

export function SmartCompetitorsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const proposed = prepared.comparatorSuggestions.proposed ?? [];
  const [limitError, setLimitError] = useState<string | null>(null);
  const update = (patch: Partial<SmartSelection>) => {
    setLimitError(null);
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, comparators: "owner" },
    });
  };
  const add = (name: string) => {
    if (selection.comparatorNames.some((item) => sameText(item, name))) return;
    if (selection.comparatorNames.length >= 5) {
      setLimitError(
        "Pilih paling banyak 5 bisnis pembanding. Hapus satu untuk menambah yang lain.",
      );
      return;
    }
    if (name.length > 160) {
      setLimitError("Nama pembanding paling panjang 160 karakter.");
      return;
    }
    update({ comparatorNames: [...selection.comparatorNames, name] });
  };
  return (
    <section className="grid gap-5" data-intake-screen="competitors">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ini yang mungkin dibandingkan dengan Anda
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Pilih bisnis pembanding, atau beri tahu jika belum ada yang Anda
        ketahui.
      </p>
      <SelectionGroup
        label="Bisnis pembanding"
        value={selection.comparatorMode}
        onValueChange={(mode) =>
          update({
            comparatorMode: mode as SmartSelection["comparatorMode"],
            comparatorNames: mode === "named" ? selection.comparatorNames : [],
          })
        }
      >
        <SelectionCard
          value="named"
          title="Bisnis yang saya pilih"
          meta={
            selection.origins.comparators === "nuave" &&
            selection.comparatorNames.length
              ? "Saran Nuave"
              : undefined
          }
        />
        <SelectionCard
          value="category-alternatives"
          title="Tidak ada pembanding langsung"
          description="Bandingkan dengan kategori alternatif."
        />
        <SelectionCard value="unknown" title="Belum tahu" />
      </SelectionGroup>
      {selection.comparatorMode === "named" ? (
        <div className="grid gap-4">
          {proposed.length ? (
            <div className="grid gap-2">
              <h2 className="type-label m-0">Saran Nuave</h2>
              <ChipGroup label="Saran Nuave">
                {proposed.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    selected={selection.comparatorNames.includes(name)}
                    selectedIndicator="check"
                    onToggle={(on) =>
                      on
                        ? add(name)
                        : update({
                            comparatorNames: selection.comparatorNames.filter(
                              (item) => item !== name,
                            ),
                          })
                    }
                  />
                ))}
              </ChipGroup>
            </div>
          ) : null}
          {selection.comparatorNames.map((name, index) => (
            <div key={index} className="grid gap-1">
              <span className="type-copy-sm text-muted-foreground">
                {proposed.includes(name) ? "Saran Nuave" : "Dari Anda"}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  className="min-w-0"
                  aria-label={`Pembanding terpilih ${index + 1}`}
                  value={name}
                  maxLength={160}
                  onChange={(event) =>
                    update({
                      comparatorNames: selection.comparatorNames.map(
                        (item, i) => (i === index ? event.target.value : item),
                      ),
                    })
                  }
                />
                <Button
                  variant="outline"
                  aria-label={`Hapus pembanding ${name}`}
                  onClick={() =>
                    update({
                      comparatorNames: selection.comparatorNames.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
          <AddLine
            inputLabel="Nama pembanding lain"
            placeholder="Tambah bisnis pembanding"
            onCommit={add}
          />
          {!smartComparatorsReady(selection) ? (
            <p role="status" className="type-copy-sm text-muted-foreground">
              Tambahkan nama pembanding atau pilih “Tidak ada pembanding
              langsung” atau “Belum tahu”. Pilih paling banyak 5 nama.
            </p>
          ) : null}
        </div>
      ) : null}
      <Notice error={error ?? limitError} />
    </section>
  );
}

export function SmartPublicFactScreen({
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  return (
    <section className="grid gap-5" data-intake-screen="public-fact">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Apa yang tidak boleh salah dipahami tentang brand Anda?
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Opsional · Isi hanya fakta publik tentang bisnis Anda, bukan informasi
        pribadi atau rahasia.
      </p>
      <label className="grid gap-2 type-label">
        Fakta publik tambahan{" "}
        <span className="type-copy-sm text-muted-foreground">Dari Anda</span>
        <Textarea
          value={selection.publicFact}
          maxLength={500}
          onChange={(event) =>
            onChange({
              ...selection,
              publicFact: event.target.value,
              origins: { ...selection.origins, publicFact: "owner" },
            })
          }
        />
      </label>
      <Notice error={error} />
    </section>
  );
}
