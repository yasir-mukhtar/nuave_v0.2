"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { IconCheck } from "@tabler/icons-react";
import Spec004Hero from "./Spec004Hero";
import type {
  AuditBudget,
  AuditCallTelemetry,
  ExtractionDraft,
} from "@/lib/audit/types";
import styles from "./spec004.module.css";

type DemoDraft = {
  url: string;
  draft: ExtractionDraft;
};

type DemoBudget = Pick<AuditBudget, "limit_usd" | "carryover_cost_usd">;

const SESSION_KEY = "nuave-spec-004-hero-demo";

function sessionIdentifier() {
  if (typeof window === "undefined") return "nuave-hero-demo-placeholder";
  const saved = window.sessionStorage.getItem(SESSION_KEY);
  if (saved) return saved;
  const value = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, value);
  return value;
}

export default function Spec004Demo() {
  const [budget, setBudget] = useState<DemoBudget | null>(null);
  const [budgetReady, setBudgetReady] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DemoDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/audit/extract", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as Partial<AuditBudget> & {
          error?: string;
        };
        if (
          !response.ok ||
          typeof data.limit_usd !== "number" ||
          typeof data.carryover_cost_usd !== "number"
        ) {
          throw new Error(data.error || "Pengendali biaya privat tidak valid.");
        }
        if (!cancelled) {
          setBudget({
            limit_usd: data.limit_usd,
            carryover_cost_usd: data.carryover_cost_usd,
          });
          setBudgetReady(true);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Pengendali biaya privat tidak tersedia.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExtract(normalizedUrl: string) {
    setError("");
    if (!budgetReady || !budget) {
      setError("Tunggu pengendali biaya privat sebelum memulai.");
      return;
    }
    setExtracting(true);
    try {
      const response = await fetch("/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: normalizedUrl,
          brand_name: "",
          market_context: "",
          category: "",
          safety_identifier: sessionIdentifier(),
          budget: { ...budget, calls: [] as AuditCallTelemetry[] },
        }),
      });
      const data = (await response.json()) as {
        draft?: ExtractionDraft;
        error?: string;
      };
      if (!response.ok || !data.draft) {
        throw new Error(
          data.error ||
            "Kami tidak dapat menganalisis sumber ini. Periksa kembali linknya atau coba situs resmi lainnya.",
        );
      }
      setResult({ url: normalizedUrl, draft: data.draft });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kami tidak dapat menganalisis sumber ini.",
      );
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
  }

  return (
    <div className={styles.demo}>
      <header className={styles.demoHeader}>
        <Image
          src="/logo-nuave-horizontal.png"
          width={152}
          height={48}
          priority
          alt="Nuave"
        />
        <p className={styles.demoNote}>
          Pratinjau layar intake Spec 004. Klik {`"Mulai ulang"`} untuk mencoba
          lagi.
        </p>
      </header>

      {result ? (
        <div className={styles.demoResult}>
          <div className={styles.demoResultCard}>
            <div className={styles.demoResultHead}>
              <IconCheck />
              Draf bisnis siap
            </div>
            <dl className={styles.demoResultRow}>
              <dt>Sumber</dt>
              <dd>{result.url}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Nama bisnis</dt>
              <dd>{result.draft.brand_name || "—"}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Cabang atau area layanan</dt>
              <dd>{result.draft.entity_scope || "—"}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Kategori</dt>
              <dd>{result.draft.category || "—"}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Lokasi atau pasar</dt>
              <dd>{result.draft.market_context || "—"}</dd>
            </dl>
          </div>
          <Button variant="secondary" onPress={reset}>
            Mulai ulang
          </Button>
        </div>
      ) : (
        <Spec004Hero
          initialValue=""
          extracting={extracting}
          error={error}
          onExtract={handleExtract}
        />
      )}
    </div>
  );
}
