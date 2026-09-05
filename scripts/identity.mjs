import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/identity', { recursive: true });
// Original vector lettering. Coordinate source is retained here; no font dependency.
const z = 'M8 45H113V53L34 146H78Q100 146 108 120H114L109 158H4V150L84 56H41Q19 56 14 81H8Z';
const caron = 'M36 9L62 22L93 0L67 33H56Z';
const i =
  'M134 79L156 72V146Q156 153 169 153V158H124V153Q136 153 136 146V91Q136 84 128 84H124V79ZM134 49A12 12 0 1 0 158 49A12 12 0 1 0 134 49Z';
const l = 'M186 36L209 29V146Q209 153 221 153V158H177V153Q189 153 189 146V47Q189 40 180 40H177V36Z';
const e =
  'M303 135Q291 160 267 160C238 160 228 140 228 117C228 91 242 73 267 73C292 73 303 90 303 113H249C249 136 258 148 274 148Q287 148 299 132ZM249 105H282Q282 82 267 82Q252 82 249 105Z';
const t =
  'M324 53L343 46V76H368V86H343V135Q343 148 354 148Q362 148 370 139L374 143Q362 160 348 160Q323 160 323 138V86H311V79Q324 72 324 53Z';
function svg(paths, color, view = '0 0 380 168') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" fill="${color}" role="img" aria-label="Žilet">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
for (const [name, color] of [
  ['green', '#173a2b'],
  ['mono', '#20251f'],
  ['reversed', '#f6f2e9'],
]) {
  writeFileSync(`public/identity/wordmark-${name}.svg`, svg([z, caron, i, l, e, t], color));
  writeFileSync(`public/identity/monogram-${name}.svg`, svg([z, caron], color, '0 0 120 168'));
}
writeFileSync(
  'docs/design/study-a.svg',
  svg([z, 'M35 5L62 22L88 5L95 12L63 35L29 13Z', i, l, e, t], '#173a2b'),
);
writeFileSync('docs/design/study-b.svg', svg([z, caron, i, l, e, t], '#173a2b'));
// Simplified small-size monogram; the chevron remains at favicon scale.
writeFileSync(
  'public/icon.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#173a2b"/><path fill="#f6f2e9" d="M9 4L16 7L23 3L17 10H15ZM7 12H25V15L13 25H25V28H7V25L19 15H7Z"/></svg>',
);
writeFileSync(
  'public/identity/avatar.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="#173a2b"/><g fill="#f6f2e9" transform="translate(61 40) scale(.65)">' +
    [z, caron].map((d) => `<path d="${d}"/>`).join('') +
    '</g></svg>',
);
