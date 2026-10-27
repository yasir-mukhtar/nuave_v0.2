import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPORT_PLAYBOOK } from "./report-playbook";

describe("report playbook (Spec 021 B-02)", () => {
  it("is the approved Markdown file, byte for byte", () => {
    const file = readFileSync(
      join(process.cwd(), "docs/content/report/PLAYBOOK.md"),
      "utf8",
    );
    expect(REPORT_PLAYBOOK).toBe(file);
    expect(REPORT_PLAYBOOK).toContain("Status: **Approved**");
  });
});
