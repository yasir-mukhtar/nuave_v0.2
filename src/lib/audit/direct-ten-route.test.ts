import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "./direct-ten-context-v2";

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExecuteAuditPrompt: vi.fn(),
  liveGenerateReportContent: vi.fn(),
  isLiveProviderCall: vi.fn(() => false),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);
// Spec 016: question writing needs an open order. The order and ledger
// mechanics are tested in orders/*.test.ts; here the order is a stub.
vi.mock("@/lib/orders/http", () => ({
  orderRuntime: () => ({
    db: {},
    environment: "production",
    mode: process.env.NUAVE_AUDIT_MODE === "live" ? "live" : "synthetic",
  }),
}));
vi.mock("@/lib/orders/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/orders/store")>()),
  orderInState: async () => ({ id: "a".repeat(32) }),
}));
vi.mock("@/lib/spending/provider-spend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/spending/provider-spend")>()),
  // These tests are not about the spend cap (see spending/*.test.ts).
  reserveProviderSpend: async () => ({ settle: async () => {} }),
}));

import { POST as glmQuestionsPOST } from "../../app/api/audit/glm-questions/route";
import * as glmAdapter from "../intake/glm-local";
import {
  smartFingerprint,
  SMART_INTAKE_INPUT_VERSION,
} from "../intake/smart-intake-contract";

function frozenGlmIntake() {
  const base = {
    version: SMART_INTAKE_INPUT_VERSION,
    factVersion: 1,
    context: context(),
  };
  return { ...base, fingerprint: smartFingerprint(base) };
}

function context(): DirectTenAuditContext {
  return {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: "Kopi Nuave",
      source: "https://kopinuave.example/",
      sourceOrigin: "owner",
      aliases: ["Nuave Coffee"],
      origin: "owner",
    },
    focus: { value: { kind: "brand" }, origin: "nuave" },
    category: { value: "kedai kopi", origin: "website" },
    offerings: { value: ["kopi"], origin: "website" },
    serviceChannels: { value: ["on_premise"], origin: "website" },
    market: {
      value: { reach: "sekitar", areas: ["Jakarta"] },
      origin: "website",
    },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  };
}

describe("PR121 public question errors — MOCK_ONLY source reproduction", () => {
  beforeEach(() => {
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "MOCK_ONLY_DUMMY");
    vi.stubEnv("NUAVE_GLM_EVIDENCE_DIR", "");
    providerMocks.assertLiveProviderCredentialsConfigured.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const request = () =>
    new Request("https://nuave.test/api/audit/glm-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "direct-ten",
        order_id: "a".repeat(32),
        intake: frozenGlmIntake(),
      }),
    });
  const content = (bad = false) =>
    [
      "## 1. Market interpretation",
      "MOCK_ONLY_EXAMINATION",
      "## 2. Candidate questions",
      ...Array.from(
        { length: 10 },
        (_, i) =>
          `${i + 1}. Pilihan ${bad ? "Kopi Nuave MOCK_ONLY_REJECTED" : "kedai kopi"} apa di Jakarta untuk kebutuhan ${i + 1}?`,
      ),
      "## 3. Self-critique",
      "MOCK_ONLY_CRITIQUE",
    ].join("\n");
  it.each([
    "provider",
    "refusal",
    "transport",
    "extractor",
    "identity",
    "rejected",
  ])(
    "redacts the entire serialized %s error, not internal fidelity",
    async (kind) => {
      const body = {
        id: "MOCK_ONLY_RESPONSE_ID",
        model: kind === "identity" ? "MOCK_ONLY_MODEL_ID" : "glm-5.3-flash",
        choices: [
          {
            finish_reason: "stop",
            message: {
              content:
                kind === "extractor"
                  ? content().replace(
                      "1. Pilihan",
                      "MOCK_ONLY_EXTRACTOR\n1. Pilihan",
                    )
                  : kind === "identity"
                    ? "MOCK_ONLY_IDENTITY_CONTENT"
                    : content(kind === "rejected"),
              ...(kind === "refusal" ? { refusal: "MOCK_ONLY_REFUSAL" } : {}),
            },
          },
        ],
        ...(kind === "provider"
          ? { error: { message: "MOCK_ONLY_PROVIDER_PROSE" } }
          : {}),
        usage: { cost: 0 },
        cheaper_inference: {
          billing: {
            billed_cost_usd:
              kind === "provider" ? 0.004 : kind === "extractor" ? null : 0,
          },
        },
      };
      const fetchSpy = vi.fn(async () => {
        if (kind === "transport")
          throw new Error("MOCK_ONLY_TRANSPORT_EXCEPTION");
        return Response.json(body);
      });
      vi.stubGlobal("fetch", fetchSpy);
      const adapter = vi.spyOn(glmAdapter, "prepareGlmQuestionsForIntake");
      const response = await glmQuestionsPOST(request());
      expect(response.status).toBe(200);
      const internal = await adapter.mock.results[0]!.value;
      expect(JSON.stringify(internal)).toContain("MOCK_ONLY");
      expect(internal.provenance.returnedModel).toBe(
        kind === "transport" ? null : body.model,
      );
      expect(internal.provenance.responseId).toBe(
        kind === "transport" ? null : body.id,
      );
      expect(internal.provenance.modelMismatch).toBe(kind === "identity");
      if (kind === "provider")
        expect(internal.detail).toBe("MOCK_ONLY_PROVIDER_PROSE");
      if (kind === "refusal") expect(internal.detail).toBe("MOCK_ONLY_REFUSAL");
      if (kind === "transport")
        expect(internal.detail).toBe("MOCK_ONLY_TRANSPORT_EXCEPTION");
      if (kind === "extractor")
        expect(internal.detail).toContain("MOCK_ONLY_EXTRACTOR");
      if (kind !== "transport")
        expect(internal.cost).toEqual({
          billedUsd:
            kind === "provider" ? 0.004 : kind === "extractor" ? null : 0,
          available: kind !== "extractor",
        });
      const text = await response.text();
      expect(text).not.toContain("MOCK_ONLY");
      const data = JSON.parse(text);
      expect(data.status).toBe(internal.status);
      expect(data.identitiesWithheld).toBe(true);
      expect(data.provenance).toEqual({
        ...internal.provenance,
        returnedModel: null,
        responseId: null,
      });
      expect(data.cost).toEqual(internal.cost);
      expect(data.providerContact).toBe(internal.providerContact);
      expect(data).not.toHaveProperty("diagnostics");
      expect(data).not.toHaveProperty("examination");
      if (kind === "rejected") {
        expect(internal.questions).toHaveLength(10);
        expect(internal.questions.join(" ")).toContain("MOCK_ONLY_REJECTED");
        expect(internal.examination.marketInterpretation).toBe(
          "MOCK_ONLY_EXAMINATION",
        );
        expect(internal.examination.selfCritique).toBe("MOCK_ONLY_CRITIQUE");
        expect(data.questions).toEqual([]);
      }
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
    },
  );
  it("withholds a hostile credential-helper exception before provider work", async () => {
    providerMocks.assertLiveProviderCredentialsConfigured.mockImplementation(
      () => {
        throw new Error("MOCK_ONLY_CREDENTIAL_EXCEPTION");
      },
    );
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await glmQuestionsPOST(request());
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("MOCK_ONLY");
    expect(JSON.parse(text)).toMatchObject({
      code: "LIVE_CREDENTIALS_MISSING",
      providerContact: "none",
      error: "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("returns fixed500 without fabricating no work or zero after unexpected exception", async () => {
    vi.spyOn(glmAdapter, "prepareGlmQuestionsForIntake").mockRejectedValue(
      new Error("MOCK_ONLY_ROUTE_EXCEPTION"),
    );
    const response = await glmQuestionsPOST(request());
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("MOCK_ONLY");
    const data = JSON.parse(text);
    expect(data).toMatchObject({
      status: "failed",
      reason: "internal_error",
      error: "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
    });
    expect(data).not.toHaveProperty("providerContact");
    expect(data).not.toHaveProperty("cost");
    expect(data).not.toHaveProperty("provenance");
  });
  it("keeps the whole accepted synthetic success unchanged", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const adapter = vi.spyOn(glmAdapter, "prepareGlmQuestionsForIntake");
    const response = await glmQuestionsPOST(request());
    const internal = await adapter.mock.results[0]!.value;
    expect(internal.status).toBe("ok");
    expect(await response.json()).toEqual(internal);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Spec 010 R-01/R-02a — switch and question_method gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUAVE_NEW_AUDIT_ENABLED = "1";
    process.env.NUAVE_AUDIT_MODE = "synthetic";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonPost(url: string, body: unknown) {
    return new Request(`https://nuave.test${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("switch off answers 404 on glm-questions before the body is read", async () => {
    delete process.env.NUAVE_NEW_AUDIT_ENABLED;

    const glm = await glmQuestionsPOST(
      new Request("https://nuave.test/api/audit/glm-questions", {
        method: "POST",
        body: "{ not json",
      }),
    );

    expect(glm.status).toBe(404);
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
    expect(providerMocks.liveGenerateReportContent).not.toHaveBeenCalled();
  });

  it.each(["glm-slots", "unknown-method"])(
    "glm-questions rejects method %j with 400",
    async (method) => {
      const response = await glmQuestionsPOST(
        jsonPost("/api/audit/glm-questions", {
          method,
          order_id: "a".repeat(32),
          intake: frozenGlmIntake(),
        }),
      );
      expect(response.status).toBe(400);
    },
  );

  it("glm-questions rejects an omitted method with 400", async () => {
    const response = await glmQuestionsPOST(
      jsonPost("/api/audit/glm-questions", { intake: frozenGlmIntake() }),
    );
    expect(response.status).toBe(400);
  });

  it("synthetic mode runs the labeled stub with zero provider fetches", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await glmQuestionsPOST(
      jsonPost("/api/audit/glm-questions", {
        method: "direct-ten",
        order_id: "a".repeat(32),
        intake: frozenGlmIntake(),
      }),
    );
    expect(response.status).toBe(200);
    const outcome = (await response.json()) as {
      status: string;
      questions?: string[];
      provenance?: { transport?: string; method?: string };
    };
    expect(outcome.status).toBe("ok");
    expect(outcome.questions).toHaveLength(10);
    expect(outcome.provenance?.transport).toBe("synthetic-stub");
    expect(outcome.provenance?.method).toBe("direct-ten");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
