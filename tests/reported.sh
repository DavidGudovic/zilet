#!/usr/bin/env bash
# Runs one CI suite. When it fails, its last lines also become a GitHub error annotation:
# annotations are readable through the public checks API, run logs only with a signed-in session.
set -uo pipefail
name=$1
shift
log=$(mktemp)
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ] && [ "${GITHUB_ACTIONS:-}" = true ]; then
  printf '::error title=%s failed::' "$name"
  tail -n 40 "$log" | sed -e 's/%/%25/g' -e 's/\r/%0D/g' | awk '{ printf "%s%%0A", $0 }'
  echo
fi
rm -f "$log"
exit "$status"
