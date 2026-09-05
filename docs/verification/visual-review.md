# Rendered design review

## First render

Inspected real local browser screenshots: 1440 desktop front page, live Source Serif 4 / Literata specimen, both SVG studies, 390 mobile poem.

Selected Source Serif 4 with Source Sans 3. Source Serif's proportions keep the confrontational capitals controlled and the long criticism comfortable; Literata is slightly broader and denser in the specimen. Both rendered the requested Latin, combining-accent and Cyrillic samples. Selected identity study B: tapered asymmetric caron, legible as Ž at small sizes. Original lettering source: scripts/identity.mjs.

## Revision 1

Reduced masthead height and mobile wordmark; fixed the compact home icon's selector specificity; shortened the homepage excerpt at an existing sentence boundary; removed unnecessary invented introductory copy from the rubric directory; kept artwork uncropped. Reduced mobile verse to a still-readable 20 px and tightened metadata space so reading starts sooner.

## Revision 2

Inspected revision 1 at 390 px (home and criticism) and 768 px (criticism). At tablet width the side rail unnecessarily reduced the reading measure. Moved it above the work for 768–1000 px, refined headline scale and column proportions there, and tuned desktop verse to 22 px. Mobile remains 20 px, preserving canonical line boundaries through soft visual wrapping. No authored line or punctuation was changed.

## Integrated browser checks

The real editorial desk was inspected at 1440 and 390 px. Supplied poetry was pasted through the UI, saved to PostgreSQL, reopened, published locally, and copied using the public copy button. Browser clipboard text exactly equalled the supplied canonical body. The mobile title field was changed to a multiline field after inspection exposed clipped titles in the single-line input.

The criticism image viewer was opened on mobile; the complete painting was visible. Escape closed the native dialog and restored focus to the artwork button (observed `viewerClosed: true`, `focusReturned: art-open`). The two criticism sections remained distinct headings in the accessible tree.

Gallery variation inspection exposed a development-only image gate after switching to persisted data, and modal controls could scroll out of view. The fixture route now depends only on development mode; production returns 404. The dialog uses a bounded flex layout so the full image, caption, close and previous/next controls share the viewport. This refinement was driven by the two-image mobile gallery test.

## Final production inspection

The container's clean front page was inspected at 1440 and 390 px; the poem at 390/320, criticism at desktop/tablet/mobile, and public search, empty archive, author and account routes at 320. Seven public routes had no horizontal document overflow. Full-page capture became unreliable during container restarts, so final evidence uses the supported native viewport captures; earlier full-page criticism and gallery inspection also occurred.

A temporary 28-work archive confirmed older editorial selections remain in the opening composition, the art feature keeps the complete painting, poetry excerpts contrast with compact prose entries, and the whole extended page reflows at 320. The artwork feature received its own caption/credit after this inspection. Temporary archive content was removed after the check.

The mobile rich-text title field now grows with its contents. Rich-text generated link attributes are normalized to the publication schema. Phone-uploaded image descriptions, credits and placement survived save/reopen. The original-line poem remains selectable HTML; pointer copying from the final container exactly matched the source fixture. A clipboard-denied keyboard attempt displayed the implemented manual-copy explanation.

Browser zoom shortcuts were not exposed successfully by the connected browser and reduced-motion emulation was unavailable. Do not treat viewport reflow as proof of OS zoom or reduced-motion testing. CSS for reduced motion and print is present and reviewed; those environment-specific checks are recorded as launch verification limits.

The final isolated short-poem fixture was also rendered at 390 px: short accented title, inline italics, canonical blank lines, a long contributor name, no image and Cyrillic contribution text. It is captured in `short-poem-390.png`. The temporary development and identity-sheet servers were stopped after inspection; only the main Docker application remains running.
