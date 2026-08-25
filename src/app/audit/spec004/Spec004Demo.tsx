"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { IconCheck } from "@tabler/icons-react";
import Spec004Hero from "./Spec004Hero";
import styles from "./spec004.module.css";

type DemoDraft = {
  url: string;
  brandName: string;
  entityScope: string;
  category: string;
  marketContext: string;
};

const OFFLINE_FIXTURE = {
  brandName: "Kopi Taman Senja",
  entityScope: "Satu bisnis contoh",
  category: "Kedai kopi",
  marketContext: "Depok, Indonesia",
} as const;

export default function Spec004Demo() {
  const [result, setResult] = useState<DemoDraft | null>(null);

  function handleExtract(normalizedUrl: string) {
    setResult({ url: normalizedUrl, ...OFFLINE_FIXTURE });
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
          Pratinjau offline Spec 004. Tidak ada permintaan API atau provider
          yang dijalankan dari halaman ini.
        </p>
      </header>

      {result ? (
        <div className={styles.demoResult}>
          <div className={styles.demoResultCard}>
            <div className={styles.demoResultHead}>
              <IconCheck />
              Contoh draf bisnis
            </div>
            <dl className={styles.demoResultRow}>
              <dt>Sumber yang dimasukkan</dt>
              <dd>{result.url}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Nama bisnis contoh</dt>
              <dd>{result.brandName}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Ruang lingkup contoh</dt>
              <dd>{result.entityScope}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Kategori contoh</dt>
              <dd>{result.category}</dd>
            </dl>
            <dl className={styles.demoResultRow}>
              <dt>Lokasi atau pasar contoh</dt>
              <dd>{result.marketContext}</dd>
            </dl>
          </div>
          <Button variant="secondary" onPress={() => setResult(null)}>
            Mulai ulang
          </Button>
        </div>
      ) : (
        <Spec004Hero
          initialValue=""
          extracting={false}
          error=""
          onExtract={handleExtract}
        />
      )}
    </div>
  );
}
