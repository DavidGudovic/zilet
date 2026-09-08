# Editorial and reader workflow verification — 8 September 2026

Implementation branch: `codex/editorial-reader-experience`. Optional visual
accents are isolated in commit `0ac1e93` (`design: add paper gradients and ink
focus accents`). Reverting that commit removes only its stylesheet and import.

## Built application

The image was built from `git archive` of the committed application, separately
from the working tree. No ignored source files were found under `src` and the
archive did not include private environment files. Startup applied the new
submission migration to the isolated `zilet-feedback` PostgreSQL database.

The final application checks passed:

- Prettier; all ten unit/contract test files; TypeScript; shell deployment checks.
- Production compilation in the clean-checkout Docker build.
- HTTP acceptance against the built app on localhost:3300, isolated PostgreSQL
  and Mailpit. `api-acceptance.json` records the detailed checks.
- Reader-submission HTTP workflow: profile/origin/role guards, one-photo limit,
  private media, manual fallback, duplicate-review conflict, required signed note,
  publish/withdraw/delete, private rejection reply, owner/version deletion guards.
- Existing mobile editor workflow: pointer/touch chooser survives autosave,
  keyboard selection and Escape, exact canonical verse and image placement on
  save/reopen, signed notes, draft/public separation, and withdrawal HTTP 404.
- Next-step focus: clicking Tekstovi (including when already on that page) focuses
  the search input; its tabIndex remains 0. Choosing Rubrika focuses an empty title.
- The owner portrait command attached a fixture image and its author reference
  together in the built container; removal of the portrait reference also passed.

The permanent-image-deletion test now checks all three files inside the actual
app container before and after DELETE. A missing file in the host working tree
is no longer treated as evidence about container storage.

## Browser review

Used the in-app browser and measured actual viewport width, page heading and
horizontal document overflow. Proza, canonical poetry, the reader submission
form and the photo library passed at 320, 390, 768 and 1440 px. Separate temporary
fixtures exercised a short Cyrillic/Latin poem without art, a long title and
long authored verse line, and two synthetic images with 1:3 and 4:1 proportions
at all four widths. All 28 combinations had no horizontal document overflow.

Inspected the 390px new-text form and editor entry, 320px reader form/editor
list, 768px criticism and 1440px photo library. The full artwork dialog opened on
390px, kept its controls and attribution visible, and Escape restored focus to
the image opener. Public copy now uses “Svi radovi autora”. The old Priče URL
redirects to Proza; existing stored rubrics remain readable.

The populated statistics dashboard was rendered with synthetic local metrics,
separately from the live Umami API test. Those example counts are layout data,
not readership figures. Device labels are local-language names. Both connected
and unavailable states were examined. The populated dashboard also passed all
four viewport widths without horizontal overflow (32 combinations in total).
Reduced-motion and print rules remain
in place; OS-level zoom was not tested.

## External services

A disposable instance of the pinned Umami 3.3.1 image verified login, initial
password rotation, website creation, collection, and v3 expanded path/source/
country/device metrics. The service returns some numeric values as strings;
the decoder handles that shape. Per-page duration follows Umami's intervals and
is unavailable for a single view with no later timing boundary. The dashboard
does not claim completed reading or exact active attention.

A synthetic literary passage passed screening using the configured INTEL_KEY
and `gemini-3.1-flash-lite`. The older default model returned HTTP 404; the
working lightweight model is now the default. Unit tests cover missing keys,
quota/network failures, malformed responses, uncertainty, and recognized
blocking reasons. No actual reader submission was sent during implementation.

Brevo credentials were not sent any test mail by the isolated acceptance suite;
that suite uses Mailpit. Production mail and analytics activation remain runtime
configuration steps described in `docs/reader-workflow-setup.md` and
`docs/analytics.md`.

## Local test incident

A delegated acceptance run mistakenly targeted the existing localhost:3000
preview. It added five labelled test accounts, a test author and moderation
records, and overwrote a shared temporary credential artifact. The exact added
records were audited and removed; its temporary post/media had already been
removed by the deletion checks. No production operation occurred. Existing
published content, source text, media and biographies were preserved.

That run also cleared local rate-limit counters and left the local explicit
poetry homepage placement unset. Its previous value was not recoverable, so no
replacement was invented; the normal poetry fallback remains active. The shared
credential artifact problem was fixed by namespacing artifacts by port. All
integration entry points now require explicit `ZILET_DISPOSABLE_TEST=true`; the
filesystem checks additionally require `ZILET_TEST_CONTAINER`.

The ordinary local preview was updated to the verified image using its existing
environment and durable volumes. The separate feedback/analytics test services
and their temporary data were removed after verification. No push or production
deployment was performed. Pre-existing README.md and AGENTS.md edits were left
uncommitted and unchanged.
