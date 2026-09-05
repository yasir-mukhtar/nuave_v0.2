import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IntakeJourney from "./IntakeJourney";
import { INTAKE_SCREEN_ORDER } from "./screens";

/**
 * Architectural guard for the isolated new intake module (plan §5 + §4.8).
 *
 * Fails if the new module or its preview entry references legacy intake
 * renderers/styles or any per-screen surface flag. Only `.ts`/`.tsx` source
 * is scanned — `README.md` is prose documentation and is excluded.
 */

const GUARDED_FILES = [
  new URL("./screens.ts", import.meta.url),
  new URL("./IntakeJourney.tsx", import.meta.url),
  new URL("./IntakeFixturePlaceholder.tsx", import.meta.url),
  new URL("./navigation.ts", import.meta.url),
  new URL("./fixtures.ts", import.meta.url),
  new URL("./events.ts", import.meta.url),
  new URL("./screens-bab1.tsx", import.meta.url),
  new URL("./screens-bab2.tsx", import.meta.url),
  new URL("./arrival.tsx", import.meta.url),
  new URL("../../app/audit/new-intake/page.tsx", import.meta.url),
  new URL(
    "../../app/audit/new-intake/intake-screens.client.tsx",
    import.meta.url,
  ),
];

/** Interactive screen files: must render in the App Router, not crash it. */
const CLIENT_COMPONENT_FILES = [
  new URL("./IntakeJourney.tsx", import.meta.url),
  new URL("./IntakeFixturePlaceholder.tsx", import.meta.url),
  new URL("./screens-bab1.tsx", import.meta.url),
  new URL("./screens-bab2.tsx", import.meta.url),
  new URL("./arrival.tsx", import.meta.url),
];

/** Legacy renderers, legacy styles, and per-screen surface-flag mechanism. */
const BANNED_TOKENS = [
  // Legacy intake presentation (must never be imported or rendered).
  "AuditWorkflow",
  "AuditStages",
  "SourceHero",
  "AuditPrePaymentJourney",
  "B1BriefStep",
  "LandingAuditHero",
  // Legacy intake styles.
  "audit.module.css",
  "tweakcn-intake.css",
  // Recovery-branch per-screen old/new flag mechanism (plan §5 prohibits it).
  "intakeSurface",
  "IntakeSurface",
  "PRODUCTION_INTAKE_SURFACE",
  "PREVIEW_INTAKE_SURFACE",
  "intake-preview",
  "intakeSurface.ts",
];

const IMPORT_SPECIFIER_PATTERN = /from\s+["']([^"']+)["']/g;

/** Import sources the new module is allowed to use. */
function isAllowedImportSpecifier(specifier: string): boolean {
  return (
    specifier === "react" ||
    specifier === "next" ||
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier === "@/lib/intake/IntakeJourney" ||
    specifier.startsWith("@/lib/intake/")
  );
}

/** Canonical order (screens.ts; s-service added by handoff 2026-09-05). */
const EXPECTED_SCREEN_ORDER = [
  "s-crawl",
  "s-brand",
  "s-brand-fix",
  "s-scope",
  "s-branch",
  "s-product",
  "s-category",
  "s-offerings",
  "s-customers",
  "s-service",
  "s-market",
  "s-competitors",
  "s-facts",
  "s-review",
  "s-questions",
];

describe("new intake isolation guard", () => {
  it("contains no legacy renderer, legacy style, or per-screen surface flag", () => {
    for (const file of GUARDED_FILES) {
      const source = readFileSync(file, "utf8");
      for (const token of BANNED_TOKENS) {
        expect(
          source.includes(token),
          `${file.pathname} must not reference legacy/per-screen token "${token}"`,
        ).toBe(false);
      }
    }
  });

  it("only imports from the new module, React, or Next", () => {
    for (const file of GUARDED_FILES) {
      const source = readFileSync(file, "utf8");
      const specifiers = [...source.matchAll(IMPORT_SPECIFIER_PATTERN)].map(
        (match) => match[1],
      );
      for (const specifier of specifiers) {
        expect(
          isAllowedImportSpecifier(specifier),
          `${file.pathname} has disallowed import "${specifier}"`,
        ).toBe(true);
      }
    }
  });

  it("pins the canonical prototype screen order", () => {
    expect([...INTAKE_SCREEN_ORDER]).toEqual(EXPECTED_SCREEN_ORDER);
  });

  it("renders the empty new entry inside the new shell, never legacy UI", () => {
    const html = renderToStaticMarkup(createElement(IntakeJourney, {}));
    expect(html).toContain("data-new-intake-shell");
    expect(html).toContain("data-new-intake-placeholder");
    for (const token of BANNED_TOKENS) {
      expect(
        html.includes(token),
        `rendered shell must not contain legacy/per-screen token "${token}"`,
      ).toBe(false);
    }
  });

  it("falls back to the first screen for unknown ids without legacy fallthrough", () => {
    const html = renderToStaticMarkup(
      createElement(IntakeJourney, { initialScreenId: "s-does-not-exist" }),
    );
    expect(html).toContain('data-new-intake-shell="s-crawl"');
  });

  it("marks every hook-using screen file as a client component", () => {
    const hookImport =
      /import\s*\{[^}]*\buse[A-Z]\w*\b[^}]*\}\s*from\s*["']react["']/;
    for (const file of CLIENT_COMPONENT_FILES) {
      const source = readFileSync(file, "utf8");
      if (!hookImport.test(source)) continue;
      expect(
        source.startsWith('"use client";'),
        `${file.pathname} uses React hooks so it must start with "use client"; or the App Router crashes the preview`,
      ).toBe(true);
    }
  });
});
