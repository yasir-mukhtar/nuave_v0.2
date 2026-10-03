import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const yaml = readFileSync(".github/workflows/ci.yml", "utf8");
const validate =
  yaml.split(/^  validate:\n/m)[1]?.split(/^  [\w-]+:\n/m)[0] ?? "";
const steps = validate
  .split(/^      - /m)
  .slice(1)
  .map((step) => `      - ${step}`.trimEnd());
const browser = steps.filter((step) =>
  /^        id: browser_tests$/m.test(step),
);
const uploads = steps.filter((step) =>
  /^        uses: actions\/upload-artifact@/m.test(step),
);

describe("CI browser failure evidence", () => {
  it("keeps one unwrapped browser command before exactly one upload", () => {
    expect(browser).toHaveLength(1);
    expect(uploads).toHaveLength(1);
    expect(browser[0]).toBe(
      [
        "      - name: Run browser tests",
        "        id: browser_tests",
        "        run: npm run test:e2e",
      ].join("\n"),
    );
    expect(steps.indexOf(uploads[0])).toBeGreaterThan(
      steps.indexOf(browser[0]),
    );
    expect(
      yaml.match(/^\s+uses: actions\/upload-artifact@/gm) ?? [],
    ).toHaveLength(1);
  });

  it("uploads only on failure of the browser step", () => {
    expect(uploads[0]).toContain(
      "        if: ${{ failure() && steps.browser_tests.outcome == 'failure' }}",
    );
  });

  it("pins the action and restricts the evidence path and retention", () => {
    expect(uploads[0]).toBe(
      [
        "      - name: Upload browser failure evidence",
        "        if: ${{ failure() && steps.browser_tests.outcome == 'failure' }}",
        "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4",
        "        with:",
        "          name: browser-failure-${{ github.run_id }}-${{ github.run_attempt }}",
        "          path: test-results/",
        "          if-no-files-found: warn",
        "          retention-days: 7",
        "          include-hidden-files: false",
      ].join("\n"),
    );
  });

  it("does not mask validation failures at the job or step level", () => {
    expect(validate).not.toMatch(/^\s*continue-on-error:/m);
  });

  it("keeps deployment dependent on validation and merged-PR origin", () => {
    expect(yaml).toContain(
      [
        "  deploy:",
        "    name: Deploy to Cloudflare Workers",
        "    needs: [validate, verify-main-origin]",
        "    if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
      ].join("\n"),
    );
    const origin =
      yaml.split(/^  verify-main-origin:\n/m)[1]?.split(/^  [\w-]+:\n/m)[0] ??
      "";
    expect(origin).toContain(
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    );
    expect(origin).toContain('if [ -z "${merged_pr_number}" ]; then');
    expect(origin).toContain("            exit 1");
    expect(origin).not.toMatch(/^\s*continue-on-error:/m);
  });
});
