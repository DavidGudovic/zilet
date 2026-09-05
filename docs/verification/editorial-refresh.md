# Editorial refresh — verified 6 September 2026

## Changes

The new lowercase wordmark uses outlined Source Serif 4 display lettering and
custom tracking. Fine masthead rules, a brief line-draw entrance, small link
movements and an artwork section add detail without continuous animation. Breze
remains fully visible and retains its credit.

The CMS keeps Žilet branding, gains a short in-app guide, clearer writing prompts,
author biography editing and a password-change screen. The editor login explains
its purpose instead of showing reader-registration messaging. Editors' public
profiles are listed even before their first publication. Account privileges remain
separate from credited author profiles.

## Actual checks

- Node 24, `npm ci`, `npm run format:check`, `make test`, `npm run build` pass.
- The production Dockerfile built successfully. Its image ran in a separate
  `zilet-review` Compose project with disposable PostgreSQL/media on port 3002.
- The real HTTP acceptance suite passed, including role/origin validation,
  stale biography writes (409), public editor profiles without posts, authenticated
  password changes, current-password checks, minimum length and session revocation.
- Owner provisioning was tested without SMTP, including an explicit 8-character
  starter. Public/new-password validation remains at 12 characters.
- The approved content import ran twice. Exactly three new works exist; both old
  Zoran fixtures retain identical bodies; imported poem bodies match the canonical
  fixtures including whitespace and emphasis.
- Chromium 153 with the pinned Playwright installation checked public home, poem,
  long verse/title, artwork, biography and placeholder pages, plus the signed-in
  desk, profiles, help, account and composer at 320/390/768/1440 pixels. No horizontal
  document overflow occurred. Authenticated-page tests require the actual desk and
  final URL, not merely a 200 response or intermediate navigation.
- Rendered Slike equals its source fixture. The Breze dialog opens at 320 pixels;
  Escape closes it and returns focus. Reduced-motion rules disable animation;
  print hides public navigation. No page errors were observed.

Screenshots and 48 recorded checks are in `editorial-refresh/`. These are local
preview evidence, not screenshots of production data. Its original Hammershøi
caption identifies the development fixture. Existing production content is preserved.
The in-app browser ignored viewport overrides, so exact breakpoint verification
used a separate local Chromium instance; this limitation was not treated as a pass.

## Data and deployment

Sources, permissions and canonical hashes are documented in
`editorial-refresh-sources.md`. Import is explicit and additive. The only migration
adds `authors.is_editor` with a false default. Previous app versions ignore it.
Production is updated through the existing main-branch CI/release/timer pipeline;
no bootstrap or shared-host service configuration is needed.
