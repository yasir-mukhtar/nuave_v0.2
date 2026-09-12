// Repository policy for .github/workflows/pr-preview.yml, expressed once so
// the workflow's `if:` conditions can be validated in tests.
//
// Policy: PR previews deploy only for PRs authored from this repository by a
// non-Dependabot author. Dependabot-authored PRs never deploy previews —
// Dependabot-triggered runs receive Dependabot-scoped secrets and cannot see
// the repository's Cloudflare credentials — so there is also nothing for
// cleanup to remove on their close events. The check keys on the PR AUTHOR
// (`pull_request.user.login`), not the event actor: a human who closes a
// Dependabot PR must not trigger a guaranteed-failing cleanup.
//
// The workflow cannot call this file from `if:` (job conditions evaluate
// before steps run); the YAML expresses the same conditions and the unit
// tests keep both in sync.

export const DEPENDABOT_AUTHOR = "dependabot[bot]";

export function previewPolicy({
  action,
  prAuthorLogin,
  headRepoFullName,
  repoFullName,
}) {
  const sameRepo = headRepoFullName === repoFullName;
  const botAuthored = prAuthorLogin === DEPENDABOT_AUTHOR;
  return {
    deploy: action !== "closed" && sameRepo && !botAuthored,
    cleanup: action === "closed" && sameRepo && !botAuthored,
  };
}
