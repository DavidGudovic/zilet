# Artistic refinement — 6 September 2026

The active generated masthead was inspected at its actual display size. The colour
sits in the navigation, rubric headings, browse strip, footer and editorial note
panel. A tiled grayscale SVG supplies very faint grain as a surface background;
there is no layer above photographs or paintings. The curving SVG rules draw on
entry, and selected text blocks rise 15px while becoming opaque once.

The production image was built and tested against the disposable `zilet-review`
PostgreSQL/mail stack on port 3002. Production content and accounts were not used
for write tests. The additive `004_editorial_notes.sql` migration succeeded.

- Format, eight unit test files, TypeScript, deployment shell checks and Next build passed.
- The HTTP acceptance suite passed, including server-owned note signatures,
  independent author/posting credits, two-editor saves, draft/live isolation,
  escaping, permissions, auth/session checks and media handling.
- `tests/integration/editor-ui.ts` exercised touch and mouse opening, menus remaining
  open across autosave renders, keyboard navigation, Escape cancellation and focus,
  all four editorial choosers, canonical poem save/reopen, note publication/removal
  and cleanup. CI runs this against the built image after HTTP acceptance.
- 52 responsive/interaction checks covered 1440, 768, 390 and 320px: home, criticism
  archive, short and long poems, artwork, author pages and editorial screens, with no
  document overflow. Image-dialog Escape restored focus; print and reduced-motion
  views were checked.
- Separate motion checks observed off-screen text entering and settling at full
  opacity, line drawings completing, unfiltered artwork and all content visible
  with JavaScript disabled.

The in-app browser also confirmed that the custom author chooser remains open
across successive tool calls and accepts a visible option. A stale tab initially
failed local navigation; a fresh tab connected. Separate isolated Chromium runs
supplied exact viewport sizes (the in-app viewport capability did not apply those
sizes in the earlier inspection).

Initial UI verification caught a saved textarea's value becoming part of the label
lookup. The note now has a separate explicit label; save/reopen passed afterward.
Full-page captures were retaken with actual instant scrolling through each section,
allowing the real entry animations to finish before capture.

For a disposable stack with local mail, run the HTTP suite first to create the
browser test account, then:

```sh
node --env-file=.env --import tsx tests/integration/editor-ui.ts
```

The test rejects non-local origins. Never point it at production or a database
with valuable content. Test screenshots in this directory intentionally identify
the synthetic author/editor; public-layout screenshots use the approved fixtures.
