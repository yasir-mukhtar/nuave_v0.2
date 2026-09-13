import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { previewPolicy } from "../scripts/pr-preview-policy.mjs";

const REPO = "yasir-mukhtar/nuave_v0.2";
const base = { headRepoFullName: REPO, repoFullName: REPO };

describe("previewPolicy", () => {
  it("deploys and cleans up for a human-authored same-repo PR", () => {
    expect(
      previewPolicy({
        ...base,
        action: "opened",
        prAuthorLogin: "yasir-mukhtar",
      }),
    ).toEqual({ deploy: true, cleanup: false });
    expect(
      previewPolicy({
        ...base,
        action: "closed",
        prAuthorLogin: "yasir-mukhtar",
      }),
    ).toEqual({ deploy: false, cleanup: true });
  });

  it("skips deploy and cleanup for a Dependabot-authored PR", () => {
    expect(
      previewPolicy({
        ...base,
        action: "opened",
        prAuthorLogin: "dependabot[bot]",
      }),
    ).toEqual({ deploy: false, cleanup: false });
    expect(
      previewPolicy({
        ...base,
        action: "closed",
        prAuthorLogin: "dependabot[bot]",
      }),
    ).toEqual({ deploy: false, cleanup: false });
  });

  it("keys on the PR author, not the event actor: a human-triggered event on a bot PR is still skipped", () => {
    // The policy input is pull_request.user.login (author); whoever triggered
    // the event is irrelevant to it.
    expect(
      previewPolicy({
        ...base,
        action: "closed",
        prAuthorLogin: "dependabot[bot]",
      }),
    ).toEqual({ deploy: false, cleanup: false });
  });

  it("skips both jobs for forked PRs regardless of author", () => {
    const forked = { ...base, headRepoFullName: "someone-else/nuave_v0.2" };
    expect(
      previewPolicy({
        ...forked,
        action: "opened",
        prAuthorLogin: "yasir-mukhtar",
      }),
    ).toEqual({ deploy: false, cleanup: false });
    expect(
      previewPolicy({
        ...forked,
        action: "closed",
        prAuthorLogin: "yasir-mukhtar",
      }),
    ).toEqual({ deploy: false, cleanup: false });
  });
});

describe("workflow conditions match the policy", () => {
  const yaml = readFileSync(".github/workflows/pr-preview.yml", "utf8");
  const previewIf = yaml.match(
    /name: Deploy PR preview[\s\S]*?if: >-\n([\s\S]*?)\n    runs-on:/,
  )[1];
  const cleanupIf = yaml.match(
    /name: Remove closed PR preview[\s\S]*?if: >-\n([\s\S]*?)\n    runs-on:/,
  )[1];

  it("deploy requires a non-closed same-repo event by a non-Dependabot author", () => {
    expect(previewIf).toContain("github.event.action != 'closed'");
    expect(previewIf).toContain("head.repo.full_name == github.repository");
    expect(previewIf).toContain("pull_request.user.login != 'dependabot[bot]'");
  });

  it("cleanup requires a closed same-repo event by a non-Dependabot author", () => {
    expect(cleanupIf).toContain("github.event.action == 'closed'");
    expect(cleanupIf).toContain("head.repo.full_name == github.repository");
    expect(cleanupIf).toContain("pull_request.user.login != 'dependabot[bot]'");
  });
});
