# Handoff: replace published landing with LP-remote

> Written: 2026-08-16 · By: previous session · For: next agent continuing the task

## Founder decisions (2026-08-16, binding — do not re-litigate)

1. **i18n** — "Gapapa, biarin aja": keep the published v2 Indonesian-only setup
   (single `id` locale, no `NEXT_LOCALE` cookie, no `en.json`). Do NOT merge
   LP-remote's bilingual `i18n/routing.ts` + `request.ts`.
2. **`id.json` keys** — KEEP the v2 keys `preview.startPreview` /
   `preview.heroNotice` / `cta.seeSampleAudit` in the merged `id.json`
   (merge them into LP-remote's messages). If a key cannot be kept for any
   reason, update the e2e spec instead.
3. **Fixture-preview CTA** — DO NOT keep the "Mulai pratinjau fiktif" link.
   Let LP-remote's landing replace it as-is; the founder will re-add the
   fixture entry later. The e2e landing-entry test that asserts this CTA must
   be adapted (per decision 2's fallback) — the fixture routes themselves
   (`/audit/fixture`) stay untouched and gated.
4. **Access gate** — do NOT overwrite `src/middleware.ts` + `src/app/access/`
   (the `/audit` + `/api/audit/*` code-access gate). Merge landing files only.
5. **recharts** — install it in the MAIN repo's package.json (LP-remote's
   package.json is separate); regenerate lockfile; verify `npm ci`.
6. **Framer CDN images** — swap to local `public/` assets (approved).
7. **Copy** — leave LP-remote's copy exactly as-is (agency-facing is a known
   gap; founder edits copy later).
8. **noindex** — keep `robots.ts` (`disallow: "/"`) + `layout.tsx`
   `metadata.robots = { index:false, follow:false }` from published v2.

## Task

Replace the landing page currently live at **https://v2.nuave.ai** with the
draft landing in **`/Users/yasir/nuave_v0.2/LP-remote/`**, then push to `main`
(CI auto-deploys to Cloudflare Workers).

## Current state (verified live)

- **`https://v2.nuave.ai` is live** (Cloudflare Workers, worker `nuave-v2`,
  account `Mail.yasirmukhtar@gmail.com's Account`, zone `nuave.ai`).
- Landing is Indonesian-only, `robots.txt` = noindex (pre-release).
- Access gate active: `/audit` + `/api/audit/*` require cookie `nuave_access`
  === `NUAVE_ACCESS_CODE`; `/access` page sets it. 401 before any handler.
- `nuave.ai` apex / `www.nuave.ai` must stay untouched (v1 Framer/Vercel).
- CI: `.github/workflows/deploy-pages.yml` — on push to `main`: writes
  `.env.production.local` from GitHub secrets, `npm run build:cf`
  (OpenNext), deploys worker. **All secrets already set.**
- Access code (production) lives in `.secrets/v2-access-code.txt`
  (gitignored) — matches GitHub secret `NUAVE_ACCESS_CODE`.

## What LP-remote is

Working copy of the landing pulled from repo `yasir-mukhtar/nuave` (v1),
stripped of auth/dashboard/keystatic (see `LP-remote/README.md`). It is a
**standalone Next app** (own package.json, node_modules) — NOT part of the
main build. Landing-only files live under `LP-remote/src/` and `public/`.

## ⚠️ Conflicts vs published v2 — resolution in "Founder decisions" above

1. **i18n bilingual lagi** di LP-remote — jangan di-merge (tetap single `id`,
   tanpa cookie; lihat keputusan 1).
2. **`id.json` beda kunci** → merge kunci v2 (`preview.*`, `cta.seeSampleAudit`)
   ke dalam `id.json` LP-remote; kalau tidak bisa, ubah spec e2e (keputusan 2).
3. **Fixture-preview entry tidak dipertahankan** — landing LP-remote menggantikan
   CTA "Mulai pratinjau fiktif"; founder akan ubah lagi nanti. Sesuaikan test
   e2e landing-entry yang meng-assert CTA ini (keputusan 3). Route
   `/audit/fixture` + gate tetap utuh.
4. **Jangan timpa gate** (`src/middleware.ts` + `src/app/access/`) — LP-remote
   tidak punya; merge landing files saja (keputusan 4).
5. **Dep baru: `recharts`** — install di repo utama + regenerate lockfile
   (keputusan 5). Catatan: lockfile pernah korup oleh install paralel —
   verifikasi `npm ci`.
6. **Framer CDN images** — swap ke `public/` lokal (keputusan 6).
7. **Copy dibiarkan apa adanya** dari LP-remote — tidak rewrite (keputusan 7).
8. **noindex** — pertahankan dari v2 (keputusan 8).

## Suggested merge steps (for the next agent)

1. Read `docs/NOW.md`, `LP-remote/README.md`, `src/messages/id.json` (v2),
   `tests/e2e/helpers.ts`, `tests/e2e/shared-config.ts` first.
2. Merge per "Founder decisions" above: Indonesian-only i18n stays; merge
   v2's `preview.*` + `cta.seeSampleAudit` keys into the new `id.json` (or
   update e2e specs if a key can't be kept); the fixture-preview CTA on the
   landing is REPLACED (adapt the landing-entry e2e test); gate stays.
3. Copy LP-remote landing files into main `src/` + `public/`:
   `page.tsx`, `layout.tsx`, `globals.css`, `styles/tokens.css`,
   `components/{LandingNav,Footer,HowItWorks,VisibilityScoreChart,RecommendationsPreview,PromptResultPreview,SmoothScroll}.tsx`,
   `components/dashboard/ActionItemPanel.tsx`,
   `app/(dashboard)/findings/_components/severity-badge.tsx`,
   `lib/utils.ts`, `messages/id.json` (merged per decision 2), public assets.
   Do NOT copy `middleware.ts`/`access/`/`en.json`/`i18n` cookie logic.
4. `npm install recharts` in the main repo; regenerate lockfile; `npm ci` check.
5. Localize assets (kill framer CDN refs).
6. Run gates: `npm run check`, `npm run test:audit`, `npm run test:e2e`
   (all must pass; e2e boots dev servers on ports 3000/3100/3200 — kill any
   stray `next dev` first: `pkill -f "next dev"`).
7. Build worker locally: `npm run build:cf` (needs `.env.production.local`
   present for env inlining — see below). Verify gate with
   `opennextjs-cloudflare preview` + curl cookie checks.
8. Commit + push → CI deploys. Verify https://v2.nuave.ai (200 landing,
   noindex, gate: /audit 307 no-cookie, 401 API no-cookie, 200/400 with
   correct cookie) and that nuave.ai apex is untouched.

## Environment gotchas (learned this session)

- **OpenNext inlines env ONLY from `.env*` files at build time** — shell
  env vars are ignored. CI writes `.env.production.local` from secrets; for
  LOCAL `build:cf`, that file must exist (it does, gitignored).
- `NUAVE_PROVIDER=gemini` is the live provider (free tier); GEMINI_API_KEY
  set. Do not touch unless told.
- Next 16: `middleware.ts` is deprecated-but-required (proxy.ts = Node
  runtime, unsupported by OpenNext — keep `middleware.ts`!).
- Commit/push only with founder approval (AGENTS.md rule).
- Don't touch: `docs/DECISION_LOG.md` unless the work changes a product fact;
  `archive/`; `.env.local`; `Landing Page Copy*.md` / `LP-remote/_fetch.sh`
  (other-process files — leave uncommitted changes alone).

## Secrets / access

- Cloudflare API token: `~/.nuave-cf-token.txt` (local file, chmod 600).
- GitHub: all deploy secrets set on `yasir-mukhtar/nuave_v0.2`.
- Production access code: `.secrets/v2-access-code.txt`.
