# Editorial refresh maintenance

These are explicit owner operations, never automatic startup/CI actions. Deploy
and run migrations before importing the new profiles. Migration 003 adds a
boolean to `authors`; the previous app ignores it, so application rollback remains
compatible. Production deployment already creates a backup before migrating.

## Accounts without SMTP

`scripts/provision-editor.ts` creates a confirmed editor and credential account
transactionally with Better Auth's password hash and local issuer format. It
refuses existing addresses and never resets credentials. The normal mail invitation
script is unchanged. Public registration still cannot assign editorial roles.

Pass `--email`, `--name` and `--confirm-owner-verified` and supply the password on
standard input, using `docker compose exec -T` so it never becomes a command-line
argument. `--starter-password` is an explicit maintenance-only exception allowing
an owner-selected 8-character initial password. Normal new passwords retain the
12-character minimum. Do not record passwords in this repository.

The two requested identities are Savka Gudović Parađina and Editor Dva. Each has a
separate account and a separate credited public profile. The latter has an honest
placeholder biography. Editors can update the biographies under **Autori** and
change their own password under **Moj nalog**, without SMTP.

## Additive content import

After editor 1 exists:

```sh
docker compose --env-file .env --env-file .deploy/release.env exec -T app \
  node --import tsx scripts/import-savka.ts --confirm-publication
```

It accepts only the known production origin or localhost. It creates *Slike*,
*Nestajanja*, *Breze* and their profiles, using fixed IDs and a transaction lock.
It never updates an already-imported poem, biography, account or existing work.
Homepage placement is changed only when the selected imported post is first created.
A repeat execution is safe. See `docs/verification/editorial-refresh-sources.md`.
