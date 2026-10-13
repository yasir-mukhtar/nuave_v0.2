"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Screens 3 and 3a of the order flow (spec 016). Screen 3 is the FREE brand
 * check: it shows only what the free lookup found, and no AI has run. Screen 3a
 * is the order summary: the business, what the report includes, and the email
 * the report link goes to. No price, no payment. Wording is the draft that S5
 * finalizes.
 */

const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

const ORIGIN_TEXT = {
  website: "Dari website Anda",
  owner: "Dari Anda",
} as const;

function brandInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase());
  return letters.join("") || "?";
}

export type FreeBrand = { name: string; origin: "owner" | "website" };

export function FreeBrandScreen({
  headingRef,
  typedName,
  discoveredName,
  source,
  brand,
  editing,
  onToggleEditing,
  onChange,
  error,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  typedName: string;
  discoveredName: string | null;
  source: string;
  brand: FreeBrand;
  editing: boolean;
  onToggleEditing: () => void;
  onChange: (brand: FreeBrand) => void;
  error: string | null;
}) {
  return (
    <section className="grid gap-5" data-intake-screen="brand">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ini brand yang ingin Anda audit?
      </h1>
      <article
        className="flex items-center gap-4 rounded-xl border border-border p-5"
        aria-label="Brand yang ditemukan"
      >
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border border-border type-heading-sm"
          aria-hidden="true"
        >
          {brandInitials(brand.name)}
        </span>
        <div className="min-w-0">
          <h2 className="type-heading-sm m-0 break-words">{brand.name}</h2>
          <p className="type-copy-sm m-0 mt-1 break-all text-muted-foreground">
            {source} · {ORIGIN_TEXT[brand.origin]}
          </p>
        </div>
      </article>
      <div role="radiogroup" aria-label="Nama bisnis" className="grid gap-1">
        {/* Started from the landing hero, only the website is known: there is
            no typed name to offer. */}
        {typedName ? (
          <label className="flex min-h-11 items-center gap-3 type-copy">
            <input
              type="radio"
              name="smart-brand-name"
              checked={brand.name === typedName && brand.origin === "owner"}
              onChange={() => onChange({ name: typedName, origin: "owner" })}
            />
            {typedName}{" "}
            <span className="type-copy-sm text-muted-foreground">
              Dari Anda
            </span>
          </label>
        ) : null}
        {discoveredName && discoveredName !== typedName ? (
          <label className="flex min-h-11 items-center gap-3 type-copy">
            <input
              type="radio"
              name="smart-brand-name"
              checked={
                brand.name === discoveredName && brand.origin === "website"
              }
              onChange={() =>
                onChange({ name: discoveredName, origin: "website" })
              }
            />
            {discoveredName}{" "}
            <span className="type-copy-sm text-muted-foreground">
              Dari website Anda
            </span>
          </label>
        ) : null}
      </div>
      <div>
        <Button variant="link" className="w-fit" onClick={onToggleEditing}>
          Ubah nama
        </Button>
        {editing ? (
          <label className="mt-2 grid gap-2 type-label">
            Nama brand
            <Input
              value={brand.name}
              maxLength={160}
              onChange={(event) =>
                onChange({ name: event.target.value, origin: "owner" })
              }
            />
          </label>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="type-copy text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function OrderScreen({
  headingRef,
  businessName,
  website,
  hasOrder,
  email,
  onEmailChange,
  busy,
  notice,
  error,
  live,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  businessName: string;
  website: string;
  /** An order for this business and website is already open. */
  hasOrder: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  busy: boolean;
  notice: string | null;
  error: string | null;
  live: boolean;
}) {
  return (
    <section className="grid gap-5" data-intake-screen="order" aria-busy={busy}>
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Ringkasan pesanan
      </h1>
      {notice ? (
        <p role="status" className="type-copy-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      <article
        className="rounded-xl border border-border p-5"
        aria-label="Bisnis yang diaudit"
      >
        <h2 className="type-heading-sm m-0 break-words">{businessName}</h2>
        <p className="type-copy-sm m-0 mt-1 break-all text-muted-foreground">
          {website}
        </p>
      </article>
      <div className="grid gap-2">
        <h2 className="type-heading-sm m-0">Isi laporan</h2>
        <ul className="type-copy m-0 grid list-disc gap-1 pl-5">
          <li>
            Jawaban AI untuk sepuluh pertanyaan konsumen yang Anda setujui.
          </li>
          <li>Ringkasan temuan dan tindakan yang didukung bukti.</li>
          <li>Dikirim ke email Anda lewat link pribadi.</li>
        </ul>
      </div>
      {hasOrder ? (
        <p role="status" className="type-copy">
          Pesanan Anda sudah dibuat. Tekan Lanjut untuk meneruskan.
        </p>
      ) : (
        <label className="grid gap-2 type-label">
          Email untuk link laporan
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            maxLength={254}
            aria-invalid={Boolean(error)}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <span className="type-copy-sm font-normal text-muted-foreground">
            Kami memakai email ini untuk mengirim link laporan.
          </span>
        </label>
      )}
      {error ? (
        <p role="alert" className="type-copy text-destructive">
          {error}
        </p>
      ) : null}
      {!live ? (
        <p className="type-copy-sm text-muted-foreground">{SYNTHETIC_LABEL}</p>
      ) : null}
    </section>
  );
}
