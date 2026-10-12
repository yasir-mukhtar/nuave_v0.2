import { describe, expect, it } from "vitest";
import { readWranglerConfig } from "./wrangler-config.test-helper";

// Spec 016 R-14, AC-11: only the production worker has a cron, and previews
// have their own database. These read the real wrangler.jsonc.

const config = readWranglerConfig();

describe("wrangler.jsonc environments", () => {
  it("production has one cron trigger, every minute, through the custom entry", () => {
    expect(config.main).toBe("worker.mjs");
    expect(config.triggers?.crons).toEqual(["* * * * *"]);
    expect(config.vars?.NUAVE_ENVIRONMENT).toBe("production");
    expect(config.vars?.NUAVE_SITE_URL).toBe("https://v2.nuave.ai");
  });

  it("no preview or local environment has a cron, and each says so explicitly", () => {
    const names = Object.keys(config.env ?? {});
    expect(names).toEqual(expect.arrayContaining(["preview", "dev"]));
    for (const name of names) {
      // `crons: []` is explicit: an environment that omitted `triggers` could
      // inherit the production cron.
      expect(config.env?.[name]?.triggers?.crons, name).toEqual([]);
    }
  });

  it("previews have their own database and their own environment label", () => {
    const preview = config.env?.preview;
    const production = config.d1_databases?.[0];
    expect(preview?.vars?.NUAVE_ENVIRONMENT).toBe("preview");
    expect(preview?.d1_databases).toHaveLength(1);
    const previewDb = preview!.d1_databases![0];
    expect(previewDb.binding).toBe("SPEND_DB");
    expect(previewDb.database_name).toBe("nuave-v2-preview");
    expect(previewDb.database_id).not.toBe(production?.database_id);
    // The founder created nuave-v2-preview on 2026-10-12 (Q5).
    expect(previewDb.database_id).toBe("5613a4a7-7a86-432a-810c-7ccef7e80a25");
  });

  it("every environment applies the same migration folder", () => {
    for (const environment of [config, ...Object.values(config.env ?? {})]) {
      expect(environment.d1_databases?.[0]?.migrations_dir).toBe("migrations");
    }
  });

  it("no secret or list is written in wrangler.jsonc", () => {
    const text = JSON.stringify(config);
    for (const name of [
      "NUAVE_ORDER_EMAIL_ALLOWLIST",
      "RESEND_API_KEY",
      "NUAVE_MAIL_FROM",
      "OPENAI_API_KEY",
      "CHEAPERINFERENCE_API_KEY",
      "NUAVE_AUDIT_MODE",
      "NUAVE_NEW_AUDIT_ENABLED",
    ]) {
      expect(text).not.toContain(name);
    }
  });
});
