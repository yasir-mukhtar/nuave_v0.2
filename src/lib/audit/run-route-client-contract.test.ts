import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIT_CLIENT_CONTRACT_VERSION,
  AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
  AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
} from "./client-contract";
import {
  INDONESIAN_SLOT_CATEGORIES,
  buildDeterministicIndonesianPack,
  classifyIndonesianQuestion,
  minimizeIndonesianBrief,
} from "./questions-id";
import type { AuditPrompt, BusinessBrief } from "./types";

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExecuteAuditPrompt: vi.fn(),
  isLiveProviderCall: vi.fn(() => false),
}));
const runMocks = vi.hoisted(() => ({
  runAuditObservations: vi.fn(async (input: unknown) => {
    void input;
  }),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);
vi.mock("@/lib/audit/run-orchestrator", () => runMocks);

import { POST } from "../../app/api/audit/run/route";

function brief(): BusinessBrief {
  return {
    brand_name: "Kopi Nuave",
    entity_scope: "Jakarta",
    brand_type: "coffee shop",
    category: "coffee shop",
    market_context: "Jakarta",
    target_customer: "coffee drinkers",
    official_sources: ["https://kopinuave.example/"],
    verified_offerings: ["coffee"],
    verified_customer_needs: ["find coffee"],
    verified_decision_criteria: ["location"],
    verified_competitor: { name: "", scope: "", source_url: "" },
    similar_businesses: [],
    brand_name_variants: ["Nuave Coffee"],
    priority_offering: "coffee",
    conversion_action: "visit the shop",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

function promptsWithTamperedCategory(input: BusinessBrief): AuditPrompt[] {
  const minimized = minimizeIndonesianBrief(input);
  return buildDeterministicIndonesianPack(minimized).map(
    (question, index) => ({
      prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
      category: index === 0 ? "action" : INDONESIAN_SLOT_CATEGORIES[index],
      role: "test",
      branded:
        classifyIndonesianQuestion(question, minimized) ===
        "menyebut_bisnis_anda",
      question,
      rationale: "test",
      inputs_used: ["brand_name"],
      review_status: "needs_human_review",
    }),
  );
}

describe("POST /api/audit/run client contract guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([undefined, "older-live-audit-stream"])(
    "rejects stale client contract %s before provider setup",
    async (clientContractVersion) => {
      const body = clientContractVersion
        ? { client_contract_version: clientContractVersion }
        : {};
      const response = await POST(
        new Request("https://nuave.test/api/audit/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      const payload = (await response.json()) as {
        error?: string;
        code?: string;
      };

      expect(response.status).toBe(409);
      expect(payload).toEqual({
        error: AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
        code: AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
      });
      expect(
        providerMocks.assertLiveProviderCredentialsConfigured,
      ).not.toHaveBeenCalled();
      expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
    },
  );

  it("canonicalizes a tampered prompt category before run execution", async () => {
    const businessBrief = brief();
    const response = await POST(
      new Request("https://nuave.test/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          brief: businessBrief,
          prompts: promptsWithTamperedCategory(businessBrief),
          safety_identifier: "test-user-123",
          budget: {
            limit_usd: 5,
            carryover_cost_usd: 0,
            calls: [],
          },
        }),
      }),
    );
    await response.text();

    expect(response.status).toBe(200);
    const runInput = runMocks.runAuditObservations.mock.calls[0]?.[0] as
      | { prompts: AuditPrompt[] }
      | undefined;
    expect(runInput?.prompts[0]).toMatchObject({
      prompt_id: "NVA-ID-01",
      category: "need_discovery",
    });
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });
});
