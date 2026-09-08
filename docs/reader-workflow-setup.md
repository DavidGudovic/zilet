# Reader and editorial changes — 8 September 2026

## Brevo registration

Set these fields in the private environment on each installation. The prefix is
`SMTP_`. Use the SMTP credentials shown by Brevo, including an SMTP key (not a
Brevo API key). The sender must be authorized in Brevo.

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<Brevo SMTP login>
SMTP_PASSWORD=<Brevo SMTP key>
SMTP_FROM=Žilet <your-verified-sender@example.com>
REGISTRATION_ENABLED=true
```

With port 587, Nodemailer negotiates STARTTLS. Port 465 instead requires
`SMTP_SECURE=true`. After editing the runtime environment, recreate the app
container with the installation's normal `make up` workflow; a plain restart does
not reload Compose environment values. Keep production's existing release image
configuration. No rebuild is required solely for credentials.

Registration requires real email verification. Missing mail configuration leaves
an honest unavailable state. Readers can edit their display name at `/nalog`,
change their password, comment, and submit work. Account names remain separate
from credited authors; changing a name does not rewrite an already accepted
work's byline.

Reference: [Brevo SMTP instructions](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

## Reader submissions

The new migration `005_reader_submissions.sql` runs with normal startup migration
handling. `/posalji` accepts a verified reader's title, rubric, plain text, and
one optional JPG/PNG/WebP photo (5 MB). Text is limited to 30,000 characters.
An account has at most five pending submissions and five submission attempts per
day. Photos use the same decoded/re-encoded storage as editorial uploads.

Editors review `/redakcija/prilozi`. Acceptance creates exactly one private draft
and requires a signed editorial note. Publishing uses the existing explicit
publication workflow and retains the `citaoci` rubric. Reader work appears under
`/rubrika/citaoci`. Rejection may include a private reply; readers see their
status and can delete pending/rejected submissions. No new outbound mail is sent
for review decisions.

Configure optional screening:

```dotenv
INTEL_KEY=<Gemini API key>
GEMINI_MODEL=gemini-3.1-flash-lite
FACEBOOK_URL=https://www.facebook.com/<your-page>
```

The key is server-only. Only the submitted title and text are sent to Gemini;
account fields and photos are not included. An eight-second timeout, quota error,
missing key, invalid response, or uncertain verdict sends the work to manual
review. Only recognized, explicit spam/language/abuse verdicts block submission.
Both scripts and Montenegrin/Serbian/Croatian/Bosnian are accepted; the prompt
excludes literary quality, viewpoint, and ordinary literary profanity as reasons
for rejection. The editor always makes the publication decision and reviews the
photo. No AI decision edits an existing public work.

The form discloses external screening and the free-tier data-use implication.
Google's unpaid-service terms may allow submitted text to be used for product
improvement; do not send confidential manuscripts or personal information.
See [Gemini data-use terms](https://ai.google.dev/gemini-api/terms) and
[structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
Leaving `INTEL_KEY` empty runs the complete workflow with manual review only.
Set `FACEBOOK_URL` to the actual publication page to make the appeal link clickable.

## Storage

Editors may permanently delete saved drafts or withdrawn works. Published works
must first be withdrawn. The confirmation explains permanence; version checks
reject stale requests. Deletion removes revisions, comments and their moderation
records, old redirects, and placements through existing relationships.

The photo library paginates older images and marks references. An image can only
be deleted when no retained revision, author portrait or submission uses it.
Deletion removes the private master and both derivatives. Remove the old draft
or retained reference before deleting its image. Reader submission deletion also
attempts cleanup of its now-unused photo; shared photos stay protected. Backups
retain their own historical copies and require their own retention policy.

## Analytics

See [self-hosted Umami setup](analytics.md). The dashboard shows article views,
referral sources, countries, devices, and estimated time per page. Time is based
on Umami pageview intervals, not a guarantee that the reader finished a work;
one-page visits do not have a second timing boundary.

## Verification

Use `ZILET_DISPOSABLE_TEST=true` only with a disposable local database and mail
sink. The HTTP and browser integration scripts now require this flag, and their
credential artifacts are namespaced by port. The flag is set in CI, never in the
production example environment. Do not run acceptance against an existing preview
with valuable data or through a production tunnel.

After the standard acceptance suite, run `tests/integration/submissions.ts` with
the same explicit environment, then `tests/integration/editor-ui.ts`. Use the
built app, not just a development compilation. A local `INTEL_KEY` smoke test
uses synthetic text only; real reader material is not used for implementation
checks.

The filesystem checks also require `ZILET_TEST_CONTAINER` to name that disposable
app container. They verify master/display/small image files inside the actual
container storage before and after deletion; a missing host-side directory is
not accepted as deletion evidence.
