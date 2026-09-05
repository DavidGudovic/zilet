#!/usr/bin/env bash
set -euo pipefail

# A release is eligible only when CI's ready tag and the current main agree.
eligible_release() {
  [[ "$1" =~ ^[0-9a-f]{40}$ && "$1" == "$2" ]]
}

main() {
  umask 077
  local root=/var/www/html/zilet
  local repo=https://github.com/DavidGudovic/zilet
  cd "$root"
  mkdir -p .deploy
  exec 9>.deploy/lock
  flock -n 9 || return 0
  [[ ! -f .deploy/paused ]] || return 0
  local refs sha ready current previous stage revision
  refs=$(git ls-remote "$repo.git" refs/heads/main refs/tags/deploy-ready)
  sha=$(awk '$2 == "refs/heads/main" {print $1}' <<< "$refs")
  ready=$(awk '$2 == "refs/tags/deploy-ready" {print $1}' <<< "$refs")
  eligible_release "$sha" "$ready" || return 0
  current=$(cat .deploy/current 2>/dev/null || true)
  [[ "$sha" != "$current" ]] || return 0
  [[ "$sha" != "$(cat .deploy/failed 2>/dev/null || true)" ]] || return 0
  echo "Preparing tested release $sha"
  stage=$(mktemp -d "$root/.deploy/download.XXXXXX")
  trap "$(printf 'rm -rf -- %q' "$stage")" EXIT
  curl --fail --location --silent --show-error --retry 3 --max-time 300 \
    --proto '=https' --proto-redir '=https' \
    "$repo/releases/download/production-$sha/zilet-image.tar.gz" -o "$stage/zilet-image.tar.gz"
  curl --fail --location --silent --show-error --retry 3 --max-time 30 \
    --proto '=https' --proto-redir '=https' \
    "$repo/releases/download/production-$sha/SHA256SUMS" -o "$stage/SHA256SUMS"
  [[ $(wc -l < "$stage/SHA256SUMS") == 1 ]]
  grep -Eq '^[0-9a-f]{64}  zilet-image.tar.gz$' "$stage/SHA256SUMS"
  (cd "$stage" && sha256sum -c SHA256SUMS)
  docker load --input "$stage/zilet-image.tar.gz"
  revision=$(docker image inspect "zilet/app:$sha" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ "$revision" == "$sha" ]]
  git fetch --quiet --no-tags "$repo.git" "$sha"
  [[ $(git rev-parse FETCH_HEAD) == "$sha" ]]
  refs=$(git ls-remote "$repo.git" refs/heads/main refs/tags/deploy-ready)
  eligible_release "$sha" "$(awk '$2 == "refs/heads/main" {print $1}' <<< "$refs")" || return 0
  eligible_release "$sha" "$(awk '$2 == "refs/tags/deploy-ready" {print $1}' <<< "$refs")" || return 0

  previous=$current
  if [[ -n "$previous" ]]; then
    # A backup failure leaves the running release untouched and stops deployment.
    bash scripts/backup.sh
    cp .deploy/release.env .deploy/previous.env
  fi
  git reset --hard "$sha"
  printf 'ZILET_IMAGE=zilet/app:%s\nRELEASE_SHA=%s\n' "$sha" "$sha" > .deploy/release.env
  local -a compose=(docker compose --env-file .env --env-file .deploy/release.env -f compose.production.yaml)
  if "${compose[@]}" up -d --no-build --wait --wait-timeout 150 \
      && curl --fail --silent --max-time 10 http://127.0.0.1:3100/api/health \
        | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["status"] == "ok" and d["release"] == sys.argv[1]' "$sha"; then
    printf '%s\n' "$sha" > .deploy/current.tmp
    mv .deploy/current.tmp .deploy/current
    printf '%s\n' "$previous" > .deploy/previous
    rm -f .deploy/failed
    echo "Deployed $sha"
    # Only remove old images owned by this application; never prune shared Docker state.
    while read -r revision; do
      if [[ "$revision" =~ ^[0-9a-f]{40}$ && "$revision" != "$sha" && "$revision" != "$previous" ]]; then
        docker image rm "zilet/app:$revision" || true
      fi
    done < <(docker image ls zilet/app --format '{{.Tag}}')
  else
    printf '%s\n' "$sha" > .deploy/failed
    echo "Release $sha failed health checks." >&2
    "${compose[@]}" logs --tail=60 app >&2 || true
    if [[ -n "$previous" ]]; then
      git reset --hard "$previous"
      cp .deploy/previous.env .deploy/release.env
      "${compose[@]}" up -d --no-build --wait --wait-timeout 150
      echo "Restored application $previous. Database migrations are not automatically reversed; backup is retained." >&2
    else
      "${compose[@]}" stop app
    fi
    return 1
  fi
  rm -rf -- "$stage"
  trap - EXIT
}

# The function is parsed before execution, so updating this checkout cannot alter
# a deployment already in flight. The next timer run uses the new script.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
