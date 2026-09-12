# Umami statistics

The editorial statistics page uses a self-hosted Umami instance. It is optional:
when the four `UMAMI_*` application variables are absent, the page says that no
statistics are connected and public reading remains unaffected.

## Start the service

Generate separate values for `UMAMI_DB_PASSWORD` and `UMAMI_APP_SECRET`, then
start the analytics compose file alongside the normal project compose files. The
database has its own `analytics_database` volume and is not the Žilet content
database.

```sh
docker compose -f compose.yaml -f compose.analytics.yaml up -d umami-db umami
```

The service binds only to `127.0.0.1:${UMAMI_PORT:-3001}`. On the shared production
host, Žilet uses `UMAMI_PORT=3101` because port 3001 belongs to another service.
Reach it through an SSH tunnel or a
deliberately configured private reverse-proxy route; do not expose its database
or its initial account to the public internet. On first sign-in, change Umami's
initial password, create the Žilet website entry, and copy its website ID.

Set the app variables in the private runtime environment:

```txt
UMAMI_URL=http://umami:3000
UMAMI_WEBSITE_ID=<website ID created in Umami>
UMAMI_USERNAME=<dedicated read-only reporting account>
UMAMI_PASSWORD=<that account's password>
TRUST_PROXY=true
```

`UMAMI_URL` is only read on the server. The browser sends public pageview data
to Žilet's `/api/analytics` proxy, which passes the actual client IP only when
the trusted reverse proxy supplies `X-Real-IP`. Keep `TRUST_PROXY=false` unless
that proxy is configured. The proxy retains only a referrer's origin and does
not send editorial routes, account routes, or query strings.

Umami calculates its page-duration estimate from the time between recorded
pageviews. A reader who opens a single page and leaves produces no second timing
boundary, so the estimate can be zero. It is useful for comparing browsing
patterns, not proof that a text was read in full.

## Updating Umami

`compose.analytics.yaml` pins a verified Umami `3.3.1` image by its
multi-platform digest. Docker uses that immutable content address, so a changed
`latest` tag cannot silently replace the image. To update it, choose a specific
upstream release, inspect its multi-platform digest, change the reference
deliberately, and test login, one pageview, the
`/stats` endpoint and the editorial dashboard against a disposable analytics
database before replacing the durable service. Umami migrations run at startup;
back up the analytics volume before an upgrade.

Official references: [Umami installation](https://docs.umami.is/docs/install),
[sending stats](https://docs.umami.is/docs/api/sending-stats), and [website
statistics API](https://docs.umami.is/docs/api/website-stats).

## Existing production installation

On the server, keep the current production image selection. Add the analytics
secrets and reporting variables above to `.env`, and set:

```dotenv
COMPOSE_FILE=compose.production.yaml:compose.analytics.yaml
UMAMI_PORT=3101
```

From `/var/www/html/zilet`, start the analytics services with the installed
release environment available:

```sh
docker compose --env-file .env --env-file .deploy/release.env up -d umami-db umami
```

After creating the website/reporting account, `make up` recreates the app with
its analytics credentials. The deploy timer continues updating the publication
image; it does not replace the separate analytics services. `make down` with
the combined `COMPOSE_FILE` stops both while preserving their volumes.

The publication backup script does not back up Umami. Keep a separate backup and
retention policy for `analytics_database`; do not reuse the content database or
its credentials. No production service is started by these documentation changes.


## Editorial reporting and collection accuracy

The dashboard compares the selected rolling seven/thirty-day window with the
immediately preceding window of the same length. A zero previous count is shown
without an invented percentage increase. Comparison failure leaves the current
period available. The refresh time uses Europe/Podgorica; the refresh control
requests the page again. Breakdown percentages use all pageviews as their denominator,
so a list of the ten largest sources or countries need not add up to 100%.

Popular articles are filtered by `/tekst/` at Umami before applying the ten-row
limit, so homepage and author-page traffic cannot crowd them out. Titles come
from published revisions in one lightweight database query. Historical paths
without a current published title remain visible as their paths.

Only the first page of a document reports its external entry referrer; client
navigation does not attribute every subsequent page to that external source.
The same allowlist and HTTP-origin sanitizer run in the browser and the proxy.
The browser respects Do Not Track and Global Privacy Control signals. Private
routes, queries, fragments, credentials and non-HTTP referrers are excluded.

The filtered ranking uses Umami 3.3.1's supported `search` parameter in the
[expanded metrics route](https://github.com/umami-software/umami/blob/v3.3.1/src/app/api/websites/%5BwebsiteId%5D/metrics/expanded/route.ts).
The existing pinned Umami image is unchanged.
