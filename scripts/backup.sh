#!/usr/bin/env bash
set -euo pipefail
umask 077
if [ -f .deploy/release.env ]; then
  if [ "${ZILET_DEPLOY_LOCKED:-}" != 1 ]; then
    exec 9>.deploy/lock
    flock 9
  fi
  set -a
  source .deploy/release.env
  set +a
fi
target="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$target"
# Pause writes so the database and media represent the same application state.
docker compose stop app
trap 'docker compose start app >/dev/null' EXIT
docker compose exec -T db pg_dump -U zilet -d zilet -Fc > "$target/database.dump"
docker compose run --rm --no-deps --entrypoint tar app -C /app/media -czf - . > "$target/media.tar.gz"
cp .env "$target/environment.env"
(cd "$target" && sha256sum database.dump media.tar.gz) > "$target/SHA256SUMS"
echo "Rezervna kopija: $target"
