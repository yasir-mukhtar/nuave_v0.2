"use client";

import { useState } from "react";
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
  onClarify: () => void;
  onEditSource?: () => void;
  busy?: boolean;
  error?: string | null;
  clarify?: boolean;
  sourceExcerptStatus?: SourceExcerptStatus;
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
  onClarify,
  onEditSource,
  busy = false,
  error,
  clarify = false,
  sourceExcerptStatus,
}: Props) {
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [editingOfferings, setEditingOfferings] = useState(clarify);
  const [manualArea, setManualArea] = useState("");
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
  const marketReady =
    selection.focus === "cabang" ||
    Boolean(
      selection.marketReach &&
      (selection.marketReach === "sekitar"
        ? selection.marketAreas.length === 1
        : selection.marketReach === "beberapa"
          ? selection.marketAreas.length > 0
          : true),
    );
  const inlineReady = selection.serviceChannels.length > 0 && marketReady;
  const optionalPresent = Boolean(
    selection.targetCustomer ||
    selection.customerNeeds.length ||
    selection.decisionConsiderations.length ||
    selection.differentiator ||
    selection.comparatorNames.length ||
    selection.comparatorMode !== "unknown" ||
    (prepared.comparatorSuggestions.proposed?.length ?? 0) > 0,
  );

  function chooseFocus(focus: SmartSelection["focus"]) {
    if (focus === selection.focus) return;
    const retainedBrandReach =
      selection.focus === "cabang"
        ? selection.retainedBrandReach
        : selection.marketReach;
    const retainedBrandAreas =
      selection.focus === "cabang"
        ? selection.retainedBrandAreas
        : selection.marketAreas;
    update(
      {
        focus,
        productTarget: focus === "produk" ? selection.productTarget : "",
        locationName: focus === "cabang" ? selection.locationName : "",
        locationAddress: focus === "cabang" ? selection.locationAddress : "",
        marketReach: focus === "cabang" ? "" : retainedBrandReach,
        marketAreas: focus === "cabang" ? [] : retainedBrandAreas,
        retainedBrandReach,
        retainedBrandAreas,
      },
      "focus",
    );
  }

  return (
    <section
      className="mx-auto w-full max-w-3xl px-5 pb-24"
      data-smart-summary={clarify ? "clarify" : "ready"}
    >
      <h1 className="type-heading-lg">Ini yang Nuave pahami.</h1>
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
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["brand", "Brand secara keseluruhan"],
              ["cabang", "Satu lokasi"],
              ["produk", "Satu produk atau layanan"],
            ] as const
          ).map(([kind, label]) => (
            <Button
              key={kind}
              type="button"
              variant={selection.focus === kind ? "default" : "outline"}
              className="min-h-11 h-auto whitespace-normal"
              aria-pressed={selection.focus === kind}
              onClick={() => chooseFocus(kind)}
            >
              {label}
            </Button>
          ))}
        </div>
        {selection.focus === "produk" ? (
          <div className="grid gap-2">
            <p className="type-copy-sm">
              Pilih produk atau layanan yang diuji.
            </p>
            {(prepared.offerings.proposed ?? []).map((offering) => (
              <label
                key={offering}
                className="flex min-h-11 items-center gap-3 type-copy"
              >
                <input
                  type="radio"
                  name="smart-product"
                  checked={selection.productTarget === offering}
                  onChange={() => update({ productTarget: offering }, "focus")}
                />
                {offering}
              </label>
            ))}
            <label className="grid gap-2 type-label">
              Nama lain bila tidak ada dalam pilihan
              <Input
                value={selection.productTarget}
                maxLength={300}
                onChange={(event) =>
                  update({ productTarget: event.target.value }, "focus")
                }
              />
            </label>
          </div>
        ) : selection.focus === "cabang" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 type-label">
              Nama lokasi
              <Input
                value={selection.locationName}
                maxLength={300}
                onChange={(event) =>
                  update({ locationName: event.target.value }, "focus")
                }
              />
            </label>
            <label className="grid gap-2 type-label">
              Alamat lokasi
              <Input
                value={selection.locationAddress}
                maxLength={500}
                onChange={(event) =>
                  update({ locationAddress: event.target.value }, "focus")
                }
              />
            </label>
          </div>
        ) : null}
      </Row>

      <Row
        title="Kategori dan penawaran utama"
        origin={rowOrigin(selection, "category")}
      >
        <p className="type-copy">
          {selection.category || "Kategori belum tersedia"}
        </p>
        <p className="type-copy-sm text-muted-foreground">
          {selection.focus === "produk"
            ? selection.productTarget || "Pilih satu produk atau layanan"
            : selection.offerings.join(", ") ||
              "Penawaran utama belum tersedia"}
        </p>
        <Button
          variant="link"
          className="w-fit"
          onClick={() => setEditingOfferings(!editingOfferings)}
        >
          Ubah
        </Button>
        {editingOfferings ? (
          <div className="grid gap-3">
            <label className="grid gap-2 type-label">
              Kategori
              <Input
                value={selection.category}
                maxLength={200}
                onChange={(event) =>
                  update({ category: event.target.value }, "category")
                }
              />
            </label>
            {selection.focus !== "produk" ? (
              <>
                {(prepared.offerings.proposed ?? []).map((offering) => (
                  <label
                    key={offering}
                    className="flex min-h-11 items-center gap-3 type-copy"
                  >
                    <Checkbox
                      checked={selection.offerings.includes(offering)}
                      onCheckedChange={(checked) => {
                        update(
                          {
                            offerings: checked
                              ? [...selection.offerings, offering]
                              : selection.offerings.filter(
                                  (item) => item !== offering,
                                ),
                          },
                          "offerings",
                        );
                      }}
                    />
                    {offering}
                  </label>
                ))}
                <label className="grid gap-2 type-label">
                  Penawaran lain
                  <Input
                    maxLength={300}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const value = event.currentTarget.value.trim();
                      if (value && !selection.offerings.includes(value))
                        update(
                          { offerings: [...selection.offerings, value] },
                          "offerings",
                        );
                      event.currentTarget.value = "";
                    }}
                    placeholder="Ketik lalu tekan Enter"
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </Row>

      <Row
        title="Cara layanan"
        origin={rowOrigin(selection, "serviceChannels")}
      >
        <div className="grid gap-1 sm:grid-cols-2">
          {channels.map(([channel, label]) => (
            <label
              key={channel}
              className="flex min-h-11 items-center gap-3 type-copy"
            >
              <Checkbox
                checked={selection.serviceChannels.includes(channel)}
                onCheckedChange={(checked) => {
                  update(
                    {
                      serviceChannels: checked
                        ? [...selection.serviceChannels, channel]
                        : selection.serviceChannels.filter(
                            (item) => item !== channel,
                          ),
                    },
                    "serviceChannels",
                  );
                }}
              />
              {label}
            </label>
          ))}
        </div>
        {!selection.serviceChannels.length ? (
          <p className="type-copy-sm text-muted-foreground">
            Pilih setidaknya satu cara layanan.
          </p>
        ) : null}
      </Row>

      {selection.focus !== "cabang" ? (
        <>
          <Row title="Jangkauan pasar" origin={rowOrigin(selection, "market")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {reaches.map(([reach, label]) => (
                <Button
                  key={reach}
                  type="button"
                  variant={
                    selection.marketReach === reach ? "default" : "outline"
                  }
                  className="min-h-11 h-auto whitespace-normal"
                  aria-pressed={selection.marketReach === reach}
                  onClick={() =>
                    update(
                      {
                        marketReach: reach,
                        marketAreas: [],
                        retainedBrandReach: reach,
                        retainedBrandAreas: [],
                      },
                      "market",
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </Row>
          {selection.marketReach === "sekitar" ||
          selection.marketReach === "beberapa" ? (
            <Row title="Area layanan" origin={rowOrigin(selection, "market")}>
              {(prepared.marketAreas.proposed ?? []).map((area) => (
                <label
                  key={area}
                  className="flex min-h-11 items-center gap-3 type-copy"
                >
                  <Checkbox
                    checked={selection.marketAreas.includes(area)}
                    onCheckedChange={(checked) => {
                      const areas =
                        selection.marketReach === "sekitar"
                          ? checked
                            ? [area]
                            : []
                          : checked
                            ? [...selection.marketAreas, area]
                            : selection.marketAreas.filter(
                                (item) => item !== area,
                              );
                      update(
                        { marketAreas: areas, retainedBrandAreas: areas },
                        "market",
                      );
                    }}
                  />
                  {area}
                </label>
              ))}
              <div className="flex gap-2">
                <Input
                  aria-label="Area layanan lain"
                  value={manualArea}
                  maxLength={160}
                  onChange={(event) => setManualArea(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const area = manualArea.trim();
                    if (!area) return;
                    const areas =
                      selection.marketReach === "sekitar"
                        ? [area]
                        : [...selection.marketAreas, area];
                    update(
                      { marketAreas: areas, retainedBrandAreas: areas },
                      "market",
                    );
                    setManualArea("");
                  }}
                >
                  Tambah area
                </Button>
              </div>
              {selection.marketAreas
                .filter(
                  (area) =>
                    !(prepared.marketAreas.proposed ?? []).includes(area),
                )
                .map((area) => (
                  <p key={area} className="type-copy-sm">
                    {area}{" "}
                    <Button
                      variant="link"
                      onClick={() => {
                        const areas = selection.marketAreas.filter(
                          (item) => item !== area,
                        );
                        update(
                          { marketAreas: areas, retainedBrandAreas: areas },
                          "market",
                        );
                      }}
                    >
                      Hapus
                    </Button>
                  </p>
                ))}
            </Row>
          ) : null}
        </>
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
      {!inlineReady ? (
        <p role="status" className="type-copy-sm text-muted-foreground">
          Lengkapi cara layanan, jangkauan, dan area yang berlaku di pilihan di
          atas.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {gaps.length ? (
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              setEditingOfferings(true);
              onClarify();
            }}
          >
            Lengkapi yang perlu dipastikan
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11"
            onClick={onConfirm}
            disabled={!inlineReady || busy}
          >
            Sudah sesuai — buat pertanyaan audit
          </Button>
        )}
      </div>
    </section>
  );
}
