import sharp from 'sharp';
// Compose the publication card from the same transparent masthead used on the site.
const lines = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f6f2e9"/><path d="M0 9H1200" stroke="#173a2b" stroke-width="18"/><path d="M-100 560C200 620 410 377 652 436S969 619 1300 460M-100 576C202 636 413 393 654 452S975 638 1300 477" fill="none" stroke="#173a2b"/><path d="M-40 570C170 560 477 293 571 397S543 524 490 468S805 405 1280 555" fill="none" stroke="#99543d"/><circle cx="570" cy="397" r="8" fill="#bc893a"/></svg>`;
const logo = await sharp('public/identity/wordmark-generated.png')
  .resize({ width: 710 })
  .toBuffer();
await sharp(Buffer.from(lines))
  .composite([{ input: logo, top: 70, left: 245 }])
  .png()
  .toFile('public/identity/social-preview.png');
