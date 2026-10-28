#!/usr/bin/env node
// Founder support commands for orders (spec 016 R-32):
//
//   npm run support -- resend <order>           a new link, old one stops
//   npm run support -- off <order>              switch the link off
//   npm run support -- show <order> [--email]
//
// <order> is the internal order ID, the order number (NV-7K3Q9P) or a Midtrans
// order_id (NV-7K3Q9P-2). Spec 017 (R-24) adds:
//
//   npm run support -- refunds                  every open refund case
//   npm run support -- refunded <transaction-id>  a refund made outside Midtrans
//   npm run support -- close <midtrans-order-id> <unknown|unpaid>
//
// and, for the record cleanup (orders/retention.ts):
//
//   npm run support -- hold <order> <days>      keep it past its lifetime (0 releases)
//
// and (founder decision 2026-10-25):
//
//   npm run support -- email <order> <new-email>   fix a mistyped email (after
//                                                  checking the receipt); a new
//                                                  link goes to the new address
//   npm run support -- norefund <order> <declined|delivered|settled>
//                                                  close a refund case, no refund
//
// and (spec 021 A-08):
//
//   npm run support -- export <order>           the report's evidence JSON, saved
//                                               to the git-ignored .local-evidence/
//
// It reads and writes the production D1 database through `wrangler d1 execute
// --remote` (add `--local` to use the local development database instead), and
// sends mail with the founder's Resend key, read from the git-ignored file
// `.secrets/resend-api-key` (the from address from `.secrets/resend-from`).
// It prints no secret. The logic is in src/lib/orders/support.ts, which the
// tests run on a test database with a fake sender.
//
// Needs `npm ci` and a Cloudflare login (`npx wrangler login`) or a
// CLOUDFLARE_API_TOKEN with D1 edit permission, in the founder's own shell.

import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const local = args.includes("--local");

// Bundle the TypeScript logic with the repository's own esbuild (no new
// dependency), the way the verify-nuave skill does.
const outfile = join(root, "node_modules", ".cache", "support", "support.mjs");
await require("esbuild").build({
  entryPoints: [join(root, "src", "lib", "orders", "support.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  logLevel: "error",
});
const mailOutfile = join(root, "node_modules", ".cache", "support", "mail.mjs");
await require("esbuild").build({
  entryPoints: [join(root, "src", "lib", "orders", "mail.ts")],
  outfile: mailOutfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  logLevel: "error",
});
const { runSupport, d1ThroughWrangler } = await import(
  pathToFileURL(outfile).href
);
const { resendMailSender } = await import(pathToFileURL(mailOutfile).href);

function wranglerExecute(sql) {
  return new Promise((resolveRun, rejectRun) => {
    execFile(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "SPEND_DB",
        local ? "--local" : "--remote",
        ...(local ? ["--env", "dev"] : []),
        "--json",
        "--command",
        sql,
      ],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          // The statement holds no email and no secret, but print only a
          // short reason, never the command line.
          rejectRun(
            new Error(
              `wrangler d1 execute failed: ${String(stderr).split("\n")[0]}`,
            ),
          );
          return;
        }
        try {
          resolveRun(JSON.parse(stdout));
        } catch {
          rejectRun(new Error("wrangler d1 execute gave an unreadable answer"));
        }
      },
    );
  });
}

function readSecretFile(name) {
  try {
    const value = readFileSync(join(root, ".secrets", name), "utf8").trim();
    return value || null;
  } catch {
    return null;
  }
}

function siteOrigin() {
  const config = JSON.parse(
    readFileSync(join(root, "wrangler.jsonc"), "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1"),
  );
  return new URL(
    local
      ? (config.env?.dev?.vars?.NUAVE_SITE_URL ?? "")
      : (config.vars?.NUAVE_SITE_URL ?? ""),
  ).origin;
}

try {
  process.exitCode = await runSupport(
    args.filter((arg) => arg !== "--local"),
    {
      db: d1ThroughWrangler(wranglerExecute),
      siteOrigin: siteOrigin(),
      now: () => new Date(),
      out: (line) => console.log(line),
      async saveEvidence(fileName, text) {
        const folder = join(root, ".local-evidence");
        mkdirSync(folder, { recursive: true });
        const path = join(folder, fileName);
        writeFileSync(path, text, { mode: 0o600 });
        return path;
      },
      async makeSender() {
        const apiKey = readSecretFile("resend-api-key");
        const from = readSecretFile("resend-from");
        if (!apiKey || !from) {
          throw new Error(
            "Put the Resend key in .secrets/resend-api-key and the from address in .secrets/resend-from (both are git-ignored).",
          );
        }
        return resendMailSender({ apiKey, from });
      },
    },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "support failed");
  process.exitCode = 1;
}
