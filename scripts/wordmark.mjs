import sharp from 'sharp';
// Masthead sizes for srcset. The header draws the wordmark 140–250 CSS px wide, so these cover
// one to three device pixels per CSS pixel; widths divisible by 9 keep the 9:4 shape exact.
// The full-size file stays for the publisher logo in structured data.
for (const width of [279, 549, 828])
  await sharp('public/identity/wordmark-generated.png')
    .resize({ width })
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toFile(`public/identity/wordmark-generated-${width}.webp`);
