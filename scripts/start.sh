#!/bin/sh
set -eu
if [ -z "${BETTER_AUTH_SECRET:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
  echo 'Nedostaje BETTER_AUTH_SECRET ili DATABASE_URL.' >&2
  exit 1
fi
node --import tsx scripts/migrate.ts
exec node server.js
