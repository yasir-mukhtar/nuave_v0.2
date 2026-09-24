# Spec 011 — local PR publication package

2026-09-24. **Local package complete; publication approval pending.**
The independently reviewed integration is ready for the bounded publication
decision below. Required GitHub CI, merge readiness and production release are
not claimed complete.

## Exact candidate and evidence

- Candidate: `/private/tmp/nuave-main-integration-lvjrueuh/candidate/`.
- Branch: `codex/spec011-main-integration`; base/HEAD
  `4470deb2553ae1413b039191a192828c93c7fcca`. Work remains unstaged/uncommitted.
- [Worker result](./MAIN_INTEGRATION_RESULT.md) and
  [independent review](./MAIN_INTEGRATION_REVIEW.md) are preserved unchanged.
  Independent review SHA-256:
  `191484f929de1efde326b09079c1167e542cfdff39f5dd60aa51f4ce9db514e0`.
- The reviewed 325-file product manifest and 596-file original public manifest
  remain in `/private/tmp/nuave-main-integration-lvjrueuh/evidence/`.
- Final publication evidence is in
  `/private/tmp/nuave-spec011-pr-package-let1jhxh/`: `publication-files.json`,
  `publication-paths.nul`, `publication-product-hashes.json`, `publication.patch`,
  `packaging-docs.patch`, `package-summary.json`, and `validation.json`.
  The summary records the exact final tree and artifact hashes outside the tree,
  avoiding a self-referential checksum in this document.
- The proposed public delta is **100 files**: the worker's 98 files, the
  independent integration review, and this readiness record. The allowlist
  includes later documentation updates to five of the existing files.

The packaging delta is limited to current status in `README.md`, `docs/NOW.md`,
`docs/INDEX.md`, `specs/README.md`, an appended verification entry, and this new
record. `README.md` is the only changed member of the 325-file reviewed product
manifest; the other 324 members remain byte-identical. All runtime/test/config,
dependency and workflow files are unchanged. The separate final manifest makes
this documentation-only difference explicit; it does not overwrite old evidence.

The exact publication file list excludes the four protected local notes,
environment/credential files, raw/private evidence, generated images/PDFs/logs,
archive material and unrelated drafts. The public documentation includes prior
acceptance records and named public-business test observations; these are not
new customer proof or a new live-verification claim. Local evidence paths remain
historical references, not publicly accessible artifacts.

## Validation and retained limits

The independent reviewer passed **402 focused tests**, then canonical
`npm run verify`: **1,301 tests in 92 suites, both builds, 32 browser checks**
(29 enabled, 3 disabled). All 11 fictional PDF pages and seven viewport images
were independently inspected. Packaging retains those results without rerunning
unchanged product gates. The complete file allowlist, documentation diff, hashes,
whitespace and reconstruction of the final publication patch are checked separately.

Native OS Save, physical mobile and native browser zoom were not verified.
The inherited 320px number wrap is nonblocking; report header label/order,
printed URL-tail policy, Spec 012 B1/B2 and report usefulness remain separate.
Spec 011 stays Verified; F-01, F-03 and AC-07 remain closed. No new live call or
spend occurred; accounting remains **USD 1.06241155 of 5**.

## Prepared commit and draft PR

Commit subject and PR title: **Add prepared Smart intake with truthful audit context**

The exact proposed commit message and PR body are retained as `commit-message.txt`
and `pr-body.md` in the packaging evidence directory. The PR describes the final
combined intake/report behavior, accepted historical hold, unchanged protected
boundaries and attributed independent validation. It makes no production-release,
real-business visibility or report-usefulness claim. Target base: `main`.

On 2026-09-24, the read-only remote check still returned main `4470deb` and no
published branch named `codex/spec011-main-integration`. The preceding PR preflight
found no existing PR. Recheck both immediately before publication; reconcile any
new base drift with appropriate verification rather than claiming stale readiness.

The repository's required GitHub check is **validate** on an up-to-date PR head;
conversations must be resolved. Local verification does not substitute for that
CI result. Preserve branch protection and the main merged-PR-origin deployment
gate. No CI result for this candidate exists before its publication.

## Approval requested and execution boundary

The founder's “GO ahead” authorized finishing this local package. Publication
approval is the next step under `AGENTS.md`: “Do not commit or push unless the
founder explicitly requests it.” Approval before publishing/deployment is also
required there. No additional product-policy decision is needed.

Request approval for this exact public package to be committed on
`codex/spec011-main-integration`, pushed to the same repository branch, and opened
as a **draft PR** against main. This includes publication of the listed acceptance
records. It also includes the existing workflow's **automatic isolated synthetic
preview deployment and preview-link comment**, which run even for a draft PR.
The preview uses dummy provider credentials and synthetic audit mode.

After approval: recheck hashes/base/branch state; stage only the exact allowlist;
verify staged contents match the prepared tree; commit using the prepared message;
push without force; create the draft PR using `pr-body.md`; monitor required
`validate` and preview results on the exact PR head. Record actual results, and
do not claim merge readiness while a required check is red or pending.

No main merge, production deployment, live provider calls, paid audit, customer
contact, or unrelated publication is included. This preparation performs no
commit, push, PR creation, preview or release. The source implementation, Git
state, protected notes and all earlier review/evidence artifacts remain preserved.
