import { describe, expect, it } from "vitest";
import {
  AUDIT_CLIENT_CONTRACT_VERSION,
  isCurrentAuditClientContract,
} from "./client-contract";

describe("live audit client contract", () => {
  it("accepts only the current stream contract version", () => {
    expect(isCurrentAuditClientContract(AUDIT_CLIENT_CONTRACT_VERSION)).toBe(
      true,
    );
    expect(isCurrentAuditClientContract(undefined)).toBe(false);
    expect(isCurrentAuditClientContract("older-live-audit-stream")).toBe(false);
  });
});
