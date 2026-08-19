# v2.nuave.ai launch plan (v0.2 first deploy)

> Written: 2026-08-16
> For: an implementor agent
> Status: founder-approved direction; execution not started

## Goal

Put this repository (`nuave_v0.2`) on the internet at **`v2.nuave.ai`**, in
Indonesian, with the audit tool behind an access code. `nuave.ai` is not touched
at all.

| URL | Serves | Changes in this task |
| --- | --- | --- |
| `nuave.ai` + `www.nuave.ai` | v1 (Framer landing + existing app) | **Nothing** |
| `v2.nuave.ai` | this repo, first-ever deploy | Everything below |

After this task the founder edits the landing page directly on a live site, then
auth and brief intake get planned separately.

## Founder decisions (do not re-litigate)

1. **Do not clone the `nuave.ai` landing page.** Ship the existing
   `src/app/page.tsx` and its components as they are. No copy rewrite, no Framer
   port, no new sections. The landing-copy drafts in the repo root
   (`Archive Candidates/landing-copy-drafts/`, `Archive Candidates/lp-claude-static/`) are out of scope.
2. **Indonesian only.** `src/messages/id.json` already exists. Remove the English
   locale and the language switcher.
3. **Landing is public; `/audit` and `/api/audit/*` are gated** by a single
   access code the founder hands out manually. The audit makes real paid API
   calls and must never be reachable without the code.
4. **Subdomain, not the apex.** This supersedes
   [`DOMAIN_TRANSITION_PLAN.md`](./DOMAIN_TRANSITION_PLAN.md), which flips the
   apex and moves v1 to `monitor.nuave.ai`. That plan is **parked, not
   cancelled** — its Phase 2b access-gate design is reused verbatim below. Do not
   execute its Phase 1, 3, or 4.
5. **Scope ends at "the landing is live and editable."** No auth, no brief
   intake, no payment, no analytics in this task.

## Non-goals

Apex DNS changes · moving v1 anywhere · rewriting landing copy · translating the
`/audit` and `/audit/fixture` screens · accounts, email, rate limiting ·
replacing any simulated boundary from `END_TO_END_PLAN.md`.

---

## Phase 0 — Pre-flight (read-only, ~15 min)

1. Find where DNS for `nuave.ai` is managed. The apex currently serves a **Framer**
   site (assets come from `framerusercontent.com`), so DNS may sit at Framer, at
   Cloudflare, or at the registrar — do not assume Vercel. Record the answer.
2. Confirm you can add a subdomain record there. If you cannot, stop and tell the
   founder; every later phase depends on it.
3. Confirm the Vercel account that will own the new project, and that
   `github.com/yasir-mukhtar/nuave_v0.2` is connected to it.
4. Confirm which API key funds the first live run: `OPENAI_API_KEY` (paid) or
   `GEMINI_API_KEY` (free tier, `NUAVE_PROVIDER=gemini`).

**Gate:** you can name the DNS host, the Vercel account, and the provider for the
first live run. Do not write code otherwise.

---

## Phase 1 — Make the site Indonesian-only (code, ~1 hour)

One commit, no deploy yet.

### 1a. Collapse the locale set

- `src/i18n/routing.ts` — `locales: ["id"]`, `defaultLocale: "id"`. Keep
  `localePrefix: "never"` and `localeDetection: false`.
- `src/i18n/request.ts` — delete the `NEXT_LOCALE` cookie lookup and the
  `cookies()` import. Return `locale: "id"` and the `id.json` messages
  unconditionally.
- Delete `src/messages/en.json`.

### 1b. Remove the switcher

- Delete `src/components/LanguageSwitcher.tsx` and remove its usage from
  `src/components/LandingNav.tsx` (and anywhere else `grep -rn LanguageSwitcher src`
  finds it).
- `src/components/ui/dropdown-menu.tsx` and the `@radix-ui/react-dropdown-menu`
  dependency exist only for the switcher — confirm with `grep` before removing
  either. If nothing else imports them, remove both.

### 1c. Fix the shell

- `src/app/layout.tsx` — the `metadata.title` and `metadata.description` are
  English and agency-facing ("Client-ready AI Visibility Audits"). Replace with a
  short Indonesian title and description drawn from the existing `id.json` hero
  copy. `<html lang>` already follows the locale and becomes `id` automatically.
- `src/components/LandingNav.tsx` and `src/components/Footer.tsx` load the brand
  SVG from `framerusercontent.com`. Download it to `public/` and point both at
  the local file, so v2 does not depend on the v1 Framer CDN.

### 1d. Repair the tests this breaks

`tests/e2e/fixture-journey.spec.ts` asserts English landing strings — for example
the link named `"Start the fictional preview"`, which is `preview.startPreview`
and renders in Indonesian once the default locale changes. Walk the spec top to
bottom and update every assertion that reads a translated string to its `id.json`
value. Leave assertions on hardcoded English inside `/audit/fixture` alone; those
screens are not being translated in this task.

**Gate:** `npm run check`, `npm run test:audit`, and `npm run test:e2e` all pass.
`npm run dev` shows an Indonesian landing page with no language switcher, and
deleting the `NEXT_LOCALE` cookie changes nothing.

---

## Phase 2 — Access gate (code, ~1 hour)

Lifted from `DOMAIN_TRANSITION_PLAN.md` §2b. There is no gate in the repo today;
`NUAVE_FIXTURE_PREVIEW_ENABLED` is a different, unrelated flag.

- Add `src/middleware.ts` with a matcher covering `/audit/:path*` and
  `/api/audit/:path*`. `/` stays public.
- The middleware reads an httpOnly cookie `nuave_access` and compares it to
  `process.env.NUAVE_ACCESS_CODE`. Match → continue. No match → redirect page
  requests to `/access`; return `401` JSON for `/api/audit/*` **before** any
  handler runs, so no paid call is made.
- Add `src/app/access/page.tsx`: one input, one submit button, Indonesian copy.
  A route handler or server action compares the submitted code, and on match sets
  `nuave_access` — `httpOnly`, `secure`, `sameSite: "lax"`, ~30-day expiry — then
  redirects to `/audit`. On mismatch show a plain "Kode tidak sesuai" state.
- Never expose `NUAVE_ACCESS_CODE` to the client, never read it in a client
  component, never add a `NEXT_PUBLIC_` variant.
- Add `NUAVE_ACCESS_CODE` to `.env.example` with a comment, and to `.env.local`
  for local testing.

**Gate (local):**

- `/` loads with no cookie.
- `/audit` with no cookie → redirects to `/access`.
- `POST /api/audit/run` with no cookie → `401`, and **no provider request is
  made** (check the server log and the accounted spend).
- Correct code → cookie set → `/audit` loads.
- Wrong code → rejected, no cookie set.
- `/audit/fixture` still completes with zero `/api/audit/*` calls.

---

## Phase 3 — Deploy to a Vercel preview URL (~30 min)

DNS is untouched in this phase; everything happens on `*.vercel.app`.

1. New Vercel project from `github.com/yasir-mukhtar/nuave_v0.2`, branch `main`,
   framework Next.js, Node 22 (matches `.nvmrc` and `engines`).
2. Environment variables (Production **and** Preview):

   | Variable | Value |
   | --- | --- |
   | `NUAVE_ACCESS_CODE` | a long, non-guessable string |
   | `OPENAI_API_KEY` | real key, server-only |
   | `OPENAI_AUDIT_MODEL` | `gpt-5.6-luna` |
   | `NUAVE_PROVIDER` | blank for OpenAI, or `gemini` for the free path |
   | `GEMINI_API_KEY` | only if `NUAVE_PROVIDER=gemini` |
   | `NUAVE_FIXTURE_PREVIEW_ENABLED` | `true` |
   | `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` | blank |
   | `OPENAI_AUDIT_CARRYOVER_COST_USD` | `0.4357` (carries the accounted spend from `NOW.md`) |

   No `NEXT_PUBLIC_` variants of any of these.
3. Deploy. Confirm the build passes and the Indonesian landing renders.
4. Re-run the Phase 2 gate against the deployed preview URL, not just locally.

**Gate:** build green, landing renders in Indonesian, gate holds on the deployed
URL. Do not touch DNS otherwise.

---

## Phase 4 — Point `v2.nuave.ai` at it (~15 min + propagation)

1. In the new Vercel project → Domains → add `v2.nuave.ai`.
2. At the DNS host found in Phase 0, add the record Vercel asks for (normally
   `CNAME v2 → cname.vercel-dns.com`). Adding a subdomain does not affect the
   apex records that serve `nuave.ai`.
3. Wait for the certificate to issue.
4. Keep v2 out of search results while it is pre-release: add
   `src/app/robots.ts` returning `disallow: "/"`, and set
   `metadata.robots = { index: false, follow: false }` in `src/app/layout.tsx`.
   Remove both when v2 becomes the real site.

**Gate:** `https://v2.nuave.ai` serves the Indonesian landing. `https://nuave.ai`
is byte-for-byte unchanged — check the landing, `/pricing`, `/support`, `/auth`.

---

## Phase 5 — One live smoke test (needs founder approval, ~15 min)

This spends money, so ask first. `NOW.md` records USD 0.4357 accounted spend
against a USD 5 ceiling.

1. Enter the access code, run one real audit end to end on a business the founder
   names, and read the report.
2. Record the accounted cost and update the running total in `docs/NOW.md`.
3. If cost is the concern, run this on `NUAVE_PROVIDER=gemini` first and only
   repeat on OpenAI once the path is proven.

**Gate:** a real report is produced, or a specific failure is written down.

---

## Rollback

| Problem | Undo |
| --- | --- |
| Anything in Phase 1–2 | `git revert` the commit; nothing is deployed yet |
| Bad deploy | Vercel → Deployments → promote the previous one |
| Site broken after DNS | Remove `v2.nuave.ai` from the Vercel project and delete the DNS record; `nuave.ai` was never involved |
| Access code leaked | Change `NUAVE_ACCESS_CODE` in Vercel and redeploy; every existing cookie stops matching |

---

## Known risks and open questions

1. **DNS host is unconfirmed.** The apex is a Framer site, so the record may not
   live where you expect. Phase 0 exists for this.
2. **`/audit` and `/audit/fixture` are still mostly English** in hardcoded JSX,
   with a few Indonesian strings mixed in. This task does not fix that. It
   contradicts the "every customer-facing surface is Indonesian" rule in
   `VISION.md`, so it must be logged as a known gap, not quietly shipped as done.
3. **The landing copy is agency-facing** ("Audit visibilitas AI siap-klien untuk
   agensi") while the product now targets business owners directly. Shipping it
   unchanged is the founder's explicit decision — the founder edits it after this
   task.
4. **The simulated-journey disclosure must survive.** `NUAVE_FIXTURE_PREVIEW_ENABLED=true`
   means the public landing links to a fictional preview. Confirm the "not a real
   purchase" disclosure still renders on the deployed site.
5. **Do not commit or push without the founder asking.** `AGENTS.md` requires
   founder approval before publishing anything, and Phases 3–5 are publishing.

---

## Files this task touches

```
src/i18n/routing.ts            edit    single locale
src/i18n/request.ts            edit    drop cookie lookup
src/messages/en.json           delete
src/components/LanguageSwitcher.tsx   delete
src/components/ui/dropdown-menu.tsx   delete if unused
src/components/LandingNav.tsx   edit   remove switcher, local logo
src/components/Footer.tsx       edit   local logo
src/app/layout.tsx              edit   Indonesian metadata, robots noindex
src/middleware.ts               new    access gate
src/app/access/page.tsx         new    code entry screen
src/app/robots.ts               new    noindex while pre-release
public/                         add    brand SVG
.env.example                    edit   NUAVE_ACCESS_CODE
tests/e2e/fixture-journey.spec.ts     edit  Indonesian assertions
docs/NOW.md                     edit   record the deploy and any spend
package.json                    edit   drop radix dep if unused
```

## Definition of done

- [ ] `https://v2.nuave.ai` serves the Indonesian landing page publicly.
- [ ] No language switcher, no English locale file, no `NEXT_LOCALE` dependency.
- [ ] `/audit` and `/api/audit/*` are unreachable without the access code, and a
      gated `/api/audit/run` makes no provider call.
- [ ] `npm run check`, `npm run test:audit`, `npm run test:e2e` pass.
- [ ] `nuave.ai` is unchanged and still working.
- [ ] `docs/NOW.md` records the deploy, the access-gate boundary, and the spend.
- [ ] The founder can edit `src/app/page.tsx`, push, and see it live.
