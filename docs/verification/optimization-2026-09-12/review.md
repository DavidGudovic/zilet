# Žilet optimization and editorial review — 12 September 2026

## Changes

- Long prose links, titles, biographies and rubric labels wrap within mobile columns. A newly exposed 2px search-select overflow at 320px was fixed. Authored verse and copied text remain exact, including the confined original-layout view.
- Public pages have canonical and sharing metadata, author links and live revision dates. Author index is in the sitemap. Static prose rendering stays on the server; closed image dialogs do not load full images, and archive thumbnails load lazily.
- New rubric: **Zanimljivosti o poznatim ličnostima**, available in public navigation, search, editor and reader submission forms.
- Photo library uses an upload-only control. A real upload produces one card, survives reload and has no duplicate article-placement controls. No production images were deleted.
- Analytics filters articles before the top-ten limit, loads live titles in one query, compares the prior period, shows source/device/country shares and allows refresh. External referral attribution occurs only on entry; queries and private routes remain excluded.
- Submission acceptance/rejection sends branded HTML/plain-text email. Editors can ask private questions before deciding, and readers can reply in their submission history. Versions guard concurrent changes. Mail delivery status is saved and failed delivery can be retried; sent records are not resent. As with ordinary SMTP, a process failure after acceptance by SMTP but before recording delivery cannot guarantee exactly-once delivery.
- Author identity uniqueness ignores case and accidental whitespace but preserves diacritics. Migration 007 chooses a canonical mixed-case profile, preserves biographies/editor flags/portrait, remaps all revision history and redirects old URLs. Author and import creation reuse stored identities. Long merged biographies remain intact and can be shortened using a hash-based edit-conflict token.

## Verification

All testing used a separate built Docker application, disposable PostgreSQL and Mailpit, never production or an ordinary local preview. App: localhost:3010; PostgreSQL: localhost:55449; Mailpit: localhost:8035. A second local app on 3011 used **synthetic analytics** solely for populated dashboard layout checks.

- Formatting, 12 unit/contract test files, TypeScript and deployment shell checks pass.
- Production build passes; runtime media-directory tracing was corrected so uploads are not traced into the application bundle.
- HTTP acceptance covers auth/recovery/session revocation, permissions, publication and live/draft separation, safe uploads, moderation, deletion and profile concurrency.
- Submission HTTP/Mailpit checks cover decision mail, private questions/replies, cross-reader denial, stale versions, unavailable delivery, retry and cleanup.
- Migration tests preserve exact authored JSON apart from canonical author ID, biographies and portrait; test import retries, concurrent creation, biography conflicts and real HTTP 308 redirects with pagination.
- Analytics integration uses mocked Umami responses and real disposable SQL to prove one title query, no draft-title leakage, historical-path fallback and graceful comparison failure. The new filtered endpoint was independently verified read-only against production Umami: HTTP 200, ten article paths, expected metrics.
- Real browsers checked 320/390/768/1440px: long links/poetry/titles/art ratios/new rubric, single photo upload, editor menus/touch formatting, private correspondence, rendered question/decision emails and populated synthetic analytics. Document widths, exact verse, image-dialog Escape/focus restoration, reduced-motion and print checks pass. Viewport resizing is not a claim about OS-level zoom gestures.
- Email render checks use Chromium and Mailpit; no cross-client Outlook/Gmail certification or unmeasured Lighthouse scores are claimed.

Screenshots and JSON measurements in this directory contain only disposable fixtures. `statistics-layout.json` explicitly identifies synthetic data. `correspondence.md` describes its interaction evidence.

## Authorized production account maintenance

A private database backup preceded the account changes. Independently verified mappings:

- `editor1@zilet.me` → `savka@zilet.me`
- `editor2@zilet.me` → `zoran@zilet.me`

Passwords, account IDs and roles were preserved; old sessions were revoked. SMTP connection/authentication verified successfully without sending a test message. Duplicate author groups identified in production were Herman Hese and Zoran Đurović; their merging and URL preservation are delivered by migration 007 with the release.

Pre-existing uncommitted AGENTS.md, README.md, HANDOFF.md and rate-limit work are preserved separately from this release.
