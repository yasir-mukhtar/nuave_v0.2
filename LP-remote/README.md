# LP-remote — Nuave landing page (pulled from `yasir-mukhtar/nuave`)

Draft folder for modifying the landing page bit by bit, then merging back
into the main app. **This folder is NOT part of the Next.js build** — it sits
outside `src/` and exists only as a working copy.

## Source

- Repo: `https://github.com/yasir-mukhtar/nuave` (private, default branch `main`)
- Pulled: 2026-08-16 via `gh api` (see `_fetch.sh`)

## What was pulled (landing-only)

| Path | Role |
|---|---|
| `src/app/page.tsx` | Landing page: hero + stepper, marquee, problem cards, How it works, stats, FAQ, final CTA, footer |
| `src/app/layout.tsx` | Root layout (fonts Inter/Lora/Geist, next-intl, SmoothScroll) |
| `src/app/globals.css` | All LP styles + dashboard util classes used by the previews |
| `src/styles/tokens.css` | Design tokens imported by globals.css |
| `src/components/LandingNav.tsx` | Nav (auth stripped) |
| `src/components/Footer.tsx` | Footer (logo localised) |
| `src/components/HowItWorks.tsx` | 3-step section with interactive previews |
| `src/components/VisibilityScoreChart.tsx` | Preview: recharts area chart (dummy data) |
| `src/components/RecommendationsPreview.tsx` | Preview: dummy findings panel |
| `src/components/PromptResultPreview.tsx` | Preview: dummy prompt/answer bubble |
| `src/components/SmoothScroll.tsx` | Lenis smooth scroll |
| `src/components/dashboard/ActionItemPanel.tsx` | Panel used by RecommendationsPreview (severity badge trimmed) |
| `src/app/(dashboard)/findings/_components/severity-badge.tsx` | Trimmed to `SeverityIcon` only (no app-schema deps) |
| `src/messages/en.json`, `src/messages/id.json` | **Trimmed** from ~62KB to the 87 keys the landing uses |
| `src/i18n/request.ts`, `src/i18n/routing.ts` | next-intl setup (bilingual en/id, cookie `NEXT_LOCALE`) |
| `src/lib/utils.ts` | `cn()` helper |
| `src/app/robots.ts`, `src/app/sitemap.ts` | Simplified to landing-only routes |
| `public/*` | Logo, bg images, preview images, favicon |

## What was stripped (per instruction: no auth, no audit, no functionality)

- **Supabase auth** — `LandingNav`'s `useAuthStatus()` hook and the
  `createSupabaseBrowserClient` import are gone.
- **Login / Dashboard buttons** — nav "Sign in" now shows the landing CTA
  (`cta.auditBrandFreeNoExclaim`) and links to `#cta` (final CTA section).
- **`/auth` links** in `page.tsx` (hero CTA + final CTA) now point to `#cta`.
- **LanguageSwitcher** — removed from nav and deleted (matches v2 Indonesian-only
  direction; both `en.json` and `id.json` are kept for copy reference).
- **Dashboard type chain** — `types.ts` (findings) deleted; `severity-badge.tsx`
  trimmed to `SeverityIcon`. No dependency on the app-wide `src/types` schema.
- **Keystatic/blog** — `sitemap.ts` no longer imports the Keystatic reader.
- **`robots.ts`** — disallow list trimmed to `/api/` and `/support`.

## Still remote (framer CDN)

`src/app/page.tsx` hero still references 3 dashboard mockup PNGs and 5 AI logos
(Claude, Gemini, Perplexity, Meta AI, ChatGPT) from `framerusercontent.com`.
The local repo's `public/` has `preview-step-*.png` / `bg-*.png` equivalents —
swap when styling locally. `LandingNav`/`Footer` use `/logo-nuave.svg` (local).

## Copy note

Messages were trimmed with `_trim_messages.py` (whitelist of landing keys).
Run `python3 _trim_messages.py src/messages/en.json src/messages/id.json` to
re-apply after copy edits. Landing copy is agency-facing in the source repo —
VISION/PRODUCT target the SME owner; rework copy per the
`nuave-landing-pages` skill when modifying.

## Verify / merge later

- To preview in the real app: copy files under `src/` into the repo root
  (or replace the local landing), then `npm run dev`.
- `npm run check` at repo root covers `src/` only — this folder is not covered.
