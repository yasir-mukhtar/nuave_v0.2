#!/bin/bash
# Fetch landing-page-only files from yasir-mukhtar/nuave (PRIVATE) into LP-remote/
# Preserves repo-relative structure for easy diff/merge later. No auth/audit/billing/blog code.
set -euo pipefail

REPO="yasir-mukhtar/nuave"
DEST="/Users/yasir/nuave_v0.2/LP-remote"

FILES=(
  "src/app/page.tsx"
  "src/app/layout.tsx"
  "src/app/globals.css"
  "src/app/robots.ts"
  "src/app/sitemap.ts"
  "src/components/LandingNav.tsx"
  "src/components/Footer.tsx"
  "src/components/HowItWorks.tsx"
  "src/components/VisibilityScoreChart.tsx"
  "src/components/RecommendationsPreview.tsx"
  "src/components/PromptResultPreview.tsx"
  "src/components/SmoothScroll.tsx"
  "src/components/LanguageSwitcher.tsx"
  "src/components/dashboard/ActionItemPanel.tsx"
  "src/app/(dashboard)/findings/_components/severity-badge.tsx"
  "src/messages/en.json"
  "src/messages/id.json"
  "src/i18n/request.ts"
  "src/i18n/routing.ts"
  "src/lib/utils.ts"
  "public/logo-nuave.svg"
  "public/bg-cta.png"
  "public/bg-footer-2.png"
  "public/bg-orange.png"
  "public/bg-purple.png"
  "public/bg-step-1.png"
  "public/bg-step-2.png"
  "public/bg-step-3.png"
  "public/preview-step-1.png"
  "public/preview-step-2.png"
  "public/preview-step-3.png"
  "public/favicon.svg"
)

for f in "${FILES[@]}"; do
  out="$DEST/$f"
  mkdir -p "$(dirname "$out")"
  # Raw accept header returns file bytes verbatim (works for both text and binaries)
  if gh api -H "Accept: application/vnd.github.raw+json" "repos/$REPO/contents/$f" > "$out" 2>/tmp/gh_err.txt; then
    echo "OK   $f ($(wc -c < "$out" | tr -d ' ') bytes)"
  else
    echo "FAIL $f :: $(cat /tmp/gh_err.txt)"
  fi
done
