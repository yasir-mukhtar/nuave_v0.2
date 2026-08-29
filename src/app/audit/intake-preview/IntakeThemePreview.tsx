"use client";

import { useState } from "react";
import type { BusinessBrief } from "@/lib/audit/types";
import { BriefStep } from "../AuditStages";
import styles from "../audit.module.css";

const previewBrief: BusinessBrief = {
  brand_name: "Kopi Taman Senja",
  entity_scope: "Kedai kopi dan penjualan biji kopi",
  brand_type: "Bisnis lokal",
  category: "Specialty coffee shop",
  market_context: "Jakarta, Indonesia",
  target_customer:
    "Pekerja dan pecinta kopi di Jakarta yang mencari kopi specialty untuk diminum di tempat atau dibawa pulang.",
  official_sources: ["https://example.com"],
  verified_offerings: [
    "Kopi espresso dan manual brew",
    "Biji kopi roasted",
    "Minuman non-kopi",
  ],
  verified_customer_needs: [
    "Tempat nyaman untuk bekerja atau bertemu",
    "Kopi specialty dengan rasa konsisten",
  ],
  verified_decision_criteria: [
    "Kualitas kopi",
    "Lokasi dan kenyamanan tempat",
    "Harga",
  ],
  verified_competitor: { name: "", scope: "", source_url: "" },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "Kunjungi kedai",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

export default function IntakeThemePreview() {
  const [brief, setBrief] = useState<BusinessBrief>(previewBrief);
  const [factsConfirmed, setFactsConfirmed] = useState(false);

  function updateBrief<K extends keyof BusinessBrief>(
    key: K,
    value: BusinessBrief[K],
  ) {
    setBrief((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className={styles.shell} lang="id" data-theme="light">
      <BriefStep
        brief={brief}
        updateBrief={updateBrief}
        extraction={null}
        factsConfirmed={factsConfirmed}
        setFactsConfirmed={setFactsConfirmed}
        busy={null}
        onGenerate={() => undefined}
        onBack={() => undefined}
        onLogo={() => undefined}
      />
    </main>
  );
}
