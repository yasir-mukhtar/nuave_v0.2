import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUDIT_CLIENT_CONTRACT_VERSION,
  AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
  AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
} from "./client-contract";

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExecuteAuditPrompt: vi.fn(),
  isLiveProviderCall: vi.fn(() => false),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);

import { POST } from "../../app/api/audit/run/route";

describe("POST /api/audit/run client contract guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUAVE_NEW_AUDIT_ENABLED = "1";
    process.env.NUAVE_AUDIT_MODE = "synthetic";
  });

  it.each([undefined, "older-live-audit-stream"])(
    "rejects stale client contract %s before provider setup",
    async (clientContractVersion) => {
      const body = clientContractVersion
        ? {
            client_contract_version: clientContractVersion,
            question_method: "direct-ten",
          }
        : { question_method: "direct-ten" };
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
});

describe("POST /api/audit/run switch guard (Spec 010 R-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NUAVE_NEW_AUDIT_ENABLED;
  });

  it("fails closed with 404 and zero provider work when the switch is off", async () => {
    const response = await POST(
      new Request("https://nuave.test/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          prompts: [],
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(
      providerMocks.assertLiveProviderCredentialsConfigured,
    ).not.toHaveBeenCalled();
    expect(providerMocks.liveExecuteAuditPrompt).not.toHaveBeenCalled();
  });
});
