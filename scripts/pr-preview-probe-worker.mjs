#!/usr/bin/env node
// Probe whether a specific Cloudflare Workers script exists, for the
// PR-preview cleanup job in .github/workflows/pr-preview.yml.
//
// Absence is reported ONLY on a structured worker-not-found response from the
// exact endpoint:
//   GET https://api.cloudflare.com/client/v4/accounts/<id>/workers/scripts/<name>
//   → HTTP 404 + JSON envelope { success: false, errors: [{ code: 10007 }] }
// (10007 = "Worker or workers.dev subdomain not found" per Cloudflare's
// Workers errors documentation for the Scripts API.)
//
// A 200 whose body reads to completion means the worker exists; the body is
// the raw script and is never printed. Everything else — transport failure,
// an unreadable body, a non-JSON or generic 404, a different error code, any
// other status, or missing/malformed configuration — is "unconfirmed" so the
// cleanup job fails visibly instead of misreporting removal.

export const WORKER_NOT_FOUND_CODE = 10007;

const REQUIRED_ENV = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "WORKER_NAME",
];

const DEFAULT_API_BASE = "https://api.cloudflare.com/client/v4";

// Worker names are lowercase letters, digits, and dashes; account IDs are
// 32 hex chars. Malformed values must not be placed into the request path.
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;
const WORKER_NAME_RE = /^[a-z0-9-]+$/;

export function invalidEnv(env) {
  const invalid = [];
  for (const key of REQUIRED_ENV) if (!env[key]) invalid.push(key);
  if (
    env.CLOUDFLARE_ACCOUNT_ID &&
    !ACCOUNT_ID_RE.test(env.CLOUDFLARE_ACCOUNT_ID)
  )
    invalid.push("CLOUDFLARE_ACCOUNT_ID(format)");
  if (env.WORKER_NAME && !WORKER_NAME_RE.test(env.WORKER_NAME))
    invalid.push("WORKER_NAME(format)");
  return invalid;
}

export async function probeWorker({ env, fetchImpl = fetch }) {
  const invalid = invalidEnv(env);
  if (invalid.length) {
    return {
      evidence: "unconfirmed",
      reason: `missing or malformed env: ${invalid.join(",")}`,
    };
  }

  const base = env.CLOUDFLARE_API_BASE || DEFAULT_API_BASE;
  const url =
    `${base}/accounts/` +
    `${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${env.WORKER_NAME}`;

  let res;
  try {
    res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { evidence: "unconfirmed", reason: "transport failed" };
  }

  let body;
  try {
    body = await res.text(); // consumed fully; never emitted
  } catch {
    return {
      evidence: "unconfirmed",
      reason: `response body unreadable (HTTP ${res.status})`,
    };
  }

  if (res.status === 200) {
    return { evidence: "exists", reason: "worker script returned" };
  }

  if (res.status === 404) {
    let envelope;
    try {
      envelope = JSON.parse(body);
    } catch {
      return { evidence: "unconfirmed", reason: "404 with non-JSON body" };
    }
    const notFound =
      envelope?.success === false &&
      Array.isArray(envelope.errors) &&
      envelope.errors.some((e) => e?.code === WORKER_NOT_FOUND_CODE);
    return notFound
      ? { evidence: "absent", reason: "worker not found (10007)" }
      : {
          evidence: "unconfirmed",
          reason: "404 without worker-not-found code",
        };
  }

  return { evidence: "unconfirmed", reason: `unexpected HTTP ${res.status}` };
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url ===
    (await import("node:url")).pathToFileURL(
      (await import("node:path")).resolve(process.argv[1]),
    ).href;

if (invokedDirectly) {
  const { evidence, reason } = await probeWorker({ env: process.env });
  const lines = [`evidence=${evidence}`, `reason=${reason}`].join("\n") + "\n";
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, lines);
  } else {
    process.stdout.write(lines);
  }
}
