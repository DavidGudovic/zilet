#!/usr/bin/env bash
set -euo pipefail
action=${1:?up or down required}
[[ "$action" == up || "$action" == down ]]
if [[ -f .deploy/release.env ]]; then
  # Serialize operator commands with the deployer. Load the image after taking
  # the lock because a deployment may have finished while this command waited.
  [[ "$action" != down ]] || touch .deploy/paused
  exec 9>.deploy/lock
  flock 9
  set -a
  source .deploy/release.env
  set +a
  if [[ "$action" == up ]]; then
    rm -f .deploy/paused
    docker compose up -d --no-build --wait
  else
    docker compose down
  fi
elif [[ "$action" == up ]]; then
  docker compose up -d --build --wait
else
  docker compose down
fi
