# Local founder GLM test — result

## Execution record — 2026-09-18 (authorized single request, completed)

The founder-authorized frozen request was submitted once through the local
UI. **Exactly one provider send occurred; the attempt is consumed; live
authorization is off again.** Outcome: `validation_failed` — ten real GLM
texts returned and were shown for inspection; no pack was formed, no audit
ran.

- **First submit refused by design**: the browser POST failed
  `input_changed` — the frozen intake artifact had been generated against
  the raw fixture, while the live UI builds intake through
  `deriveContextFixture` (splits `"name — detail"` comparator labels, uses
  generic scope labels) plus a material-commit `factVersion` bump. The hash
  binding worked: zero sends, no marker written.
- **Repair**: rebuilt the intake from the actual stored browser session via
  the same `freezeLocalIntake` path. Verified the rebuilt intake produces a
  **byte-identical request**: SHA-256
  `32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`,
  32,948 bytes — the authorized request was not changed in any byte. Only
  the intake sidecar was re-frozen: `frozen-intake.json` is now
  `068dbc1b30059a7360c2d8c303851a3c42ade187478b403538c7aceae6d748ee`
  (the UI-producible record). The differing fields (comparator name
  formatting, `factVersion`, one scope review-row label) are bookkeeping —
  `parseQuestionFactsV3` consumes only `confirmed`, and none of the diffs
  reach the request body.
- **Send**: one POST → `attempt.consumed` created at 22:47:22Z → one
  provider round-trip (13.0 s) → HTTP 200, `finish_reason: stop`. Browser
  recorded exactly one `/api/audit/glm-questions` request; the posted intake
  hash matched `068dbc1b…` as frozen.
- **Provider envelope**: `id: gen-1789685244-h9NLCCkHFyzekfBLpIqh`,
  returned model `glm-5.3-flash` — **no mismatch** (requested == returned).
- **Billing**: `cheaper_inference.billing` settled —
  **`billed_cost_usd: 0.000782`** (effective_discount_percent 51.67). The
  earlier ~USD 0.00385 planning estimate was conservative; actual billed
  cost is recorded, not estimated.
- **Outcome**: extraction `ok` (ten texts); v3 pack validation reported
  **8 issues** — slots 1, 5, 6, 7, 9, 10 violate the one-request punctuation
  rule (two `?` in a single text), and slot 9 neither names a comparator
  business nor compares against one (the model wrote "laundry kiloan lainnya"
  generically; note the writer context supplies `mode: "named"` without
  embedding names, so the named-comparator slot rule may be structurally
  unsatisfiable — a real finding for the founder, not patched here).
  Texts stayed inspectable; `auditExecuted: false` throughout.
- **Evidence** (`.local-evidence/glm/`, gitignored, 0700/0600):
  `attempt.consumed` (`consumedAt` 22:47:22Z),
  `response-2026-09-17T22-47-35-331Z-32356cbacf97.body.txt` (exact raw
  bytes, 5,209 B) + `.outcome.json`, `ui-live-result.{json,png}`
  (UI capture), `ui-run1-input-changed.{json,png}` (refused first attempt).
  No credentials or auth headers anywhere.
- No retry, no audit, no second send — the consumed marker now blocks any
  further send under this attempt. Live env vars removed; the demo server
  at `127.0.0.1:3027` runs synthetic-only again.

## Generated questions (verbatim, for founder review)

Unedited, exactly as returned — these texts **did not pass** the local v3
pack checks; they are shown for review, not approved:

1. Laundry kiloan di Jakarta Selatan yang hasilnya bersih dan wanginya tahan lama apa ya? Ada yang recommended?
2. Tiap akhir bulan cucian numpuk dan nggak sempat nyuci sendiri. Biasanya orang sibuk di Jakarta Selatan pakai jasa laundry kiloan yang mana sih?
3. Aku butuh laundry kiloan di Jakarta Selatan yang bisa antar-jemput, biar nggak perlu keluar rumah. Ada yang bagus nggak?
4. Cucian urgent, besok harus sudah beres. Ada laundry express di Jakarta Selatan yang bisa dandalin selesainya cepat?
5. Kalau misalnya disebutin laundry kiloan yang oke di Jakarta Selatan, mana aja ya yang biasanya masuk pilihan utama? Paling suka yang harganya masuk akal buat cucian rutin.
6. Laundry kiloan di Jakarta Selatan yang express dan yang biasa aja itu biasanya bedanya di mana sih? Kira-kira lebih worth it yang mana buat kebutuhan sehari-hari?
7. Laundry Ceria di Jakarta Selatan, apakah bagus buat cucian rutin mingguan? Termasuk nggak sih paket cuci kering lipat kiloannya?
8. Menurut kamu, Laundry Ceria layak direkomendasikan nggak sih buat orang yang butuh laundry cepat dan bisa antar-jemput?
9. Laundry Ceria atau laundry kiloan lainnya di sekitar Jakarta Selatan, mana yang lebih worth it buat cucian rutin? Dibandingin dari harga sama kecepatannya gimana?
10. Laundry Ceria cocoknya buat tipe pelanggan seperti apa ya, dan kalau untuk kebutuhan tertentu misalnya ngebut selesai atau cucian besar, apakah ada keterbatasannya? Trade-off-nya apa aja?

The model's own self-critique (also preserved in the raw body) flags slot 6
as borderline-explanatory and slot 7 as close to the brand's service list,
and notes it had no named comparison target or neighborhood names supplied.

Orchestrator confirmation, 2026-09-18 (Jakarta): **B1–B3 accepted for the
bounded local live test.** Independent B3 probes confirm missing/empty/
whitespace response IDs with model mismatch fail `provenance`, while valid
IDs preserve inspection and exact provenance. All 188 intake tests pass;
the post-fix full verification log and frozen hashes are confirmed. See the
accepted scope at the top of
[`LOCAL_FOUNDER_TEST_REVIEW.md`](./LOCAL_FOUNDER_TEST_REVIEW.md). The return
below is retained, with its browser count and cost estimate corrected.
The founder subsequently replied **“Authorized”** to this exact single
request on 2026-09-18. Execution is now authorized for the existing worker;
the attempt remains unconsumed at authorization recording.

2026-09-17. Worktree `/Users/yasir/nuave-worktrees/glm-prototype`, branch
`codex/glm-dormant-prototype-2026-09-17`. Completed inside the 120-minute
box. **No real provider call was made; no credential was read.** The demo
transport is the labeled synthetic stub. The dormant six-file change is
preserved (`questions-id-glm*` hashes below match the post-review-4 state).

## Run it

```bash
cd /Users/yasir/nuave-worktrees/glm-prototype
NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true NUAVE_GLM_LOCAL_EXPERIMENT=true npm run dev
# open http://localhost:3000/audit/new-intake?fixture=GLM&glm=1
```

Without `?glm=1` (or without the env flag) the same URL runs the unchanged
deterministic preview. Without `NUAVE_NEW_INTAKE_PREVIEW_ENABLED` the route
redirects as before. In a production build the API route returns 404 and the
page ignores both params (`NODE_ENV !== "production"` gate on both sides).

## What was demonstrated (browser, Playwright `new-intake-glm.spec.ts`)

- Confirmed fictional business (Laundry Ceria fixture, scope `brand`) →
  review → one POST to `/api/audit/glm-questions` → ten synthetic GLM texts
  rendered for inspection. Exactly one request per attempt.
- Provenance banner labels the response as synthetic ("respons sintetis
  berlabel, bukan keluaran provider"), shows requested vs returned model and
  honest cost (`Biaya: tidak tersedia` — the stub carries no billing).
- Founder-style multi-sentence edit saved under the v3 punctuation rule;
  slot marked `diubah`; Back and `page.reload()` preserve the exact wording;
  `originals` keeps the generated wording separately.
- Facts edit invalidates the pack (unit-covered; same fingerprint/factVersion
  mechanism as the deterministic path).
- `?glm-stub=timeout` → truthful transport failure; `?glm-stub=malformed` →
  truthful extraction failure. Zero question slots, one request each, no
  silent retry. A failed validation displays the returned texts plus issues
  for inspection without replacing anything.
- Handoff: `mode: "glm-experimental-local"`, `auditExecuted: false`,
  `providerCalls: 0` — not the old zero-call simulated label; audit
  execution stays disabled.
- All other `/api/*` requests and third-party origins stay aborted in the
  spec; the only reachable API is the experimental route.
- No secret reaches the client: the response carries outcome/provenance only;
  the key is read server-side at call time in the gated live transport only.
  No request/response logging was added.
- Screenshots: `test-results` artifacts copied to
  `/tmp/glm-founder-test-artifacts/` (`glm-questions.png`, `glm-start.png`).

## Checks

- Focused: `vitest run src/lib/intake` → **188/188, 12 files** (includes 20
  `glm-local` adapter tests: gates, fingerprint rejection, correction
  passthrough, provider-error envelope, mismatch-inspectable, B3 mismatch +
  missing/empty/whitespace ID parametrized regression, live-key-missing
  stop, frozen binding, atomic consume — concurrent + post-timeout retry,
  restricted evidence perms).
- E2E: `new-intake-glm.spec.ts` → **2/2** (also ran against the live dev
  server; asserts `diubah` marker after refresh, `self_check` absent from
  the GLM handoff pack, and originals ≠ edited wording).
- Full `npm run verify` → **pass, exit 0** (post-B3 run): typecheck, lint
  (pre-existing warnings only), format, typography, **1159 unit, 90 files**,
  Next.js + OpenNext builds, **91 + 3 + 3 = 97 e2e** (GLM spec 2/2
  in-suite). Log `/tmp/glm-verify-b3.log` (SHA-256
  `7b24f9aaa794cdf2b41475cd3d06c9a076222dcdeaf5921764e8ec2cae2ae3d3`), ends
  `Offline verification passed.` `git diff --check` clean.

## Changed paths and SHA-256

Dormant core (unchanged since review 4): `questions-id-glm.ts`
`256f21c5…303709`, `questions-id-glm.test.ts` `a48b56de…0b4`, instruction
`7b00c780…3704`, specimen `405245b8…4bf3`, `questions-id.ts` `659ca367…a94d`.

| File | SHA-256 | Note |
| --- | --- | --- |
| `src/lib/audit/question-facts-v3.test.ts` | `16dac609a6834779eccd1b439ee3cce6bfd1e2a5d6559ff5592285890f6bce6e` | guard allowlist: only the two named experimental callers |
| `src/lib/intake/frozen-intake.ts` | `16c5ff19697bdea8c0360cf098b787e40f111f7ab63d4805c4adc0318c147ee1` | new leaf: frozen-intake version/type/fingerprint, server+client safe |
| `src/lib/intake/local-questions.ts` | `017f3451d6891334c1ec29b6b2d0ecf2532eecde4e6255104cdb26a28407aef4` | GLM pack variant, `prepareGlmLocalPack`, v3 wording rules, restore (B2: separate originals, no `self_check`), handoff mode |
| `src/lib/intake/glm-local.ts` | `761de44e1d103bd36cfb815534a98a9405750a4e8b87b1a302c9d7efaa8a78a6` | server adapter: gates, stub/live transport, frozen-attempt binding + atomic consume + evidence (B1), nonblank-ID mismatch exception (B3) |
| `src/lib/intake/glm-local.test.ts` | `65d87db83641e79e923bd97d784ea24338a269653b7ad007d4abaa57f47cd9ed` | new — incl. B1/B3 regressions (missing/empty/whitespace ID + mismatch) |
| `src/lib/intake/IntakeJourney.tsx` | `2443445d463e0d774ec95e4c57c49344f997d61268b74e152c9470d480c9ea8a` | async GLM branch, inspection state, honest copy |
| `src/lib/intake/questions-screen.tsx` | `a7f12679288234f4cc9fd2fa6af546ab547096499e2a634b521accea4ba049a6` | provenance banner, edited marker |
| `src/lib/intake/fixtures.ts` | `58dacbdbec643b720e390d0aa30267a29bfc4ae8d5dcfd4a0abb3166411cb2b2` | `GLM` fictional Laundry Ceria fixture |
| `src/lib/intake/local-questions.test.ts` | `8a99f4563c9cae67657d23f1d77e614700355faeeafcbe64da163d1e1537e157` | GLM pack coverage incl. B2 restore/no-`self_check` |
| `tests/e2e/shared-config.ts` | `b59d9115116c7ae0215df03a92d23f7eb4dd06b41923889566fe11dfdbb1f21c` | flag allowlist; live auth + key blanked |
| `tests/e2e/new-intake-glm.spec.ts` | `9fce3f2abd1e61cca44e4814f31dc42279f94bffb67948307f148a9b6faabab7` | new |
| `.gitignore` | `bd8adb55f3a942f7947369a2b7a2de9284c00dd32c62957d2e7d338d997e896f` | `.local-evidence/` excluded |
| `src/app/api/audit/glm-questions/route.ts` | `402da5efa571b66e3be08d7fafc70eeafb4316097cd02b5b333ba2c6153283b1` | thin gated POST |
| `src/app/audit/new-intake/page.tsx` | `87e7479df5838d748ca55f0146aa650c68de6e468faf1a4173e97a48e8d0452a` | env flag + `?glm=1` opt-in |
| `src/app/audit/new-intake/intake-screens.client.tsx` | `61708424f5392c24ea643247ad9b6a939b214a2505c4a078b0cb0a6493c448ba` | prop plumbing |

| `playwright.config.ts` | `745f251a501d6d5466864f629b1335ece16d07460e6f521f213a52ce4d1e3032` | spec + server env |

## Browser walkthrough (reproducible)

1. `npm run dev` with the two env vars above; open
   `…/audit/new-intake?fixture=GLM&glm=1`.
2. s-brand (Laundry Ceria confirmed by fixture) → Lanjut → scope: pick
   "Brand secara keseluruhan" → keep clicking Lanjut; every fixture screen
   arrives pre-confirmed (offerings, customer reasons, antar-jemput channel,
   Sekitar satu area + Jakarta Selatan, category-alternatives, public fact).
3. At Review, Lanjut → "Menyiapkan pertanyaan audit" waiting copy names the
   GLM local experiment → ten questions with the synthetic-response banner.
4. "Ubah pertanyaan 1" → replace with any multi-sentence wording → Simpan →
   slot shows `diubah`.
5. Kembali → Review → Lanjut → wording preserved; refresh → preserved;
   request count stays one.
6. Lanjut → "Serah terima lokal siap" → download shows
   `glm-experimental-local` / `auditExecuted:false` / `providerCalls:0`.
7. Failure probes: `?fixture=GLM&glm=1&glm-stub=timeout` and `…=malformed`
   show the alert and no questions. `?fixture=GLM` alone (no `glm=1`) runs
   the deterministic preview with zero API requests.

## Unexecuted live-test proposal (single authorized request)

**Frozen artifacts exist** — pre-created by `freezeGlmLiveAttempt` and pinned
by hash. The outbound body is byte-identical to the request the reviewer's
browser already observed (32,948 bytes, same SHA-256).

| Artifact (`.local-evidence/glm/`, gitignored, dir `0700`, files `0600`) | SHA-256 |
| --- | --- |
| `frozen-intake.json` (+ `.sha256`) | `068dbc1b30059a7360c2d8c303851a3c42ade187478b403538c7aceae6d748ee` — re-frozen at execution to the UI-producible intake (originally `7b82b585…`, which the live UI could not emit; the request bytes were verified identical before re-freezing) |
| `frozen-request.json` (+ `.sha256`) | `32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29` |

Each `.json` file's own hash equals its sidecar (compact serialization), so
`shasum -a 256 frozen-request.json` reproduces the binding.

- **Frozen input**: the GLM fixture's confirmed projection — brand
  `Laundry Ceria` (`https://laundryceria.example`), scope `brand`, category
  `laundry kiloan`, five offerings, four customer reasons, channels
  `on_premise`/`on_customer`/`delivery`, market `Sekitar satu area` →
  `Jakarta Selatan`, comparators `category-alternatives`, public fact
  "Cuci express 6 jam dijanjikan selesai pada hari yang sama." The send path
  rejects any intake whose hash differs (`input_changed`) and any request
  whose hash differs (`request_changed`); missing artifacts →
  `attempt_not_frozen`. Changed input requires a new freeze.
- **Request**: `frozen-request.json` exactly — model `glm-5.3-flash`,
  `max_tokens` 4096, `reasoning_effort:"low"`, `stream:false`, pinned
  `INDONESIAN_QUESTION_GLM_ENDPOINT`, `redirect:"error"`.
- **Consumption**: `attempt.consumed` is created atomically (`open "wx"`)
  before the send. Duplicate, concurrent, refresh, explicit retry, and
  post-timeout reuse all stop with `attempt_consumed` — covered by injected-
  transport tests including a concurrent race and a timeout-then-retry.
- **Authorized-live without key stops**: `NUAVE_GLM_LIVE_AUTHORIZED` set but
  `CHEAPERINFERENCE_API_KEY` absent → `live_credential_missing`; the stub is
  never substituted.
- **Evidence**: on a live send the exact raw response bytes land in
  `response-<ts>-<hash>.body.txt` plus a `.outcome.json` summary (status,
  transportError, bodyBytes, bodyPreserved) — failed and non-JSON responses
  included; a timeout records an outcome with no body. Credentials and auth
  headers are never written.
- **Cost estimate corrected by orchestrator** (2026-09-17, estimate not a
  cap): the frozen body is 32,948 bytes / 32,838 characters; input tokens
  have not been measured by the model's tokenizer. Use a padded **12,000
  input-token assumption** and the **4,096 output-token limit** for planning.
  [Cheaper Inference's model page](https://platform.cheaperinference.com/models/glm-5.3-flash),
  read 2026-09-17 about 14:25 UTC, lists USD 0.15/M input and USD 0.50/M
  output: `(12000 × 0.15 + 4096 × 0.50) / 1000000 = USD 0.003848`, or
  **about USD 0.00385**. The fluctuating catalog snapshot of USD 0.072511/M
  input and USD 0.241706/M output gives about USD 0.00186 under the same
  assumptions. Neither is a guaranteed bound or an implemented spending cap.
  The smaller invoice receipt does not establish this request's cost.
  Actual billing is read from `cheaper_inference.billing.billed_cost_usd`
  and shown as unavailable if absent — never estimated into the record.
- **Stop rules**: transport error/timeout (180 s cap), non-2xx, provider
  error, refusal, non-`stop` finish, empty content, missing returned model,
  **missing/empty/whitespace response ID (never masked by a model
  mismatch)**; extraction or validation failure → truthful failure, no
  second call. Model mismatch keeps its verdict while the text stays
  inspectable; the recorded ID stays verbatim.
- **Metadata caveat**: the returned identifier has been observed as
  `zai/glm-5.3-flash` vs requested `glm-5.3-flash`; the mismatch verdict is
  preserved verbatim and inspection is not identity acceptance.
- **Enablement**:
  1. Freeze is already done (artifacts above); re-run only if the intake
     changes.
  2. Only after explicit authorization, configure the existing
     `CHEAPERINFERENCE_API_KEY` separately in the server environment by name
     only; never print or put its value into a command/history. Start dev
     bound to `127.0.0.1:3027` with `NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true`,
     `NUAVE_GLM_LOCAL_EXPERIMENT=true`, `NUAVE_GLM_LIVE_AUTHORIZED=true`.
  3. Open `…/audit/new-intake?fixture=GLM&glm=1` and press Lanjut at review —
     one request, then `attempt.consumed` blocks any further send.
  4. Evidence lands in `.local-evidence/glm/`; the UI shows the outcome,
     provenance (both model IDs), and billed cost if present.

## Limitations / honest edges

- `Coba lagi` is an explicit new attempt: under the stub it replays a
  synthetic call; under live authorization the server stops it at
  `attempt_consumed` — no second provider send, ever.
- The stub interpolates projected facts so wording stays valid under facts
  edits; it is not a quality stand-in for the model.
- `validation_failed` outcomes show returned texts + issues for inspection
  but produce no pack (a failed check stays failed).
- The route trusts the fingerprinted intake record, not caller identity —
  acceptable inside the founder-only local gate; it is not a public API.
- Evidence dir default is `<worktree>/.local-evidence/glm` (gitignored);
  `NUAVE_GLM_EVIDENCE_DIR` overrides it. The consumed marker lives there
  too — deleting it would re-arm the attempt, which is why the frozen
  artifacts plus the founder's explicit env toggles are the real gate.
