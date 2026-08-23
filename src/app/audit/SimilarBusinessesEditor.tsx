"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { IconPlus, IconX } from "@tabler/icons-react";
import {
  INVALID_SIMILAR_BUSINESS_URL_MESSAGE,
  MAX_SIMILAR_BUSINESSES,
  isValidSimilarBusinessUrl,
  normalizeSimilarBusinessUrl,
  rebindSimilarBusinessUrl,
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
          ? rebindSimilarBusinessUrl(business, sourceUrl)
          : business,
      ),
    );
  }

  function commitEntry(index: number) {
    const business = businesses[index];
    if (!business || !isValidSimilarBusinessUrl(business.source_url)) return;
    onChange(
      businesses.map((item, businessIndex) =>
        businessIndex === index
          ? {
              ...item,
              source_url: normalizeSimilarBusinessUrl(item.source_url),
            }
          : item,
      ),
    );
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
      {businesses.map((business, index) => {
        const invalid = Boolean(
          business.source_url.trim() &&
            !isValidSimilarBusinessUrl(business.source_url),
        );
        const validationId = `similar-business-error-${index}`;
        return (
          <div className={styles.row} key={index}>
            <div className={styles.inputGroup}>
              <TextField fullWidth>
                <Label className={styles.visuallyHidden}>
                  URL bisnis serupa {index + 1}
                </Label>
                <Input
                  type="url"
                  value={business.source_url}
                  placeholder="https://contoh-bisnis.com"
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? validationId : undefined}
                  onChange={(event) => updateEntry(index, event.target.value)}
                  onBlur={() => commitEntry(index)}
                />
              </TextField>
              {invalid ? (
                <p id={validationId} className={styles.validationError} role="alert">
                  {INVALID_SIMILAR_BUSINESS_URL_MESSAGE}
                </p>
              ) : null}
            </div>
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
        );
      })}

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
