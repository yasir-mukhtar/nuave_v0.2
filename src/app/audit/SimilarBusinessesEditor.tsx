"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { IconPlus, IconX } from "@tabler/icons-react";
import {
  MAX_SIMILAR_BUSINESSES,
  normalizeSimilarBusinessUrl,
  normalizeSimilarBusinesses,
} from "@/lib/audit/similar-businesses";
import type { SimilarBusiness } from "@/lib/audit/types";
import styles from "./SimilarBusinessesEditor.module.css";

export default function SimilarBusinessesEditor({
  businesses,
  onChange,
}: {
  businesses: SimilarBusiness[];
  onChange: (businesses: SimilarBusiness[]) => void;
}) {
  function updateEntry(index: number, sourceUrl: string) {
    onChange(
      businesses.map((business, businessIndex) =>
        businessIndex === index
          ? { ...business, source_url: sourceUrl, origin: "user" }
          : business,
      ),
    );
  }

  function commitEntry(index: number) {
    const next = businesses.map((business, businessIndex) =>
      businessIndex === index
        ? {
            ...business,
            source_url: normalizeSimilarBusinessUrl(business.source_url),
          }
        : business,
    );
    onChange(normalizeSimilarBusinesses(next));
  }

  function removeEntry(index: number) {
    onChange(businesses.filter((_, businessIndex) => businessIndex !== index));
  }

  function addEntry() {
    if (businesses.length >= MAX_SIMILAR_BUSINESSES) return;
    onChange([...businesses, { source_url: "", origin: "user" as const }]);
  }

  return (
    <div className={styles.root}>
      {businesses.map((business, index) => (
        <div className={styles.row} key={index}>
          <TextField fullWidth>
            <Label className={styles.visuallyHidden}>
              URL bisnis serupa {index + 1}
            </Label>
            <Input
              type="url"
              value={business.source_url}
              placeholder="https://contoh-bisnis.com"
              onChange={(event) => updateEntry(index, event.target.value)}
              onBlur={() => commitEntry(index)}
            />
          </TextField>
          {business.origin === "ai" && business.source_url ? (
            <span className={styles.aiBadge}>Saran Nuave</span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className={styles.removeButton}
            aria-label={`Hapus bisnis serupa ${index + 1}`}
            onPress={() => removeEntry(index)}
          >
            <IconX />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        className={styles.addButton}
        isDisabled={businesses.length >= MAX_SIMILAR_BUSINESSES}
        onPress={addEntry}
      >
        <IconPlus />
        <span>Tambah bisnis serupa</span>
      </Button>
      <p className={styles.hint}>
        Website, profil Instagram, atau Google Business Profile. Opsional,
        maksimal {MAX_SIMILAR_BUSINESSES} bisnis.
      </p>
    </div>
  );
}
