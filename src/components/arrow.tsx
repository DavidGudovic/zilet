// One drawn arrow for every link and one chevron for every disclosure, so they share a stroke
// and scale with the text beside them. Text glyphs such as ↗ and → are missing from the
// self-hosted font subsets and fell back to whatever font each device had.
const paths = {
  // Opens another page.
  out: 'M3 13 13 3M5 3h8v8',
  // Moves within the page, or between pages of a list.
  down: 'M8 2.5v11M3.5 9 8 13.5 12.5 9',
  up: 'M8 13.5v-11M3.5 7 8 2.5 12.5 7',
  right: 'M2.5 8h11M9 3.5 13.5 8 9 12.5',
  left: 'M13.5 8h-11M7 3.5 2.5 8 7 12.5',
};
export function Arrow({ to = 'out' }: { to?: keyof typeof paths }) {
  return (
    <svg
      className="arrow"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[to]} />
    </svg>
  );
}
// Opens a menu or panel in place; it turns over while the panel is open.
export function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      className={open ? 'chevron open' : 'chevron'}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  );
}
