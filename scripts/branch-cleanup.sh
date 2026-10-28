#!/usr/bin/env bash
# Archive-then-delete for finished branches, used by
# .github/workflows/branch-cleanup.yml.
#
# Every branch is first saved as a tag named archive/<branch>, so its work
# can always be brought back. Only then is the branch deleted.
#
# Usage:
#   branch-cleanup.sh closed-pr <branch>       one branch whose PR was closed
#   branch-cleanup.sh sweep <min-age-days>     every branch without an open PR
#
# Environment:
#   REPO            owner/name, for example yasir-mukhtar/nuave_v0.2
#   KEEP_BRANCHES   newline-separated branch names that are never touched
#   DRY_RUN         "true" lists what would happen without changing anything
#   GH_TOKEN        token with contents: write (read by gh)
set -euo pipefail

: "${REPO:?REPO is required}"
DRY_RUN="${DRY_RUN:-false}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

default_branch="$(gh api "repos/$REPO" --jq .default_branch)"

is_kept() {
  local branch="$1"
  printf '%s\n' "${KEEP_BRANCHES:-}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
    grep -Fxq -- "$branch"
}

open_pr_branches() {
  gh api --paginate "repos/$REPO/pulls?state=open&per_page=100" \
    --jq ".[] | select(.head.repo.full_name == \"$REPO\") | .head.ref"
}

# gh prints the error body on stdout for a 404, so only trust a clean exit.
ref_sha() {
  local sha
  if sha="$(gh api "repos/$REPO/git/ref/$1" --jq .object.sha 2>/dev/null)"; then
    printf '%s' "$sha"
  fi
}

# Prints the branch's current commit, or nothing when the branch is gone.
branch_sha() { ref_sha "heads/$1"; }

tag_sha() { ref_sha "tags/$1"; }

archive_and_delete() {
  local branch="$1" sha="$2" tag="archive/$1" existing
  existing="$(tag_sha "$tag")"
  if [[ -n "$existing" && "$existing" != "$sha" ]]; then
    # An older archive with this name holds different work; keep both.
    tag="archive/$branch--${sha:0:7}"
    existing="$(tag_sha "$tag")"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "- would archive \`$branch\` as \`$tag\` and delete it" >>"$SUMMARY"
    return
  fi

  if [[ -z "$existing" ]]; then
    gh api -X POST "repos/$REPO/git/refs" \
      -f ref="refs/tags/$tag" -f sha="$sha" >/dev/null
  fi
  # Never delete unless the archive tag really points at the branch's work.
  if [[ "$(tag_sha "$tag")" != "$sha" ]]; then
    echo "- **skipped** \`$branch\`: archive tag \`$tag\` could not be confirmed" >>"$SUMMARY"
    return 1
  fi
  gh api -X DELETE "repos/$REPO/git/refs/heads/$branch" >/dev/null
  echo "- archived \`$branch\` as \`$tag\` and deleted it" >>"$SUMMARY"
}

cleanup_closed_pr() {
  local branch="$1" sha
  if [[ "$branch" == "$default_branch" ]] || is_kept "$branch"; then
    echo "- kept \`$branch\` (on the keep list)" >>"$SUMMARY"
    return
  fi
  if open_pr_branches | grep -Fxq -- "$branch"; then
    echo "- kept \`$branch\` (another open PR still uses it)" >>"$SUMMARY"
    return
  fi
  sha="$(branch_sha "$branch")"
  if [[ -z "$sha" ]]; then
    echo "- \`$branch\` was already deleted" >>"$SUMMARY"
    return
  fi
  archive_and_delete "$branch" "$sha"
}

sweep() {
  local min_age_days="$1" now open branch sha date age failed=0
  if ! [[ "$min_age_days" =~ ^[0-9]+$ ]]; then
    echo "minimum age must be a whole number of days, got: $min_age_days" >&2
    return 2
  fi
  now="$(date +%s)"
  open="$(open_pr_branches)"
  echo "### Branch cleanup (dry run: $DRY_RUN, minimum age: $min_age_days days)" >>"$SUMMARY"

  while read -r branch sha; do
    if [[ "$branch" == "$default_branch" ]]; then
      continue
    fi
    if is_kept "$branch"; then
      echo "- kept \`$branch\` (on the keep list)" >>"$SUMMARY"
      continue
    fi
    if printf '%s\n' "$open" | grep -Fxq -- "$branch"; then
      echo "- kept \`$branch\` (has an open PR)" >>"$SUMMARY"
      continue
    fi
    date="$(gh api "repos/$REPO/commits/$sha" --jq .commit.committer.date)"
    age=$(((now - $(date -d "$date" +%s)) / 86400))
    if ((age < min_age_days)); then
      echo "- kept \`$branch\` (last change $age days ago, may still be in progress)" >>"$SUMMARY"
      continue
    fi
    archive_and_delete "$branch" "$sha" || failed=1
  done < <(gh api --paginate "repos/$REPO/branches?per_page=100" \
    --jq '.[] | "\(.name) \(.commit.sha)"')

  return "$failed"
}

case "${1:-}" in
  closed-pr) cleanup_closed_pr "${2:?branch name required}" ;;
  sweep) sweep "${2:-7}" ;;
  *)
    echo "usage: $0 closed-pr <branch> | sweep <min-age-days>" >&2
    exit 2
    ;;
esac
