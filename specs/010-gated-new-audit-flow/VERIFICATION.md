# Spec 010 verification

## AC-10 — Workers runtime (R-10a)

`npm run test:workers` runs locally: it generates request payloads with the
app's own intake helpers (`scripts/test-workers-payloads.ts`, bundled by
esbuild), builds with `opennextjs-cloudflare build`, then serves the real
bundle under `wrangler dev` (workerd, local mode — no network, no provider
calls). The rate-limit bindings from `wrangler.jsonc` are live inside the
worker; provider hosts are never contacted because `NUAVE_AUDIT_MODE` is
`synthetic`. It is not wired into `npm run verify` because that gate must stay
hermetic for CI; this script is the documented local equivalent.

Run on `codex/spec010-public-flow`, 2026-09-19 (block 4 working tree):

    PASS  payloads generated from the app intake helpers
    PASS  opennextjs-cloudflare build
    PASS  switch off: /audit shows the unavailable UI — status 200
    PASS  switch off: /api/audit/run → 404 before any work — status 404
    PASS  legacy method omitted: /api/audit/run → 400 — status 400
    PASS  legacy method canonical: /api/audit/run → 400 — status 400
    PASS  legacy method glm-slots: /api/audit/run → 400 — status 400
    PASS  legacy method unknown: /api/audit/run → 400 — status 400
    PASS  legacy method glm-slots: /api/audit/glm-questions → 400 — status 400
    PASS  legacy method canonical: /api/audit/glm-questions → 400 — status 400
    PASS  legacy method canonical: /api/audit/report → 400 — status 400
    PASS  archived route /api/audit/prompts → 404 — status 404
    PASS  archived route /api/audit/variance → 404 — status 404
    PASS  archived route /api/audit/local-audit → 404 — status 404
    PASS  archived route /audit/v2 → 404 — status 404
    PASS  glm-questions: two synthetic generations succeed — statuses 200/200
    PASS  glm-questions: third call inside 60s → 429 (binding active in workerd) — status 429
    PASS  synthetic direct-ten run completes with ten observations — events 22
    PASS  synthetic report request succeeds — status 200
    PASS  no filesystem access attempted in workerd

    Workers runtime check passed — 20 checks green.

The production route table from the same build confirms the archive (only the
five retained `/api/audit/*` routes plus `/audit` and the `/audit/new-intake`
redirect exist — `/audit/v2`, `/audit/fixture`, `/audit/spec004`,
`/audit/local-report`, `/api/audit/prompts`, `/api/audit/variance` and
`/api/audit/local-audit` are gone):

    Route (app)
    ┌ ○ /
    ├ ○ /_not-found
    ├ ƒ /api/audit/extract
    ├ ƒ /api/audit/glm-questions
    ├ ƒ /api/audit/identity
    ├ ƒ /api/audit/report
    ├ ƒ /api/audit/run
    ├ ƒ /audit
    ├ ƒ /audit/new-intake
    ├ ○ /faq
    ├ ○ /privacy
    ├ ○ /robots.txt
    ├ ○ /sitemap.xml
    ├ ○ /support
    └ ○ /terms
