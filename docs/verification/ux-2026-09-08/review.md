# UX, screening and performance review — 8 September 2026

Reader submissions now have a visible “Pošaljite rad” link in their rubric header, with a muted sage/ochre invitation and a small arrow interaction. Reduced-motion preferences disable the movement; print hides the submission action. Redakcija list rows have 16 px of inline padding to keep the hover rule clear of text.

Poem formatting retains the selection, supports removing emphasis from part of a marked range, exposes active toolbar state and renders an immediate formatting preview without rewriting canonical text. The rich editor retains selection during toolbar clicks and subscribes to active formatting state. Bold, italic and Citat were exercised with real touch clicks and checked after save/reopen and public publication. Citat is the prose/gallery blockquote control; poems keep their canonical line structure.

The reader rubric is absent from normal editor choices. Both save and publish APIs reject assigning it to a post without an accepted submission, including a legacy draft carrying that rubric. Accepted submissions retain their independent genre and reader-rubric provenance. Existing contributions are not deleted or reimported.

## Screening

The old prompt excused short/ambiguous submissions and broadly permitted literary profanity. Tightened checks distinguish excessive abusive tirades from literary dialogue, check short foreign-language bodies, reject obvious keyboard nonsense, and explicitly classify attempts to dictate the model verdict as spam. Safety refusals are handled as blocked instead of falling through a JSON parse error to manual review. Incomplete output and service outages retain a clearly marked manual-review fallback. No automatic screening system guarantees perfect classification.

The existing production Gemini key was used only with eight synthetic examples. The final prompt blocked short English, an English body with a local-language title, keyboard nonsense, an abusive tirade, and a prompt-injection attempt. It passed a local-language poem, a Cyrillic poem and dialogue containing occasional profanity. An initial minimal-thinking test allowed the injection; the final low-thinking configuration and explicit spam rule blocked it. Unit tests cover safety refusals, incomplete output, invalid decisions, network failures and rate limits. No reader work, account details or photos were submitted to the service for testing.

API references: [Google safety feedback](https://ai.google.dev/gemini-api/docs/safety-settings) and [thinking configuration](https://ai.google.dev/gemini-api/docs/gemini-3).

Provider and free-tier wording was removed from the public submission/privacy copy. The copy still explains external automated screening, what is sent, manual fallback and appeals.

## Performance and SEO

- Batch author, posting-account and media lookups for article lists, replacing per-article queries with up to three lookups per list. React request memoization shares metadata/page reads without introducing a shared public-content cache.
- Responsive homepage artwork uses the existing small derivatives. Portrait descriptor widths reflect the derivative's 640 × 640 bounding box.
- The lossless WebP wordmark is 255,780 bytes versus 416,878 bytes for the retained source PNG (38.6% smaller). Decoded composited pixels match exactly on paper, green and white backgrounds; only invisible transparent RGB storage differs.
- Fonts cache for seven days and identity assets for one day. Uploaded media and private documents retain their existing no-store behavior.
- Canonical URLs cover the homepage, about page, author pages and paginated rubrics. Sorted alternate archives are noindex/follow. Empty out-of-range author pages return a real 404.
- The live sitemap omits the old `/rubrika/price` redirect, includes `/rubrika/umjetnost`, and takes lastModified from the published revision. Draft autosaves do not change that timestamp. HTTP checks exercise draft → publication → autosave → withdrawal, populated archive pagination, cache headers and robots discovery.

Search Console sitemap: https://zilet.me/sitemap.xml. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Verification and host inspection

Formatting, all ten unit test files, TypeScript, shell deployment checks, the production container build and disposable HTTP suites passed. Browser checks cover 320/390/768/1440 px, short poems, long titles/verse, missing art, tall/wide synthetic images, image-dialog Escape/focus return, reduced motion, print and the editor hover inset. Screenshots in this directory are local synthetic fixtures, never production submissions. No Lighthouse score is claimed.

The disposable stack is `zilet-ux`, port 3400, with separate database/media volumes. Existing local preview and other applications were untouched. CI now repeats SEO and formatting workflows against its own built image.

Production inspection confirmed Nginx 1.24, HTTP/2, gzip level 5 with Vary, HSTS and a Žilet-only loopback upstream with 16 keepalive connections. These settings were already installed; no shared Nginx configuration or other deployment was changed. The missing font/identity cache lifetime is fixed by application response headers instead.

Brevo authentication initially returned EAUTH. The saved SMTP username differed from the running container. Reloading Žilet through its normal locked `make up` workflow applied the saved username and SMTP verification passed. No real email was sent; authentication success does not by itself prove inbox delivery.

## Release status

The owner explicitly authorized committing and pushing these changes on 8 September 2026. CI gates production publication on checks against the committed container image. Before this release, production reported `14d64fb5810b479bacd13594367c5594143dfe7c`. Brevo's configuration reload is complete. Zero existing public reader-rubric posts lack an accepted submission, so no production content cleanup is required.

The separate `www` setup script is prepared but has not been installed: it requires administrator access to Nginx and Certbot. Pushing the application does not automatically run that script. See `docs/deployment.md` for the scoped setup and verification steps.
