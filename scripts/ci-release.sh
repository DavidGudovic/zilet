#!/usr/bin/env bash
set -euo pipefail
: "${GH_REPO:?}" "${RELEASE_SHA:?}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]
head=$(timeout 60 git ls-remote "https://github.com/$GH_REPO.git" refs/heads/main | cut -f1)
if [[ "$head" != "$RELEASE_SHA" ]]; then
  echo 'A newer main commit superseded this build.'
  exit 0
fi
tag="production-$RELEASE_SHA"
echo "Preparing GitHub release $tag"
if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" --target "$RELEASE_SHA" --draft \
    --title "Production ${RELEASE_SHA:0:12}" \
    --notes "Tested Docker image for $RELEASE_SHA. Installed automatically on zilet.me; no database, media volume or environment secrets are included."
fi
# Published assets are immutable for a given commit, including on a workflow rerun.
if [[ $(gh release view "$tag" --json isDraft --jq .isDraft) == true ]]; then
  uploaded=false
  for attempt in 1 2 3; do
    echo "Uploading the tested image (attempt $attempt of 3)"
    if timeout 90 gh release upload "$tag" release/zilet-image.tar.gz release/SHA256SUMS --clobber; then
      uploaded=true
      break
    fi
    if [[ $attempt != 3 ]]; then sleep 5; fi
  done
  [[ $uploaded == true ]] || { echo 'Image upload failed; the release remains a draft.' >&2; exit 1; }
  echo 'Image uploaded; publishing the release'
  gh release edit "$tag" --draft=false --latest
fi
echo 'Marking the tested release ready for deployment'
if gh api "repos/$GH_REPO/git/ref/tags/deploy-ready" >/dev/null 2>&1; then
  gh api --method PATCH "repos/$GH_REPO/git/refs/tags/deploy-ready" \
    -f sha="$RELEASE_SHA" -F force=true --silent
else
  gh api --method POST "repos/$GH_REPO/git/refs" \
    -f ref=refs/tags/deploy-ready -f sha="$RELEASE_SHA" --silent
fi
