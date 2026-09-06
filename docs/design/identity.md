# Žilet identity

Current masthead (6 September 2026 refinement): an expressive capital-Ž wordmark
created with ImageGen after the owner rejected the lowercase outline. The original
transparent PNG is used consistently in the header, footer and editorial desk.
Its provenance, final prompt and regeneration boundaries are recorded in
[logo-generation.md](logo-generation.md).

The earlier Source Serif 4 outline and hand-constructed studies remain historical
alternatives. Source Serif 4 continues to serve the reading typography, with its
SIL OFL 1.1 license retained. `scripts/identity.mjs` regenerates the historical
vector variants; it does not change the active PNG. Regenerate the sharing card
with `node scripts/social-preview.mjs`.

Assets in `public/identity`: wordmark and monogram in green, monochrome and reversed versions; circular avatar; 1200 × 630 social fallback. `public/icon.svg` is a simplified small-size Ž. The auxiliary SVG marks consist of vector paths, clean viewBoxes and no runtime font, image or script dependency. The descriptor is set as ordinary accessible HTML next to the logo.

The page surfaces now include fine paper grain, sage #DCE2CF, ochre #BC893A and
terracotta #99543D. Grain is a background, so paintings and photographs stay clean.
Drawn curves and once-only scroll entrances soften transitions between sections.

Colours: paper #F6F2E9; ink #20251F; forest #173A2B; burgundy #4A181B; metadata #626359; rules #C9C2B6. Do not use the rule colour for text. Leave clear space at least the height of the i dot on all sides. Minimum wordmark width: 120 px. Use the simplified icon at 16–32 px; use the larger outlined monogram above 32 px. Reversed artwork belongs on forest or ink, not a photographic background.

Typeface selection: Source Serif 4 and Source Sans 3. Both are SIL Open Font License 1.1, sourced from the pinned Fontsource packages 5.3.0, which redistribute upstream Adobe Source typefaces. Licensing files are retained beside this document. Self-hosted Latin, extended Latin and Cyrillic subsets include the requested Ž/Č/Ć/Š/Đ/Ś/Ź, combining marks and Cyrillic contribution samples. Serif normal and italic weights are used. Source Sans provides navigation and editing controls.

Alternatives: Literata + Source Sans 3 was compared in `/specimen` with real supplied text, then rejected for this implementation. Its resources remain only in the development fixture area and its gated development route. `docs/design/study-a.svg` records the simpler symmetrical caron. The selected study's taper adds a recognisable detail without reducing small-size legibility.

Public headings preserve source capitals. Verse retains exact canonical input. The date formatter uses a tested `sr-Latn-ME` implementation fallback; the document language remains `cnr-Latn`. IANA registry verification: cnr = Montenegrin, registered 2018-01-23. This is language identification, not dialect rewriting.
