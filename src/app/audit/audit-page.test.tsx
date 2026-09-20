import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INTAKE_FIXTURES } from "@/lib/intake/fixtures";
import AuditIntakeClient from "./audit-intake.client";
import AuditPage from "./page";
import NewIntakeRedirectPage from "./new-intake/page";

/**
 * Spec 010 R-08 page wiring: the server gate owns availability and mode;
 * harness parameters only exist for the synthetic test path.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

function props(element: unknown): Record<string, unknown> {
  return (element as { props: Record<string, unknown> }).props;
}

describe("/audit entry (Spec 010 R-08)", () => {
  it("renders the unavailable state while the switch is off", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "");
    const element = await AuditPage({
      searchParams: Promise.resolve({ fixture: "GLM", glm: "1" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Audit tidak tersedia saat ini.");
    expect(html).not.toContain("data-new-intake-shell");
  });

  it("live mode ignores every harness parameter and starts blank on the GLM path", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const element = await AuditPage({
      searchParams: Promise.resolve({
        fixture: "GLM",
        glm: "0",
        failure: "questions",
        "glm-stub": "malformed",
      }),
    });
    expect(element.type).toBe(AuditIntakeClient);
    expect(props(element)).toMatchObject({
      fixture: undefined,
      blank: true,
      live: true,
      glmExperiment: true,
      failQuestionsOnce: false,
      glmStubBehavior: undefined,
    });
  });

  it("synthetic mode keeps the fixture harness parameters", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const element = await AuditPage({
      searchParams: Promise.resolve({
        fixture: "GLM",
        glm: "1",
        failure: "questions",
        "glm-stub": "timeout",
      }),
    });
    expect(props(element).fixture).toBe(INTAKE_FIXTURES.GLM);
    expect(props(element)).toMatchObject({
      blank: false,
      live: false,
      glmExperiment: true,
      failQuestionsOnce: true,
      glmStubBehavior: "timeout",
    });
  });

  it("synthetic mode without a fixture parameter starts blank too", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const element = await AuditPage({ searchParams: Promise.resolve({}) });
    expect(props(element)).toMatchObject({
      blank: true,
      live: false,
      glmExperiment: false,
    });
  });

  it("a mistyped mode stays synthetic — the failure-safe direction", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
    vi.stubEnv("NUAVE_AUDIT_MODE", "livve");
    const element = await AuditPage({ searchParams: Promise.resolve({}) });
    expect(props(element)).toMatchObject({ live: false, blank: true });
  });

  it("renders the blank journey on the empty business step", async () => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const element = await AuditPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('data-new-intake-shell="s-brand-fix"');
    expect(html).toContain("Nama brand");
    expect(html).toContain("Sumber bisnis");
    expect(html).toContain("Versi uji coba");
  });
});

describe("/audit/new-intake redirect (Spec 010 R-08)", () => {
  async function redirectDigest(search: Record<string, string>) {
    const error = (await NewIntakeRedirectPage({
      searchParams: Promise.resolve(search),
    }).catch((cause) => cause)) as { digest?: string };
    expect(error.digest).toContain("NEXT_REDIRECT");
    return error.digest ?? "";
  }

  it("redirects to /audit and forwards the harness query", async () => {
    expect(await redirectDigest({ fixture: "GLM", glm: "1" })).toContain(
      "/audit?fixture=GLM&glm=1",
    );
  });

  it("redirects to /audit without parameters", async () => {
    expect(await redirectDigest({})).toContain("/audit;");
  });
});
