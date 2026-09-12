"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScopeScreen } from "../../intake/screens/ScopeScreen";
import { BranchScreen } from "../../intake/screens/BranchScreen";
import { OfferingsScreen } from "../../intake/screens/OfferingsScreen";
import { ReviewScreen } from "../../intake/screens/ReviewScreen";
import { QuestionReviewScreen } from "../../intake/screens/QuestionReviewScreen";
import type { BusinessBrief } from "@/lib/audit/types";
import type { IntakeScreen, ScopeKind } from "@/lib/audit/workflow-authority";
import { createDemoPack, createDemoState } from "./demoData";
import styles from "./demo.module.css";

const SCREENS = [
  ["scope", "Fokus audit"],
  ["branch", "Pilih lokasi"],
  ["offerings", "Produk dan layanan"],
  ["review", "Konfirmasi data"],
  ["questions", "Pertanyaan"],
] as const;
type DemoScreen = (typeof SCREENS)[number][0];
const INITIAL = createDemoState();

/** A screen workbench, not another intake controller. No requests or storage. */
export default function IntakePreviewDemo() {
  const [screen, setScreen] = useState<DemoScreen>("scope");
  const [brief, setBrief] = useState(INITIAL.brief);
  const [scopeKind, setScopeKind] = useState<ScopeKind>("whole-brand");
  const [scopeValue, setScopeValue] = useState("Kemang");
  const [pack, setPack] = useState(() => createDemoPack(INITIAL.brief));
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reviewSnapshot = useRef<{
    brief: BusinessBrief;
    scopeKind: ScopeKind;
    scopeValue: string;
  } | null>(null);

  function show(next: DemoScreen) {
    setFieldErrors({});
    setMessage("");
    if (next === "questions") setPack(createDemoPack(brief));
    setScreen(next);
  }

  function updateBrief<K extends keyof BusinessBrief>(
    key: K,
    value: BusinessBrief[K],
  ) {
    setBrief((current) => ({ ...current, [key]: value }));
    setFieldErrors({});
  }

  function back() {
    if (reviewSnapshot.current) {
      const saved = reviewSnapshot.current;
      setBrief(saved.brief);
      setScopeKind(saved.scopeKind);
      setScopeValue(saved.scopeValue);
      reviewSnapshot.current = null;
      show("review");
      return;
    }
    const index = SCREENS.findIndex(([id]) => id === screen);
    show(SCREENS[Math.max(0, index - 1)][0]);
  }

  function next() {
    if (screen === "offerings" && !brief.verified_offerings.length) {
      setFieldErrors({
        verified_offerings: "Pilih setidaknya satu produk atau layanan.",
      });
      document.getElementById("verified-offerings")?.focus();
      return;
    }
    if (reviewSnapshot.current) {
      reviewSnapshot.current = null;
      show("review");
      return;
    }
    const index = SCREENS.findIndex(([id]) => id === screen);
    show(SCREENS[Math.min(SCREENS.length - 1, index + 1)][0]);
  }

  function edit(owner: IntakeScreen) {
    if (owner === "scope" || owner === "branch" || owner === "offerings") {
      reviewSnapshot.current = { brief, scopeKind, scopeValue };
      show(owner);
    } else {
      setMessage(
        "Bagian ini akan disesuaikan pada tahap berikutnya. Pratinjau ini mencakup lima layar di atas.",
      );
    }
  }

  const shared = {
    brief,
    updateBrief,
    scopeKind,
    fieldErrors,
    customerEditedFields: [],
    busy: null,
    onContinue: next,
    onBack: back,
  };
  return (
    <main lang="id" data-theme="light">
      <aside className={styles.toolbar} aria-label="Kontrol pratinjau">
        <p className={styles.label}>
          Pratinjau lima layar · Contoh fiktif · Tanpa panggilan model AI
        </p>
        <nav className={styles.tabs} aria-label="Pilih layar pratinjau">
          {SCREENS.map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={id === screen ? "default" : "outline"}
              aria-current={id === screen ? "page" : undefined}
              onClick={() => {
                reviewSnapshot.current = null;
                show(id);
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
        {message ? (
          <p className={styles.message} role="status">
            {message}
          </p>
        ) : null}
      </aside>
      <div key={screen}>
        {screen === "scope" ? (
          <ScopeScreen
            {...shared}
            onScopeKindChange={(kind) => {
              setScopeKind(kind);
              updateBrief(
                "entity_scope",
                kind === "whole-brand"
                  ? `Seluruh brand ${brief.brand_name}`
                  : kind === "branch"
                    ? `Cabang: ${scopeValue}`
                    : "Produk: Kopi susu",
              );
            }}
          />
        ) : null}
        {screen === "branch" ? (
          <BranchScreen
            {...shared}
            scopeKind="branch"
            scopeValue={scopeValue}
            onScopeValueChange={(value) => {
              setScopeValue(value);
              setScopeKind("branch");
              updateBrief("entity_scope", `Cabang: ${value}`);
            }}
          />
        ) : null}
        {screen === "offerings" ? (
          <OfferingsScreen
            {...shared}
            preparedOfferings={INITIAL.brief.verified_offerings}
            offeringsInvalidated={false}
          />
        ) : null}
        {screen === "review" ? (
          <ReviewScreen
            {...shared}
            onNavigateToScreen={edit}
            onGenerate={() => show("questions")}
          />
        ) : null}
        {screen === "questions" ? (
          <QuestionReviewScreen
            brief={brief}
            scopeKind={scopeKind}
            busy={null}
            pack={pack}
            onBack={() => show("review")}
            onRun={() =>
              setMessage("Pratinjau selesai. Tidak ada audit yang dijalankan.")
            }
            onEdit={(index, question) =>
              setPack((current) => ({
                ...current,
                prompts: current.prompts.map((prompt, i) =>
                  i === index ? { ...prompt, question } : prompt,
                ),
              }))
            }
          />
        ) : null}
      </div>
    </main>
  );
}
