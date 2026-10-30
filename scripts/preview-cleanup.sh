#!/usr/bin/env bash
# Removes leftover PR preview workers (nuave-pr-<number>) whose PR is no
# longer open, used by .github/workflows/preview-cleanup.yml.
#
# The PR Preview workflow removes a preview when its PR closes. This is the
# safety net for previews that removal missed.
#
# Environment:
#   REPO                   owner/name, for example yasir-mukhtar/nuave_v0.2
#   DRY_RUN                "true" lists what would happen without changing anything
#   GH_TOKEN               token with pull-requests: read (read by gh)
#   CLOUDFLARE_API_TOKEN   token that can delete Workers
#   CLOUDFLARE_ACCOUNT_ID  the Cloudflare account that holds the previews
set -euo pipefail

: "${REPO:?REPO is required}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
DRY_RUN="${DRY_RUN:-false}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
API="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts"

# Previews of the PRs parked by founder decision 2026-10-03 (see AGENTS.md)
# are kept with the rest of their work.
PARKED_PRS="102
115
116"

cf() {
  curl --silent --show-error --fail-with-body \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$@"
}

# Load both lists in full first, so a failed lookup stops the run instead of
# treating a preview as unused.
open_prs="$(gh api --paginate "repos/$REPO/pulls?state=open&per_page=100" --jq '.[].number')"
workers_json="$(cf "$API")"
if [[ "$(jq -r '.success' <<<"$workers_json")" != "true" ]]; then
  echo "::error::Could not list Cloudflare Workers."
  exit 1
fi
previews="$(jq -r '.result[].id | select(test("^nuave-pr-[0-9]+$"))' <<<"$workers_json" | sort -t- -k3 -n)"

{
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "### Preview cleanup (dry run, nothing changed)"
  else
    echo "### Preview cleanup"
  fi
  echo
} >>"$SUMMARY"

removed=0 kept=0 failed=0
while IFS= read -r worker; do
  [[ -n "$worker" ]] || continue
  pr="${worker#nuave-pr-}"
  if grep -Fxq -- "$pr" <<<"$open_prs"; then
    echo "- keep \`$worker\`: PR #$pr is open" >>"$SUMMARY"
    kept=$((kept + 1))
  elif grep -Fxq -- "$pr" <<<"$PARKED_PRS"; then
    echo "- keep \`$worker\`: PR #$pr is parked" >>"$SUMMARY"
    kept=$((kept + 1))
  elif [[ "$DRY_RUN" == "true" ]]; then
    echo "- would remove \`$worker\`" >>"$SUMMARY"
    removed=$((removed + 1))
  elif result="$(cf -X DELETE "$API/$worker?force=true")" &&
    [[ "$(jq -r '.success' <<<"$result")" == "true" ]]; then
    echo "- removed \`$worker\`" >>"$SUMMARY"
    removed=$((removed + 1))
  else
    echo "::error::Could not remove $worker."
    echo "- **failed** to remove \`$worker\`" >>"$SUMMARY"
    failed=$((failed + 1))
  fi
done <<<"$previews"

verb="Removed"
[[ "$DRY_RUN" == "true" ]] && verb="Would remove"
printf '\n%s %d, kept %d, failed %d.\n' "$verb" "$removed" "$kept" "$failed" >>"$SUMMARY"
echo "$verb $removed, kept $kept, failed $failed."
[[ "$failed" -eq 0 ]]
