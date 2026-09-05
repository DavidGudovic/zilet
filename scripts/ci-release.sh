#!/usr/bin/env bash
set -euo pipefail
: "${GH_REPO:?}" "${RELEASE_SHA:?}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]
head=$(git ls-remote "https://github.com/$GH_REPO.git" refs/heads/main | cut -f1)
if [[ "$head" != "$RELEASE_SHA" ]]; then
  echo 'A newer main commit superseded this build.'
  exit 0
fi
tag="production-$RELEASE_SHA"
if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" --target "$RELEASE_SHA" --draft \
    --title "Production ${RELEASE_SHA:0:12}" \
    --notes "Tested Docker image for $RELEASE_SHA. Installed automatically on zilet.me; no database, media volume or environment secrets are included."
fi
# Published assets are immutable for a given commit, including on a workflow rerun.
if [[ $(gh release view "$tag" --json isDraft --jq .isDraft) == true ]]; then
  gh release upload "$tag" release/zilet-image.tar.gz release/SHA256SUMS --clobber
  gh release edit "$tag" --draft=false --latest
fi
if gh api "repos/$GH_REPO/git/ref/tags/deploy-ready" >/dev/null 2>&1; then
  gh api --method PATCH "repos/$GH_REPO/git/refs/tags/deploy-ready" \
    -f sha="$RELEASE_SHA" -F force=true --silent
else
  gh api --method POST "repos/$GH_REPO/git/refs" \
    -f ref=refs/tags/deploy-ready -f sha="$RELEASE_SHA" --silent
fi
