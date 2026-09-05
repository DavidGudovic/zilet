# Production deployment

The intended public origin is **https://zilet.me**. The production container is
installed and healthy on `127.0.0.1:3100`. The prepared Nginx configuration adds
only this virtual host; the other sites keep their own configuration.

**Installation status, 2026-09-06:** GitHub builds and integration checks passed,
and the tested release was installed manually. Both approved texts and the
credited illustration are in the production database/media volume. Nginx/TLS
and `zilet-deploy.timer` are not installed yet: sudo rejected the supplied
password. The final HTTPS workflow check therefore cannot pass yet. The owner
can complete the prepared setup with `sudo bash /tmp/zilet-bootstrap-root.sh`
on `ssh zilet` (versioned source: `deploy/bootstrap-host.sh`). Then verify
`https://zilet.me/api/health` and `systemctl is-active zilet-deploy.timer`.
The application and PostgreSQL run in the `zilet` Docker Compose project under
`/var/www/html/zilet`. The database and media volumes survive every code deployment.

## Push to publish

Push or merge to `main` in `DavidGudovic/zilet`. The **Test and deploy** workflow:

1. Checks formatting, TypeScript, content/auth contracts and the deployment gate.
2. Builds the Docker image on GitHub, then runs the real HTTP acceptance suite
   against that image with a disposable PostgreSQL database and Mailpit.
3. Publishes the exact tested image and SHA-256 checksum as a GitHub Release named
   `production-COMMIT`, then advances the `deploy-ready` tag to that commit.
4. Waits for the HTTPS health endpoint to report that exact commit. A failed or
   timed-out deployment makes the workflow fail, visible in the Actions tab.

The server's `zilet-deploy.timer` checks every minute. It deploys only if `main`
and `deploy-ready` agree, verifies the archive checksum and image revision label,
backs up an existing publication, starts the image, runs database migrations,
and verifies health. New pushes supersede older queued releases. Pull requests
run checks but cannot publish. GitHub actions are pinned to immutable commits.

This is a pull deployment using public GitHub Release assets. It requires no
GitHub administrator session, personal access token, inbound webhook or server
SSH key stored in Actions. The repository and image releases are public; images
contain application code/assets, never `.env`, database dumps or uploaded media.
The server never compiles the site. Allow a few minutes for checks/builds and up
to one minute for the server to discover a ready release.

## Daily commands

```sh
ssh zilet
make down        # pause automatic deployment and stop only Žilet; keep data
make up          # resume and start the installed image
make logs
make backup
make deploy-status
journalctl -u zilet-deploy.service -n 100 --no-pager
```

The server `.env` selects `COMPOSE_FILE=compose.production.yaml`.
`.deploy/release.env` records the installed image and revision. Local development
continues to use `compose.yaml` with the same `make up` / `make down` commands.
Production has no Mailpit service and exposes neither PostgreSQL nor app port
3100 publicly. Nginx overwrites forwarded IP/origin headers and permits 16 MB
requests (the app's decoded-image validation still limits uploads to 12 MB).

To pause deployment without stopping the website, run `touch .deploy/paused`.
Remove that file to resume. An unsuccessful container start records
`.deploy/failed` and restores the previous application image and checkout when
available; it does not retry that bad commit every minute. Push a correction, or
remove `.deploy/failed` after investigating to retry the same commit.

Application rollback does **not** reverse database migrations. Make migrations
backward compatible. Backups include the database, media and private environment;
if a schema change prevents the older app running, use the documented restore
procedure deliberately. Automatic backups remain on this host: the owner must
set an off-host destination and retention policy. Images are retained for the
current and previous deployment only; no global Docker prune touches other sites.

## Server installation / recovery

Provision a private production `.env` with fresh secrets and HTTPS URLs. Keep
SMTP empty and registration disabled until authenticated delivery is configured.
Install `deploy/zilet-deploy` as `/usr/local/bin/zilet-deploy` (0755), and the
matching `.service` and `.timer` under `/etc/systemd/system` (0644). Run
`systemctl daemon-reload` and `systemctl enable --now zilet-deploy.timer`.
The deploy service runs as `david`, already a member of the host's Docker group.
Its stable launcher executes the script from the installed checkout; future
deployments update that script along with the app.

Install only the `zilet.me` Nginx virtual host from `deploy/nginx.conf`. TLS uses
the existing Certbot account, HTTP webroot `/var/www/letsencrypt`, and the host's
Certbot renewal timer. A deployment hook validates/reloads Nginx after renewal.
Always run `nginx -t` before reload; never replace the shared Nginx configuration.
The `www` hostname has no DNS record and is not configured or claimed.

One-time content import, explicitly approved by the owner on 2026-09-06:

```sh
make backup
docker compose --env-file .env --env-file .deploy/release.env exec app \
  node --import tsx scripts/import-approved.ts --confirm-publication
```

This publishes the two supplied Zoran Đurović pieces and the current credited CC0
illustration. It preserves canonical authored text and does not overwrite
existing posts. Seeds/imports never run during deployment. Account invitations,
SMTP, analytics and policy wording remain separate owner launch decisions.
