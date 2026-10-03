"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { AddLine } from "@/components/product/selection/AddLine";
import {
  SOURCE_EXCERPT_EMPTY_NOTICE,
  type SourceExcerptStatus,
} from "../audit/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  requiredSmartGaps,
  unsafeSmartName,
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
  /** J7: opens the brand check so a name correction keeps its own screen. */
  onEditBrand?: () => void;
  onEditSource?: () => void;
  /** J4: opens the dedicated focus screen so the row itself stays read-back. */
  onEditFocus?: () => void;
  /** J5: each business-detail row opens its own screen instead of editing inline. */
  onEditCategory?: () => void;
  onEditOfferings?: () => void;
  onEditService?: () => void;
  onEditMarket?: () => void;
  onEditCustomerNeeds?: () => void;
  onEditCompetitors?: () => void;
  onEditPublicFact?: () => void;
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
  /** The row's provenance label; an empty optional answer shows none (J6). */
  origin?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="grid min-w-0 grid-cols-1 gap-3 border-t border-border py-5"
      aria-label={title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-heading-sm">{title}</h2>
        {origin ? (
          <span className="type-copy-sm text-muted-foreground">{origin}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function SmartReview({
  prepared,
  selection,
  onChange,
  onConfirm,
  onFillGaps,
  onEditBrand,
  onEditSource,
  onEditFocus,
  onEditCategory,
  onEditOfferings,
  onEditService,
  onEditMarket,
  onEditCustomerNeeds,
  onEditCompetitors,
  onEditPublicFact,
  busy = false,
  error,
  sourceExcerptStatus,
  headingRef,
}: Props) {
  const [editingAliases, setEditingAliases] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const aliasEditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editingAliases) aliasEditorRef.current?.querySelector("input")?.focus();
  }, [editingAliases]);
  const update = (patch: Partial<SmartSelection>, originKey?: string) =>
    onChange({
      ...selection,
      ...patch,
      origins: originKey
        ? { ...selection.origins, [originKey]: "owner" }
        : selection.origins,
    });
  const sameAlias = (a: string, b: string) =>
    a.trim().toLocaleLowerCase("id-ID") === b.trim().toLocaleLowerCase("id-ID");
  // A refused add returns false so the AddLine draft stays for correction.
  const addAlias = (value: string): boolean => {
    const alias = value.trim();
    if (!alias) return false;
    if (unsafeSmartName(alias)) {
      // The journey's privacy path refuses the update and shows the shared
      // notice; nothing unsafe is committed or stored.
      update({ aliases: [...selection.aliases, alias] }, "aliases");
      return false;
    }
    if (selection.aliases.some((item) => sameAlias(item, alias))) {
      setAliasError("Nama lain ini sudah ada.");
      return false;
    }
    if (alias.length > 160) {
      setAliasError("Setiap nama lain paling panjang 160 karakter.");
      return false;
    }
    if (selection.aliases.length >= 12) {
      setAliasError("Pilih paling banyak 12 nama lain.");
      return false;
    }
    setAliasError(null);
    update({ aliases: [...selection.aliases, alias] }, "aliases");
    return true;
  };
  const removeAlias = (index: number) => {
    setAliasError(null);
    update(
      { aliases: selection.aliases.filter((_, item) => item !== index) },
      "aliases",
    );
  };
  const gaps = requiredSmartGaps(selection);
  const optionalPresent = Boolean(
    selection.targetCustomer ||
    selection.decisionConsiderations.length ||
    selection.differentiator,
  );
  const reachLabel =
    reaches.find(([value]) => value === selection.marketReach)?.[1] ?? "";
  const areaBased =
    selection.marketReach === "sekitar" || selection.marketReach === "beberapa";

  return (
    <section
      className="w-full min-w-0 pb-10"
      data-smart-summary="ready"
      data-intake-screen="review"
    >
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ini yang akan Nuave audit
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
        <p className="type-copy break-words">{selection.name}</p>
        <p className="type-copy-sm text-muted-foreground break-all">
          {prepared.canonicalSource} · Dari Anda
        </p>
        <div className="flex flex-wrap gap-3">
          {onEditBrand ? (
            <Button variant="link" className="w-fit" onClick={onEditBrand}>
              Ubah
            </Button>
          ) : null}
          {onEditSource ? (
            <Button variant="link" className="w-fit" onClick={onEditSource}>
              Ubah website
            </Button>
          ) : null}
        </div>
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

      <Row
        title="Kebutuhan pelanggan"
        origin={rowOrigin(selection, "customerNeeds")}
      >
        <p className="type-copy break-words">
          {selection.customerNeeds.join(", ") || "Belum diisi"}
        </p>
        {onEditCustomerNeeds ? (
          <Button
            variant="link"
            className="w-fit"
            onClick={onEditCustomerNeeds}
          >
            Ubah
          </Button>
        ) : null}
      </Row>
      <Row
        title="Bisnis pembanding"
        origin={rowOrigin(selection, "comparators")}
      >
        <p className="type-copy break-words">
          {selection.comparatorMode === "named"
            ? selection.comparatorNames.join(", ") ||
              "Tambahkan nama pembanding atau pilih pilihan lain"
            : selection.comparatorMode === "category-alternatives"
              ? "Tidak ada pembanding langsung; bandingkan kategori alternatif"
              : "Belum tahu"}
        </p>
        {onEditCompetitors ? (
          <Button variant="link" className="w-fit" onClick={onEditCompetitors}>
            Ubah
          </Button>
        ) : null}
      </Row>
      <Row
        title="Fakta publik tambahan"
        origin={
          selection.publicFact.trim()
            ? rowOrigin(selection, "publicFact")
            : undefined
        }
      >
        <p className="type-copy break-words">
          {selection.publicFact || "Belum diisi"}
        </p>
        {onEditPublicFact ? (
          <Button variant="link" className="w-fit" onClick={onEditPublicFact}>
            Ubah
          </Button>
        ) : null}
      </Row>
      <Row
        title="Nama lain"
        origin={
          selection.aliases.length ? rowOrigin(selection, "aliases") : undefined
        }
      >
        <p className="type-copy break-words">
          {selection.aliases.join(", ") || "Belum diisi"}
        </p>
        <p className="type-copy-sm text-muted-foreground">
          Nama lain membantu Nuave memeriksa agar pertanyaan audit tidak
          menyebut bisnis Anda.
        </p>
        <Button
          variant="link"
          className="w-fit"
          aria-expanded={editingAliases}
          onClick={() => setEditingAliases((value) => !value)}
        >
          Ubah
        </Button>
        {editingAliases ? (
          <div ref={aliasEditorRef} className="grid min-w-0 grid-cols-1 gap-3">
            {selection.aliases.length ? (
              <ChipGroup label="Nama lain">
                {selection.aliases.map((alias, index) => (
                  <Chip
                    key={alias}
                    label={alias}
                    selected
                    onToggle={(on) => {
                      if (!on) removeAlias(index);
                    }}
                  />
                ))}
              </ChipGroup>
            ) : null}
            <AddLine
              inputLabel="Nama lain baru"
              placeholder="Tambah nama lain"
              onCommit={addAlias}
            />
            {aliasError ? (
              <p role="alert" className="type-copy-sm text-destructive">
                {aliasError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Row>
      <Row title="Detail tambahan" origin={originText.nuave}>
        <Accordion defaultValue={optionalPresent ? ["optional"] : []}>
          <AccordionItem value="optional">
            <AccordionTrigger>
              {optionalPresent ? "Periksa detail tambahan" : "Tambah detail"}
            </AccordionTrigger>
            <AccordionContent>
              <p className="type-copy-sm text-muted-foreground">Opsional</p>
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
