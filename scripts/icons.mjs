import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
// Raster icons for browsers and home screens that ignore public/icon.svg.
const svg = await readFile('public/icon.svg');
const png = (size) => sharp(svg, { density: (72 * size) / 32 }).resize(size, size);
// iOS rounds the corners itself and would paint the transparent ones black.
await png(180).flatten({ background: '#173a2b' }).png().toFile('public/apple-touch-icon.png');
// An ICO file may hold PNG images: a 6-byte header, a 16-byte entry per image, then the data.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...images]));
