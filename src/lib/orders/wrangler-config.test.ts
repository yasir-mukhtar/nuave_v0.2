import { readFileSync } from "node:fs";
import { join } from "node:path";
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
      // Spec 017 R-17: payment settings are Worker secrets too.
      "MIDTRANS_SERVER_KEY",
      "MIDTRANS_IS_PRODUCTION",
      "NUAVE_TEST_PASS_CODE",
      "NUAVE_FOUNDER_ALERT_EMAIL",
      // Spec 018 R-26.
      "DATAFORSEO_LOGIN",
      "DATAFORSEO_PASSWORD",
    ]) {
      expect(text).not.toContain(name);
    }
  });

  it("every environment has the payment start rate limit, each with its own counter", () => {
    const environments = [config, ...Object.values(config.env ?? {})];
    const ids = environments.map(
      (environment) =>
        (
          environment.ratelimits as
            Array<{ name: string; namespace_id: string }> | undefined
        )?.find((item) => item.name === "PAYMENT_START_CALLER_RATE_LIMITER")
          ?.namespace_id,
    );
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// Spec 017 R-17, AC-20: the deploy job writes the payment settings as Worker
// secrets, and preview workers never get a real key.
describe("workflows and the payment settings", () => {
  const read = (name: string) =>
    readFileSync(join(process.cwd(), ".github/workflows", name), "utf8");

  it("the deploy job writes the payment settings as Worker secrets, with the production switch off", () => {
    const ci = read("ci.yml");
    for (const name of [
      "MIDTRANS_SERVER_KEY",
      "NUAVE_TEST_PASS_CODE",
      "NUAVE_FOUNDER_ALERT_EMAIL",
    ]) {
      expect(ci).toContain(`${name}: ${"$"}{{ secrets.${name} }}`);
      expect(ci).toMatch(new RegExp(`^\\s+${name}$`, "m"));
    }
    expect(ci).toContain('MIDTRANS_IS_PRODUCTION: "false"');
    expect(ci).toMatch(/^\s+MIDTRANS_IS_PRODUCTION$/m);
  });

  it("the deploy job writes the DataForSEO login as Worker secrets; previews get none (Spec 018 R-26)", () => {
    const ci = read("ci.yml");
    const preview = read("pr-preview.yml");
    for (const name of ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"]) {
      expect(ci).toContain(`${name}: ${"$"}{{ secrets.${name} }}`);
      expect(ci).toMatch(new RegExp(`^\\s+${name}$`, "m"));
      expect(preview).not.toContain(name);
    }
  });

  it("preview workers get no payment key, test code or alert address", () => {
    const preview = read("pr-preview.yml");
    for (const name of [
      "MIDTRANS_SERVER_KEY",
      "MIDTRANS_IS_PRODUCTION",
      "NUAVE_TEST_PASS_CODE",
      "NUAVE_FOUNDER_ALERT_EMAIL",
    ]) {
      expect(preview).not.toContain(name);
    }
  });
});
