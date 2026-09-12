// Run after acceptance.ts against an explicitly disposable built container.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
const origin = new URL(base);
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname));
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${origin.port || '80'}.json`, 'utf8'),
);
const login = await fetch(base + '/api/auth/sign-in/email', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify(account),
});
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((item) => item.split(';')[0])
  .join('; ');
async function call(path: string, method = 'GET', data?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}

const longUrl = `https://example.org/${'dugacki-link-bez-razmaka'.repeat(70)}`;
const verse = `  Śuma\n\n${'veomadugred'.repeat(100)}\n\nЈедан стих\t\\ ~\u200b\n`;
const author = await call('/api/authors', 'POST', {
  name: 'Mobilni prelom provjera',
  bio: longUrl,
});
const images = [];
for (const [width, height] of [
  [1600, 800],
  [800, 1600],
]) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: '#dce2cf' } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set(
    'file',
    new File([new Uint8Array(buffer)], `responsive-${width}.png`, { type: 'image/png' }),
  );
  const response = await fetch(base + '/api/media', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie },
    body: form,
  });
  assert.equal(response.status, 201);
  images.push(await response.json());
}
const defaults = {
  title: 'Mobilni prelom',
  intro: '',
  editorialNote: '',
  authorId: author.id,
  rubrics: ['zanimljivosti-o-poznatim-licnostima'],
  commentsOpen: false,
  media: [],
};
const fixtures = [
  {
    ...defaults,
    title: `Dugi naslov ${'neprekinutariječ'.repeat(14)}`,
    type: 'prose',
    body: {
      kind: 'prose',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: longUrl, marks: [{ type: 'link', attrs: { href: longUrl } }] },
            ],
          },
          {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: longUrl }] }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: longUrl }] }],
              },
            ],
          },
        ],
      },
    },
    media: images.map((item, index) => ({
      id: item.id,
      alt: `Razvojni format ${index + 1}`,
      caption: longUrl.slice(0, 900),
      credit: 'Razvojna provjera',
      placement: 'below',
      focalX: 50,
      focalY: 50,
    })),
  },
  {
    ...defaults,
    title: 'Dugi izvorni stih',
    type: 'poem',
    rubrics: ['poezija'],
    body: { kind: 'poem', text: verse, emphasis: [], align: 'left' },
  },
  {
    ...defaults,
    title: 'Śuma',
    type: 'poem',
    rubrics: ['poezija'],
    body: {
      kind: 'poem',
      text: '  Śuma\n\nTišina.',
      emphasis: [{ from: 2, to: 6, style: 'italic' }],
      align: 'left',
    },
  },
];
const live = [];
const dir = process.env.ZILET_EVIDENCE_DIR || `/tmp/zilet-responsive-${origin.port || '80'}`;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const evidence: { label: string; viewport: number; document: number }[] = [];
async function noOverflow(label: string, width: number) {
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.equal(dimensions.viewport, width);
  assert.ok(dimensions.document <= width + 1, `${label}: ${JSON.stringify(dimensions)}`);
  evidence.push({ label, ...dimensions });
}
try {
  for (const fixture of fixtures) {
    const draft = await call('/api/posts', 'POST', fixture);
    const published = await call(`/api/posts/${draft.id}/publish`, 'POST', {
      version: draft.version,
    });
    live.push({ id: draft.id, slug: draft.slug, version: published.version });
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, item] of live.entries()) {
      const response = await page.goto(base + '/tekst/' + item.slug);
      assert.equal(response?.status(), 200);
      await expect(page.locator('.article h1')).toBeVisible();
      await noOverflow(`article-${index}`, width);
      if (index === 0) {
        assert.equal(await page.locator('.prose a').textContent(), longUrl);
        assert.equal(
          await page.locator('.image-dialog img').count(),
          0,
          'Closed viewers must not load full images',
        );
        await page.locator('.art-open').first().click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('dialog').locator('img')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.art-open').first()).toBeFocused();
      }
      if (index === 1) {
        assert.equal(await page.locator('.verse').textContent(), verse);
        await page.getByRole('button', { name: 'Izvorni prelom' }).click();
        await noOverflow('original-verse', width);
        assert.ok(
          await page
            .locator('.verse.original')
            .evaluate((element) => element.scrollWidth > element.clientWidth),
        );
        assert.equal(await page.locator('.verse').textContent(), verse);
      }
      await page.locator('.article-heading').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/article-${index}-${width}.png` });
    }
    for (const route of [
      '/',
      '/autor/' + author.slug,
      '/rubrika/zanimljivosti-o-poznatim-licnostima',
      '/pretraga?q=Mobilni',
    ]) {
      assert.equal((await page.goto(base + route))?.status(), 200);
      await noOverflow(route, width);
    }
    await page.getByRole('button', { name: 'Sve rubrike' }).click();
    await expect(
      page
        .locator('#rubric-menu')
        .getByRole('link', { name: 'Zanimljivosti o poznatim ličnostima' }),
    ).toBeVisible();
    await noOverflow('rubric-menu', width);
    await page.screenshot({ path: `${dir}/rubric-menu-${width}.png` });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${dir}/results.json`, JSON.stringify(evidence, null, 2));
  console.log(
    'PASS long URLs, headings, lists, author bios, rubric labels and original verse at 320/390/768/1440; image dialog and focus restoration',
  );
} finally {
  await browser.close();
  for (const item of live) {
    await call(`/api/posts/${item.id}/unpublish`, 'POST', { version: item.version });
    await call('/api/posts/' + item.id, 'DELETE', { version: item.version + 1 });
  }
  for (const item of images) await call('/api/media/' + item.id, 'DELETE');
}
