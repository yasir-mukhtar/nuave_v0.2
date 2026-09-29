"use client";

import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SOURCE_EXCERPT_EMPTY_NOTICE,
  type SourceExcerptStatus,
} from "../audit/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  requiredSmartGaps,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";

type Props = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  onChange: (next: SmartSelection) => void;
  onConfirm: () => void;
  /** Opens the dedicated screen that owns the first still-missing meaning. */
  onFillGaps: () => void;
  onEditSource?: () => void;
  /** J4: opens the dedicated focus screen so the row itself stays read-back. */
  onEditFocus?: () => void;
  /** J5: each business-detail row opens its own screen instead of editing inline. */
  onEditCategory?: () => void;
  onEditOfferings?: () => void;
  onEditService?: () => void;
  onEditMarket?: () => void;
  busy?: boolean;
  error?: string | null;
  sourceExcerptStatus?: SourceExcerptStatus;
  /** The intake frame focuses this heading on screen arrival (R-27). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

const channels = [
  ["on_premise", "Di lokasi bisnis Anda"],
  ["on_customer", "Di lokasi pelanggan"],
  ["delivery", "Dikirim ke pelanggan"],
  ["online", "Digunakan secara online"],
] as const;
const reaches = [
  ["sekitar", "Sekitar bisnis"],
  ["beberapa", "Beberapa area"],
  ["seluruh", "Seluruh Indonesia"],
  ["luar", "Indonesia dan luar negeri"],
] as const;
const originText = {
  website: "Dari website Anda",
  nuave: "Saran Nuave",
  owner: "Dari Anda",
} as const;

function rowOrigin(selection: SmartSelection, key: string) {
  return originText[selection.origins[key] ?? "owner"];
}

function Row({
  title,
  origin,
  children,
}: {
  title: string;
  origin: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="grid gap-3 border-t border-border py-5"
      aria-label={title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-heading-sm">{title}</h2>
        <span className="type-copy-sm text-muted-foreground">{origin}</span>
      </div>
      {children}
    </section>
  );
}

export default function SmartSummary({
  prepared,
  selection,
  onChange,
  onConfirm,
  onFillGaps,
  onEditSource,
  onEditFocus,
  onEditCategory,
  onEditOfferings,
  onEditService,
  onEditMarket,
  busy = false,
  error,
  sourceExcerptStatus,
  headingRef,
}: Props) {
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [manualComparator, setManualComparator] = useState("");
  const update = (patch: Partial<SmartSelection>, originKey?: string) =>
    onChange({
      ...selection,
      ...patch,
      origins: originKey
        ? { ...selection.origins, [originKey]: "owner" }
        : selection.origins,
    });
  const gaps = requiredSmartGaps(selection);
  const optionalPresent = Boolean(
    selection.targetCustomer ||
    selection.customerNeeds.length ||
    selection.decisionConsiderations.length ||
    selection.differentiator ||
    selection.comparatorNames.length ||
    selection.comparatorMode !== "unknown" ||
    (prepared.comparatorSuggestions.proposed?.length ?? 0) > 0,
  );
  const reachLabel =
    reaches.find(([value]) => value === selection.marketReach)?.[1] ?? "";
  const areaBased =
    selection.marketReach === "sekitar" || selection.marketReach === "beberapa";

  return (
    <section className="w-full pb-10" data-smart-summary="ready">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ini yang Nuave pahami.
      </h1>
      <p className="type-copy mt-2 text-muted-foreground">
        Periksa pilihan yang sudah disiapkan. Ubah hanya yang belum sesuai, lalu
        konfirmasi sekali sebelum pertanyaan audit dibuat.
      </p>
      {sourceExcerptStatus === "no-usable-text" ? (
        <p role="status" className="type-copy-sm mt-3 text-muted-foreground">
          {SOURCE_EXCERPT_EMPTY_NOTICE}
        </p>
      ) : null}

      <Row title="Bisnis" origin={originText[selection.nameOrigin]}>
        <p className="type-copy-sm text-muted-foreground break-all">
          {prepared.canonicalSource} · Dari Anda
        </p>
        {onEditSource ? (
          <Button variant="link" className="w-fit" onClick={onEditSource}>
            Ubah nama atau website
          </Button>
        ) : null}
        <label className="flex min-h-11 items-center gap-3 type-copy">
          <input
            type="radio"
            name="smart-business"
            checked={
              selection.name === prepared.typedName &&
              selection.nameOrigin === "owner"
            }
            onChange={() =>
              update({ name: prepared.typedName, nameOrigin: "owner" })
            }
          />
          {prepared.typedName}
        </label>
        {prepared.discoveredName ? (
          <label className="flex min-h-11 items-center gap-3 type-copy">
            <input
              type="radio"
              name="smart-business"
              checked={
                selection.name === prepared.discoveredName &&
                selection.nameOrigin === "website"
              }
              onChange={() =>
                update({
                  name: prepared.discoveredName!,
                  nameOrigin: "website",
                })
              }
            />
            {prepared.discoveredName}{" "}
            <span className="type-copy-sm text-muted-foreground">
              Dari website Anda
            </span>
          </label>
        ) : null}
        <Button
          variant="link"
          className="w-fit"
          onClick={() => setEditingBusiness(!editingBusiness)}
        >
          Ubah nama
        </Button>
        {editingBusiness ? (
          <label className="grid gap-2 type-label">
            Nama brand
            <Input
              value={selection.name}
              maxLength={160}
              onChange={(event) =>
                update({ name: event.target.value, nameOrigin: "owner" })
              }
            />
          </label>
        ) : null}
      </Row>

      <Row title="Fokus audit" origin={rowOrigin(selection, "focus")}>
        <p className="type-copy">
          {selection.focus === "cabang"
            ? "Satu lokasi"
            : selection.focus === "produk"
              ? "Satu produk atau layanan"
              : "Brand secara keseluruhan"}
        </p>
        {selection.focus === "cabang" ? (
          <p className="type-copy-sm text-muted-foreground">
            {selection.locationName || "Lokasi belum dipilih"}
            {selection.locationAddress.trim()
              ? ` — ${selection.locationAddress}`
              : ""}
          </p>
        ) : selection.focus === "produk" ? (
          <p className="type-copy-sm text-muted-foreground">
            {selection.productTarget || "Pilih satu produk atau layanan"}
          </p>
        ) : null}
        {onEditFocus ? (
          <Button variant="link" className="w-fit" onClick={onEditFocus}>
            Ubah
          </Button>
        ) : null}
      </Row>

      <Row title="Kategori" origin={rowOrigin(selection, "category")}>
        <p className="type-copy">
          {selection.category || "Kategori belum tersedia"}
        </p>
        {onEditCategory ? (
          <Button variant="link" className="w-fit" onClick={onEditCategory}>
            Ubah
          </Button>
        ) : null}
      </Row>

      <Row
        title="Produk dan layanan"
        origin={
          selection.focus === "produk"
            ? rowOrigin(selection, "focus")
            : rowOrigin(selection, "offerings")
        }
      >
        <p className="type-copy">
          {selection.focus === "produk"
            ? selection.productTarget || "Pilih satu produk atau layanan"
            : selection.offerings.join(", ") ||
              "Penawaran utama belum tersedia"}
        </p>
        {onEditOfferings ? (
          <Button variant="link" className="w-fit" onClick={onEditOfferings}>
            Ubah
          </Button>
        ) : null}
      </Row>

      <Row
        title="Cara layanan"
        origin={rowOrigin(selection, "serviceChannels")}
      >
        <p className="type-copy">
          {selection.serviceChannels
            .map(
              (channel) =>
                channels.find(([value]) => value === channel)?.[1] ?? channel,
            )
            .join(", ") || "Belum dipilih"}
        </p>
        {onEditService ? (
          <Button variant="link" className="w-fit" onClick={onEditService}>
            Ubah
          </Button>
        ) : null}
      </Row>

      {selection.focus !== "cabang" ? (
        <Row title="Jangkauan pasar" origin={rowOrigin(selection, "market")}>
          <p className="type-copy">
            {reachLabel || "Belum dipilih"}
            {areaBased && selection.marketAreas.length
              ? ` — ${selection.marketAreas.join(", ")}`
              : ""}
          </p>
          {onEditMarket ? (
            <Button variant="link" className="w-fit" onClick={onEditMarket}>
              Ubah
            </Button>
          ) : null}
        </Row>
      ) : null}

      <Row title="Detail tambahan" origin={originText.nuave}>
        <Accordion defaultValue={optionalPresent ? ["optional"] : []}>
          <AccordionItem value="optional">
            <AccordionTrigger>
              {optionalPresent ? "Periksa detail tambahan" : "Tambah detail"}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pt-3">
                <label className="grid gap-2 type-label">
                  Pelanggan sasaran{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    {rowOrigin(selection, "targetCustomer")}
                  </span>
                  <Input
                    value={selection.targetCustomer}
                    maxLength={500}
                    onChange={(event) =>
                      update(
                        { targetCustomer: event.target.value },
                        "targetCustomer",
                      )
                    }
                  />
                </label>
                <label className="grid gap-2 type-label">
                  Kebutuhan pelanggan{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    {rowOrigin(selection, "customerNeeds")}
                  </span>
                  <Input
                    value={selection.customerNeeds.join("; ")}
                    maxLength={1200}
                    onChange={(event) =>
                      update(
                        {
                          customerNeeds: event.target.value
                            .split(";")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                        "customerNeeds",
                      )
                    }
                  />
                </label>
                <label className="grid gap-2 type-label">
                  Pertimbangan pembeli{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    {rowOrigin(selection, "decisionConsiderations")}
                  </span>
                  <Input
                    value={selection.decisionConsiderations.join("; ")}
                    maxLength={1200}
                    onChange={(event) =>
                      update(
                        {
                          decisionConsiderations: event.target.value
                            .split(";")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                        "decisionConsiderations",
                      )
                    }
                  />
                </label>
                <fieldset className="grid gap-2">
                  <legend className="type-label">
                    Bisnis pembanding{" "}
                    <span className="type-copy-sm text-muted-foreground">
                      {rowOrigin(selection, "comparators")}
                    </span>
                  </legend>
                  {(
                    [
                      ["unknown", "Belum tahu"],
                      ["named", "Bisnis yang saya pilih"],
                      [
                        "category-alternatives",
                        "Tidak ada pembanding langsung; bandingkan kategori alternatif",
                      ],
                    ] as const
                  ).map(([mode, label]) => (
                    <label
                      key={mode}
                      className="flex min-h-11 items-center gap-3 type-copy"
                    >
                      <input
                        type="radio"
                        name="smart-comparators"
                        checked={selection.comparatorMode === mode}
                        onChange={() =>
                          update(
                            {
                              comparatorMode: mode,
                              comparatorNames:
                                mode === "named"
                                  ? selection.comparatorNames
                                  : [],
                            },
                            "comparators",
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                  {selection.comparatorMode === "named" ? (
                    <>
                      {(prepared.comparatorSuggestions.proposed ?? []).map(
                        (name) => (
                          <label
                            key={name}
                            className="flex min-h-11 items-center gap-3 type-copy"
                          >
                            <Checkbox
                              checked={selection.comparatorNames.includes(name)}
                              onCheckedChange={(checked) =>
                                update(
                                  {
                                    comparatorNames: checked
                                      ? [...selection.comparatorNames, name]
                                      : selection.comparatorNames.filter(
                                          (item) => item !== name,
                                        ),
                                  },
                                  "comparators",
                                )
                              }
                            />
                            {name}
                          </label>
                        ),
                      )}
                      {selection.comparatorNames.map((name, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            aria-label={`Pembanding terpilih ${index + 1}`}
                            value={name}
                            maxLength={160}
                            onChange={(event) =>
                              update(
                                {
                                  comparatorNames:
                                    selection.comparatorNames.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? event.target.value
                                          : item,
                                    ),
                                },
                                "comparators",
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            aria-label={`Hapus pembanding ${name}`}
                            onClick={() =>
                              update(
                                {
                                  comparatorNames:
                                    selection.comparatorNames.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  ...(selection.comparatorNames.length === 1
                                    ? { comparatorMode: "unknown" as const }
                                    : {}),
                                },
                                "comparators",
                              )
                            }
                          >
                            Hapus
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          aria-label="Nama pembanding lain"
                          value={manualComparator}
                          maxLength={160}
                          onChange={(event) =>
                            setManualComparator(event.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const name = manualComparator.trim();
                            if (
                              name &&
                              !selection.comparatorNames.includes(name)
                            )
                              update(
                                {
                                  comparatorNames: [
                                    ...selection.comparatorNames,
                                    name,
                                  ],
                                },
                                "comparators",
                              );
                            setManualComparator("");
                          }}
                        >
                          Tambah
                        </Button>
                      </div>
                    </>
                  ) : null}
                </fieldset>
                <label className="grid gap-2 type-label">
                  Pembeda bisnis{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    {rowOrigin(selection, "differentiator")}
                  </span>
                  <Input
                    value={selection.differentiator}
                    maxLength={1000}
                    onChange={(event) =>
                      update(
                        { differentiator: event.target.value },
                        "differentiator",
                      )
                    }
                  />
                </label>
                <label className="grid gap-2 type-label">
                  Fakta publik tambahan{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    Dari Anda
                  </span>
                  <Input
                    value={selection.publicFact}
                    maxLength={500}
                    onChange={(event) =>
                      update({ publicFact: event.target.value }, "publicFact")
                    }
                  />
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Row>

      {prepared.sourceLinks.length ? (
        <Accordion>
          <AccordionItem value="sources">
            <AccordionTrigger>Lihat sumber</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-5">
                {prepared.sourceLinks.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      {error ? (
        <p role="alert" className="type-copy text-destructive">
          {error}
        </p>
      ) : null}
      {gaps.length ? (
        <p role="status" className="type-copy-sm mt-4 text-muted-foreground">
          Perlu dipastikan: {gaps.join(", ")}.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {gaps.length ? (
          <Button type="button" className="min-h-11" onClick={onFillGaps}>
            Lengkapi yang perlu dipastikan
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11"
            onClick={onConfirm}
            disabled={busy}
          >
            Sudah sesuai — buat pertanyaan audit
          </Button>
        )}
      </div>
    </section>
  );
}
