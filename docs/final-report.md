# Žilet — implementation and verification

The initial implementation runs locally at `http://localhost:3000`. On 6 September 2026 the tested GitHub release was also installed on the VPS at `127.0.0.1:3100`, with the owner-approved texts and credited artwork. Public Nginx/TLS and the automatic deployment timer await working sudo authentication; the public HTTPS deployment is not complete. See `deployment.md`.

## Built

- Original outlined Žilet wordmark and Ž monogram, green/mono/reversed variants, small favicon, circular avatar, social preview, editable vector source and identity sheet. Source Serif 4 / Source Sans 3 selected after a live comparison with Literata.
- Distinct desktop and mobile homepage, poetry and criticism compositions. A compact front page uses the two supplied works; additional published material enables poetry/prose groupings, an art feature and recent-work index. Named selections also work for older articles.
- Canonical poem text, whitespace and emphasis preserved independently of visual line wrapping. Original-line view scrolls inside the poem. Safe rich prose, clean print CSS, complete artwork and a keyboard-operable native image dialog.
- Rubric/author discovery, PostgreSQL search, diacritic folding, sorting/pagination, factual about page and draft policy copy. Approved author biographies/portraits have owner tooling; contributor identities remain separate from accounts.
- Quiet `/redakcija` desk, Tiptap prose editing, dedicated verse surface, real autosave, version-conflict protection, recoverable revisions, private previews and deliberate publication of changes. Phone upload, image library, caption/credit/alt text, placement and gallery ordering.
- Better Auth reader accounts, verification/recovery via configured mail, verified comments, ownership checks, reversible editorial removal, reader deletion, suspension and comment closure. Roles are checked on private server pages and operations; rate limits persist in PostgreSQL.
- Decoded/limited/re-encoded image uploads in persistent storage, protected unpublished media, server-rendered public pages, runtime canonical/social metadata, sitemap/robots and deliberate redirects/404s. No shared session/content cache.
- Optional separately stored Umami and a custom localized statistics screen. No fabricated metrics; the delivered local configuration truthfully shows that analytics is not connected.
- Pinned Docker stack, Makefile, migrations, local Mailpit, environment example, reverse-proxy example, consistent backup/restore scripts, maintainer README and one-page editor guide.

## Verified

| Area | Evidence |
| --- | --- |
| Automated contracts | Seven test files pass, including CI approval gating, backup ordering, idempotence and failed-health application rollback: exact source content/whitespace, emphasis edits, publishing schema, Better Auth database schema, clean vector identity, rich-text link normalization and AA text-colour contrast. TypeScript and production Docker build pass. |
| Production API acceptance | 18 recorded checks in `verification/api-acceptance.json`: actual local registration/verification/sign-in; privilege injection rejected; draft isolation; poetry round trip; stale-save rejection; decoded private image upload; publishing without rebuild; pending live revisions; comment ownership, escaping, removal/counts/restoration; reset-token delivery, single use and session revocation; suspension; own-comment deletion; slug redirect; comment closure; unpublishing/media withdrawal. Run against the container, not mocked endpoints. |
| Real browser workflow | Pasted the canonical supplied poem, saved, reopened, published locally and copied it. Clipboard text matched the fixture exactly. Inspected desktop/mobile editorial controls. Entered prose with a subheading and uploaded the portrait-aspect development painting through the phone-width file chooser; title, text and image metadata survived reopening. |
| Reading and navigation | Inspected 1440, 768, 390 and 320 px layouts, actual criticism sections, long verse line, short/long-title fixtures, image-free work, portrait/landscape gallery and empty archive. Menu activation/Escape returns focus; search preserves its query through browser back; image viewer closes with Escape and restores focus, with accessible non-swipe gallery controls. |
| Visual refinement | Two deliberate public-design revision passes preceded editorial expansion, followed by integrated refinements to title input sizing, image-dialog controls and expanded homepage attribution. See `verification/visual-review.md` and the captured PNGs. |
| 320 px reflow | Seven production public routes measured `scrollWidth === clientWidth` (305 px content plus browser scrollbar). Original verse measured 269 px viewport / 656 px scroll width while the document stayed 305 px. Expanded homepage also stayed within 305 px. Evidence: `verification/overflow-320.json`. |
| Archive growth | 28 explicitly labeled temporary works exercised older homepage placement beyond the newest 24, an art feature, poetry/prose groupings, second-page archive and `Djurovic` search. Browser-inspected expanded desktop/mobile composition; fixtures removed and placements restored. |
| Runtime configuration | Separate loopback container with no SMTP returned 503 for registration/recovery and displayed the honest unavailable screen. Runtime APP_URL appeared correctly in robots and canonical URLs. Development routes returned 404 in the production image. Evidence: `verification/runtime-config.json`. |
| Containers and persistence | `make up`, `make down`, and `make up` completed; health/migrations and the two supplied pieces survived. Persistent artwork remained readable. |
| Backup/restore | Ran the documented backup and checksum-checked restore. The two published pieces remained, a database marker added after backup was removed by restoration, and the stored artwork SHA-256 matched. Local backup is under ignored `backups/`; its private environment is not included in this report. |
| Owner bootstrap | Owner CLI generated verification and password-choice messages to a `.test` recipient in the local mail sink, without a preset password. Temporary acceptance accounts were removed. |

## Practical limits

This is not a WCAG certification or a measured Lighthouse report. The connected browser exposed viewport and keyboard controls but no reduced-motion emulation or working browser-zoom shortcut. Reduced-motion and print rules were reviewed in source; actual OS reduced-motion, browser zoom and print-dialog rendering still warrant a target-browser check before launch. No physical phone or assistive-technology session is claimed. The browser's clipboard permission can reject an operation; the UI then explains manual selection/copy, and subsequent pointer copying was verified byte-for-byte.

Umami's optional official image was verified/pulled and its integration was implemented against the documented API. The acceptance result is the specified **unavailable-state** path, not a claim that a live analytics service produced data. Real SMTP, public TLS and indexing are not yet configured or verified. The VPS container, production database, backups, make up/down and imported content were exercised; the existing DNS A record points to this host.

The two local pieces are supplied material credited to Zoran Đurović. Development paintings are documented CC0 illustrations; the missing original post images have not been invented. Public policy/about wording and real invitations still require the owner decisions in `launch-checklist.md`.

## Handoff

Start/stop with `make up` / `make down`. Read `../README.md` for environment, first account, development, backup/restore and VPS steps. Editors can use `editor-guide.md`. Final vectors are in `../public/identity/`, with source in `../scripts/identity.mjs`.

## CI/CD follow-up

Pushes to main build and test a container on GitHub. A public release contains
the tested image and checksum; the prepared host timer installs only the current
main commit that CI marked ready. The production health endpoint reports the
running commit. Initial clean-checkout testing caught omitted media routes from
an unanchored runtime-data ignore rule; that rule was corrected before any
release was installed. The corrected image passed the real acceptance suite.

The server import preserved canonical text, and the credited CC0 image is now
approved for publication. The installed homepage and mobile poem were inspected
through a temporary SSH tunnel; the 390 px mobile viewport had no document
overflow and its canonical URL uses https://zilet.me. Both pre-existing public
websites still returned HTTP 200. Production registration remains disabled and
SMTP empty, with no invented editor accounts or live mail delivery.
