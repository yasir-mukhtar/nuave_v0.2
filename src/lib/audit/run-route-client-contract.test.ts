import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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
});
