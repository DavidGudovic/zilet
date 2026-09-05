#!/usr/bin/env bash
set -euo pipefail
source scripts/deploy.sh
good=0123456789abcdef0123456789abcdef01234567
other=abcdef0123456789abcdef0123456789abcdef01
eligible_release "$good" "$good"
if eligible_release "$good" "$other"; then echo 'Unchecked commit accepted' >&2; exit 1; fi
if eligible_release "$good" ''; then echo 'Missing CI approval accepted' >&2; exit 1; fi
if eligible_release 'main;echo unsafe' 'main;echo unsafe'; then echo 'Invalid SHA accepted' >&2; exit 1; fi
for script in scripts/*.sh deploy/zilet-deploy; do bash -n "$script"; done
echo 'PASS deployment approval gate and shell syntax'
