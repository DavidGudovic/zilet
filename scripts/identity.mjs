import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/identity', { recursive: true });
// Historical vector alternative; the active masthead is wordmark-generated.png.
// Outlined Source Serif 4 (Adobe, SIL OFL 1.1), with display proportions and custom tracking.
// The editable paths and construction parameters are retained with the identity notes.
const drawing = JSON.parse(readFileSync('docs/design/wordmark-paths.json', 'utf8'));
function svg(paths, color, view) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" fill="${color}" role="img" aria-label="Žilet">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
for (const [name, color] of [
  ['green', '#173a2b'],
  ['mono', '#20251f'],
  ['reversed', '#f6f2e9'],
]) {
  writeFileSync(`public/identity/wordmark-${name}.svg`, svg(drawing.paths, color, drawing.viewBox));
  writeFileSync(
    `public/identity/monogram-${name}.svg`,
    svg(drawing.monogramPaths, color, drawing.monogramViewBox),
  );
}
writeFileSync(
  'public/icon.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="2" fill="#173a2b"/><path fill="#f6f2e9" d="M9 4L16 7L23 3L17 10H15ZM7 12H25V15L13 25H25V28H7V25L19 15H7Z"/></svg>',
);
writeFileSync(
  'public/identity/avatar.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="#173a2b"/><g fill="#f6f2e9" transform="translate(56 24) scale(.18)">' +
    drawing.monogramPaths.map((d) => `<path d="${d}"/>`).join('') +
    '</g></svg>',
);
