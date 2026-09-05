#!/bin/sh
set -eu
umask 077
[ -f .env ] || cp .env.example .env
for key in BETTER_AUTH_SECRET POSTGRES_PASSWORD; do
  if ! grep -q "^${key}=.\+" .env; then
    value=$(openssl rand -hex 36)
    if grep -q "^${key}=" .env; then sed -i "s/^${key}=.*/${key}=${value}/" .env; else printf '\n%s=%s\n' "$key" "$value" >> .env; fi
  fi
done
if ! grep -q '^DATABASE_URL=.\+' .env; then
  password=$(sed -n 's/^POSTGRES_PASSWORD=//p' .env)
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgres://zilet:${password}@localhost:55439/zilet|" .env
fi
chmod 600 .env
echo 'Lokalna konfiguracija je spremna.'
