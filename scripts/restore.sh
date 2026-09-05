#!/usr/bin/env bash
set -euo pipefail
if [ -f .deploy/release.env ]; then
  exec 9>.deploy/lock
  flock 9
  set -a
  source .deploy/release.env
  set +a
fi
source_dir="$1"
[ -f "$source_dir/database.dump" ] && [ -f "$source_dir/media.tar.gz" ] || { echo 'Nepotpuna rezervna kopija.' >&2; exit 1; }
# Require an explicit confirmation variable because restore replaces existing data.
[ "${CONFIRM_RESTORE:-}" = 'yes' ] || { echo 'Obnova zamjenjuje bazu. Pokrenite CONFIRM_RESTORE=yes make restore BACKUP=… nakon rezervne kopije.' >&2; exit 1; }
(cd "$source_dir" && sha256sum -c SHA256SUMS)
docker compose stop app
trap 'docker compose start app >/dev/null' EXIT
docker compose exec -T db pg_restore -U zilet -d zilet --clean --if-exists --no-owner < "$source_dir/database.dump"
# Old unreferenced media may remain, but can never become public without a database reference.
docker compose run --rm -T --no-deps --entrypoint tar app -C /app/media -xzf - < "$source_dir/media.tar.gz"
echo 'Baza i fotografije su obnovljene. Provjerite APP_URL i konfiguraciju pošte prije javnog otvaranja.'
