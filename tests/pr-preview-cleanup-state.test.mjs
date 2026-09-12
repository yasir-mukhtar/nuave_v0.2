import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { classifyPreviewCleanup } from "../scripts/pr-preview-cleanup-state.mjs";
import {
  invalidEnv,
  probeWorker,
  WORKER_NOT_FOUND_CODE,
} from "../scripts/pr-preview-probe-worker.mjs";

const ENV = {
  CLOUDFLARE_API_TOKEN: "test-token",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  WORKER_NAME: "nuave-pr-61",
};

const response = (status, body = "", { failBody = false } = {}) => ({
  status,
  text: async () => {
    if (failBody) throw new Error("connection reset mid-body");
    return body;
  },
});

const notFoundEnvelope = JSON.stringify({
  success: false,
  errors: [
    { code: WORKER_NOT_FOUND_CODE, message: "workers.api.error.not_found" },
  ],
});

// Full probe → classification path: the same evidence the workflow carries
// from the probe step's output into the classifier's input.
const cleanupState = async (removeOutcome, fetchImpl, env = ENV) =>
  classifyPreviewCleanup(
    removeOutcome,
    (await probeWorker({ env, fetchImpl })).evidence,
  );

describe("probeWorker", () => {
  it("reports exists only for a 200 whose body reads to completion", async () => {
    const r = await probeWorker({
      env: ENV,
      fetchImpl: async () => response(200, "addEventListener('fetch', ...)"),
    });
    expect(r).toEqual({ evidence: "exists", reason: "worker script returned" });
  });

  it("reports absent only on 404 with the worker-not-found code", async () => {
    const r = await probeWorker({
      env: ENV,
      fetchImpl: async () => response(404, notFoundEnvelope),
    });
    expect(r.evidence).toBe("absent");
  });

  it("sends the token to the exact worker endpoint", async () => {
    let seen;
    await probeWorker({
      env: ENV,
      fetchImpl: async (url, init) => {
        seen = { url, auth: init.headers.Authorization };
        return response(404, notFoundEnvelope);
      },
    });
    expect(seen.url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/workers/scripts/nuave-pr-61`,
    );
    expect(seen.auth).toBe("Bearer test-token");
  });

  it("is unconfirmed on a generic or unrelated 404", async () => {
    for (const body of [
      JSON.stringify({
        success: false,
        errors: [{ code: 7003, message: "no route" }],
      }),
      JSON.stringify({ success: false, errors: [] }),
      JSON.stringify({ success: true, result: null }),
      "{}",
      "[]",
    ]) {
      const r = await probeWorker({
        env: ENV,
        fetchImpl: async () => response(404, body),
      });
      expect(r.evidence).toBe("unconfirmed");
    }
  });

  it("is unconfirmed on a non-JSON 404", async () => {
    const r = await probeWorker({
      env: ENV,
      fetchImpl: async () => response(404, "<html>Not Found</html>"),
    });
    expect(r.evidence).toBe("unconfirmed");
  });

  it("is unconfirmed on auth, API, and rate-limit failures", async () => {
    for (const status of [400, 401, 403, 429, 500, 503]) {
      const r = await probeWorker({
        env: ENV,
        fetchImpl: async () => response(status, notFoundEnvelope),
      });
      expect(r.evidence).toBe("unconfirmed");
    }
  });

  it("is unconfirmed when transport fails before or after headers", async () => {
    const noResponse = await probeWorker({
      env: ENV,
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(noResponse.evidence).toBe("unconfirmed");

    const midBody = await probeWorker({
      env: ENV,
      fetchImpl: async () => response(200, "", { failBody: true }),
    });
    expect(midBody.evidence).toBe("unconfirmed");

    const midBody404 = await probeWorker({
      env: ENV,
      fetchImpl: async () => response(404, "", { failBody: true }),
    });
    expect(midBody404.evidence).toBe("unconfirmed");
  });

  it("is unconfirmed on missing or malformed configuration", async () => {
    expect(invalidEnv({})).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "WORKER_NAME",
    ]);
    expect(invalidEnv({ ...ENV, CLOUDFLARE_ACCOUNT_ID: "not-an-id" })).toEqual([
      "CLOUDFLARE_ACCOUNT_ID(format)",
    ]);
    expect(invalidEnv({ ...ENV, WORKER_NAME: "bad/name" })).toEqual([
      "WORKER_NAME(format)",
    ]);
    const r = await probeWorker({
      env: { ...ENV, CLOUDFLARE_API_TOKEN: "" },
      fetchImpl: async () => {
        throw new Error("must not be called");
      },
    });
    expect(r.evidence).toBe("unconfirmed");
  });
});

describe("classifyPreviewCleanup", () => {
  it("reports removed only when the wrangler delete step succeeded", () => {
    expect(classifyPreviewCleanup("success", "")).toBe("removed");
    expect(classifyPreviewCleanup("success", "exists")).toBe("removed");
    expect(classifyPreviewCleanup("success", "unconfirmed")).toBe("removed");
  });

  it("reports absent only on probe-confirmed worker absence", () => {
    expect(classifyPreviewCleanup("failure", "absent")).toBe("absent");
  });

  it("fails visibly on a live worker, unconfirmed probe, or missing input", () => {
    for (const evidence of ["exists", "unconfirmed", "", "404", "not found"]) {
      expect(classifyPreviewCleanup("failure", evidence)).toBe("failed");
    }
    for (const outcome of ["skipped", "cancelled", ""]) {
      expect(classifyPreviewCleanup(outcome, "")).toBe("failed");
      expect(classifyPreviewCleanup(outcome, "absent")).toBe("absent");
    }
  });
});

describe("classifier CLI", () => {
  const run = (env) =>
    execFileSync(process.execPath, ["scripts/pr-preview-cleanup-state.mjs"], {
      env: { PATH: process.env.PATH, ...env, GITHUB_OUTPUT: "" },
      encoding: "utf8",
    }).trim();

  it("writes result=removed / absent / failed from env inputs", () => {
    expect(run({ REMOVE_OUTCOME: "success" })).toBe("result=removed");
    expect(run({ REMOVE_OUTCOME: "failure", PROBE_EVIDENCE: "absent" })).toBe(
      "result=absent",
    );
    expect(
      run({ REMOVE_OUTCOME: "failure", PROBE_EVIDENCE: "unconfirmed" }),
    ).toBe("result=failed");
    expect(run({ REMOVE_OUTCOME: "failure" })).toBe("result=failed");
  });
});

describe("probe → classification path (mocked request)", () => {
  it("removed: successful delete short-circuits the probe", async () => {
    expect(await cleanupState("success", async () => response(200, ""))).toBe(
      "removed",
    );
  });

  it("absent: failed delete + worker-not-found probe", async () => {
    expect(
      await cleanupState("failure", async () =>
        response(404, notFoundEnvelope),
      ),
    ).toBe("absent");
  });

  it("failed: existing worker, generic 404, non-JSON, and transport failures", async () => {
    const cases = [
      response(200, "script"),
      response(404, JSON.stringify({ success: false, errors: [{ code: 1 }] })),
      response(404, "not json"),
      response(401, ""),
      response(500, ""),
      response(200, "", { failBody: true }),
    ];
    for (const res of cases) {
      expect(await cleanupState("failure", async () => res)).toBe("failed");
    }
    expect(
      await cleanupState("failure", async () => {
        throw new Error("network down");
      }),
    ).toBe("failed");
  });
});

describe("CLI boundary: probe + classifier against a stub API", () => {
  const dir = mkdtempSync(join(tmpdir(), "nuave-probe-"));
  let server;
  let stub = () => ({ status: 404, body: notFoundEnvelope });

  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const startServer = () =>
    new Promise((resolve) => {
      server = createServer((req, res) => {
        const { status, body } = stub(req);
        res.writeHead(status, { "content-type": "application/json" });
        res.end(body);
      }).listen(0, "127.0.0.1", () => resolve(server.address().port));
    });

  const runCli = async (over = {}) => {
    const port = await startServer();
    const out = join(dir, `out-${Math.random()}`);
    writeFileSync(out, "");
    // execFileSync would freeze this process's event loop and deadlock the
    // stub server; async spawn keeps it serving while the child probes.
    await promisify(execFile)(
      process.execPath,
      ["scripts/pr-preview-probe-worker.mjs"],
      {
        env: {
          PATH: process.env.PATH,
          GITHUB_OUTPUT: out,
          CLOUDFLARE_API_BASE: `http://127.0.0.1:${port}`,
          ...ENV,
          ...over,
        },
      },
    );
    server.close();
    return Object.fromEntries(
      readFileSync(out, "utf8")
        .trim()
        .split("\n")
        .map((l) => l.split("=")),
    );
  };

  it("writes evidence=absent for a structured worker-not-found", async () => {
    stub = (req) => {
      expect(req.url).toBe(
        `/accounts/${"a".repeat(32)}/workers/scripts/nuave-pr-61`,
      );
      expect(req.headers.authorization).toBe("Bearer test-token");
      return { status: 404, body: notFoundEnvelope };
    };
    const outputs = await runCli();
    expect(outputs.evidence).toBe("absent");
    expect(classifyPreviewCleanup("failure", outputs.evidence)).toBe("absent");
  });

  it("writes evidence=exists for a live worker", async () => {
    stub = () => ({ status: 200, body: "export default {fetch(){}}" });
    const outputs = await runCli();
    expect(outputs.evidence).toBe("exists");
    expect(classifyPreviewCleanup("failure", outputs.evidence)).toBe("failed");
  });

  it("writes evidence=unconfirmed on malformed configuration", async () => {
    const outputs = await runCli({ CLOUDFLARE_API_TOKEN: "" });
    expect(outputs.evidence).toBe("unconfirmed");
    expect(outputs.reason).toContain("CLOUDFLARE_API_TOKEN");
    expect(classifyPreviewCleanup("failure", outputs.evidence)).toBe("failed");
  });
});
