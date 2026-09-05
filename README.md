# Žilet

Bespoke literary publication and editorial desk, in Montenegrin Latin. Next.js App Router, React, TypeScript, PostgreSQL, Drizzle, Better Auth and Tiptap. Everything runs on the owner's machine/VPS; no hosted CMS or platform storage.

## Run in Docker

Requires Docker Engine with Compose v2, Make and OpenSSL. From this directory:

```sh
make up
```

This generates a private `.env` with random secrets, builds the app, starts PostgreSQL and a **local mail sink**, applies migrations, and waits for health checks. Open http://localhost:3000. The first installation is intentionally empty. Load the two supplied pieces and documented CC0 development artwork explicitly:

```sh
make seed
```

Seeds refuse a non-local `APP_URL`; they never create an editor or a production password. The original Facebook article images were not supplied. Development illustrations are identified in their captions and in `fixtures/asset-manifest.json`.

```sh
make down      # stop/remove containers, preserve database and media volumes
make up        # restart, rebuilding changes when necessary
make logs      # follow app logs
```

`down` does not use `--volumes`. Docker volumes `zilet_database` and `zilet_media` contain the durable data. Do not delete them to update the app. The app binds only to `127.0.0.1:3000`; Mailpit's inbox binds to `127.0.0.1:8025`. Adjust `APP_PORT`, `APP_URL`, `BETTER_AUTH_URL` and `MAIL_PORT` together if needed.

## First editor / maintainer

Owner-only tooling runs through a shell on the host, never through public registration:

```sh
make owner ARGS='--email editor@example.test --name "Urednik" --role editor'
```

For a local test use an address ending in `.test`, then open http://localhost:8025. Open the **verification** message and the **password recovery** message to verify the address and choose a password. Passwords require 12–128 characters. There is no preset password. Use `--role maintainer` for the owner's technical account. A byline such as Zoran Đurović does not grant an account or editorial privileges.

On a real deployment the same command sends real invitations, so run it only for confirmed recipients. If an account already exists, the command stops; the owner can change its role deliberately through PostgreSQL on the host, revoke its sessions, and use the recovery form. No HTTP endpoint accepts privileged roles from a public client.

Readers register at `/nalog?mode=register`, confirm their email, and sign in to comment. `/oporavak` starts recovery. If SMTP is absent, registration/recovery show an unavailable state rather than claiming delivery. `REGISTRATION_ENABLED=false` closes new registration while retaining existing-account recovery.

## Development and checks

Use Node 24. Install the exact lockfile and run local database/mail services:

```sh
npm ci
make dev
```

Do not run `make dev` alongside the container app on the same port. In development PostgreSQL is exposed at `127.0.0.1:55439`, SMTP at `127.0.0.1:1025`; `make dev` supplies the host SMTP override. `/specimen` compares the two studied typefaces, and `/specimen/layout?case=short`, `long`, or `gallery` exercises awkward layouts. These routes and `/dev-art` return 404 in production. `DEMO_MODE=true` is an optional **development-only** read fixture; normal operation uses PostgreSQL.

```sh
make test                   # unit/contract checks and TypeScript
npm run test:e2e             # real HTTP + database + Mailpit acceptance suite
npm run build               # production compilation
npm run format:check        # source formatting
```

The acceptance suite is **only for a disposable localhost database**: it clears rate-limit counters and creates labeled accounts, authors, drafts, images and comments. It never runs against a non-local `APP_URL`. Use `docker compose -f compose.yaml -f compose.dev.yaml up -d db mail` if testing the container app from the host; `make up` restores private production port bindings afterward. The extra `tests/integration/archive.mjs` check requires the local seed, creates clearly marked temporary archive content and preserves placements in `/tmp/zilet-archive-fixtures.json`; run it with `--cleanup` after inspection, before recreating its container. Browser inspection evidence and actual API results live in `docs/verification/`. No unmeasured Lighthouse or WCAG conformance score is claimed.

## Editing and content

See [the one-page editor guide](docs/editor-guide.md). `/redakcija` has Texts, Photos, Comments and Statistics. Every private page and API checks the session's current database role. New pieces autosave draft revisions; published work only changes on **Objavi izmjene**. A version conflict stops overwriting, retains the local unsaved text in the open window and offers the stored version separately. Keep that window open until the conflict or failed save is resolved. Revisions retain the most recent 30 saves plus the live version.

Canonical verse is plain text plus emphasis ranges; visual wrapping never rewrites authored lines. The source fixtures retain original zero-width characters, blank lines and backslash/tildes; signatures become structured attribution without displaying twice. Rich prose is schema-checked JSON, rendered as safe React elements. There is no raw HTML publication path.

Homepage placements are `Glavni tekst`, `Izbor poezije`, and `Umjetnost`, with recent-work fallbacks and no adjacent duplication. Choices work even when a selected work is older than the first archive page. Publishing and moderation are immediately reflected in server-rendered pages without a rebuild. Public document responses and private/media responses use no-store caching; static versioned fonts/assets retain framework caching. This intentionally favors correctness for a small publication over a shared content cache.

Only editors upload JPG/PNG/WebP, up to 12 MB and 40 million pixels. Sharp checks decoded format, rejects executable SVG/animation, orients and re-encodes a normalized private master plus display/small WebP derivatives. Public derivatives strip metadata. The original uploaded bytes are not retained; the normalized master is. Media are served only when linked by a live revision or an approved published author's portrait, or to an editor. No remote-image fetching or public uploads.

Approved biography/portrait updates are owner-operated, without adding another desk section:

```sh
docker compose cp ./approved-bio.txt app:/tmp/approved-bio.txt
docker compose exec app node --import tsx scripts/author.ts --slug AUTHOR-SLUG --bio-file /tmp/approved-bio.txt
```

For a rights-cleared portrait, copy the file similarly and supply `--portrait-file`, `--alt`, `--credit`, and `--actor-email` (existing editor/maintainer). `--remove-portrait` withdraws it. Never use a generated or unapproved portrait of a real contributor.

## Backups and restoration

```sh
make backup
CONFIRM_RESTORE=yes make restore BACKUP=backups/YYYYMMDDTHHMMSSZ
```

Backup briefly stops the app to pair a consistent PostgreSQL dump with persistent media. It saves `database.dump`, `media.tar.gz`, checksums and the private environment, then restarts the app. Keep the resulting directory confidential and copy it off-host using the owner's normal encrypted backup process. A database-only backup does not include pictures.

Restore verifies checksums, stops writes, replaces the application database and restores media, then restarts. It leaves old unreferenced media private. The explicit confirmation variable is required because existing data are replaced. On a fresh host restore the backed-up `.env` securely (review URLs/mail settings first), run `make up`, and then restore. Never print the environment or commit backups. The backup/restore scripts cover the publication; optional Umami requires its own database backup.

SQL migrations in `migrations/` run before app startup, recorded in `zilet_migrations`. Back up before updates, inspect changes, and use `make up`. There is no automatic destructive rollback. Reverting application code does not necessarily revert a schema migration.

## VPS launch

See [production deployment and CI/CD](docs/deployment.md) and [the launch checklist](docs/launch-checklist.md). Pushes to `main` run GitHub checks, package the tested container and trigger automatic installation on the VPS. The production container is installed on loopback port 3100. Nginx/TLS and the deployment timer are prepared but await working sudo authentication; public HTTPS is not yet enabled. Production uses `compose.production.yaml`, separate persistent data, strong server-generated secrets and no Mailpit. `make up` / `make down` work on both the server and locally; production `make down` also pauses automatic deployment until `make up`. Registration remains disabled until real transactional SMTP is configured. Secure cookies follow the HTTPS app URL; SMTP and analytics credentials remain server-only.

## Optional Umami

`compose.analytics.yaml` pins the verified official Umami 3.3.1 image by digest and creates a separate PostgreSQL database/volume. Add separate `UMAMI_DB_PASSWORD` and `UMAMI_APP_SECRET` secrets to `.env`, then:

```sh
docker compose -f compose.yaml -f compose.analytics.yaml up -d
```

Open the loopback-only http://localhost:3001 through an SSH tunnel when remote. Change Umami's initial administrator credentials before use, create the website for the actual public origin, then set `UMAMI_URL=http://umami:3000`, `UMAMI_WEBSITE_ID`, `UMAMI_USERNAME`, and `UMAMI_PASSWORD`. Restart the app with the same Compose files. Stop the combined stack with `docker compose -f compose.yaml -f compose.analytics.yaml down`. To retain the same `make up` / `make down` workflow with analytics enabled, set `COMPOSE_FILE=compose.yaml:compose.analytics.yaml` in `.env`.

The custom statistics page queries seven/thirty-day stats and expanded path/referrer metrics (`pageviews`, not the basic endpoint's visitor count). Collection uses one public-route tracker and a server proxy, never private routes, query strings, account IDs, names, emails or comments. Referrers are reduced to an external origin. Unconfigured/unreachable services show truthful states; analytics never gates reading. Review the privacy text and collection decision before enabling.

## Design and handoff

[Concept](docs/design/concept.md) · [Identity notes](docs/design/identity.md) · [Identity sheet](docs/design/identity-sheet.html) · [Final report](docs/final-report.md). SVGs and branded social preview are in `public/identity/`; original vector construction is `scripts/identity.mjs`. Source Serif 4 and Source Sans 3 are self-hosted with license/provenance files. The owner authorized production deployment and import of both supplied texts with the current credited illustrations on 2026-09-06. DNS was already configured; no DNS records or external mail services were changed.
