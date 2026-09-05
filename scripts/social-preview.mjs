import { readFileSync } from 'node:fs';
import sharp from 'sharp';
const wordmark = readFileSync('public/identity/wordmark-reversed.svg', 'utf8').replace(
  '<svg ',
  '<svg x="80" y="90" width="570" height="252" ',
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#173a2b"/>${wordmark}<path d="M80 430H1120" stroke="#a6b5a6"/><path d="M80 452H305" stroke="#f6f2e9" stroke-width="3"/><path d="M80 473H210" stroke="#a6b5a6"/></svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/identity/social-preview.png');
