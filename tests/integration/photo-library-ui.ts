// Run after acceptance.ts against an explicitly disposable built container.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
);
const dir = process.env.ZILET_EVIDENCE_DIR || `/tmp/zilet-photos-${new URL(base).port || '80'}`;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(base + '/redakcija');
  await page.getByLabel('Adresa e-pošte').fill(account.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Prijavi se', exact: true }).click();
  await page.getByRole('navigation', { name: 'Redakcija', exact: true }).waitFor();
  await page.goto(base + '/redakcija/fotografije');
  await expect(page.getByRole('heading', { name: 'Fotografije', exact: true })).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url() === base + '/api/media' && r.request().method() === 'POST',
  );
  await page.locator('.upload-zone input[type=file]').setInputFiles('fixtures/strandgade.jpg');
  const uploaded = await response;
  assert.equal(uploaded.status(), 201);
  const { id } = await uploaded.json();
  const image = page.locator(`img[src="/media/${id}?size=small"]`);
  await expect(image).toHaveCount(1);
  await expect(page.locator('.selected-media')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Iz biblioteke', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Položaj slike', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(image).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Fotografije', exact: true })).toBeVisible();
    const bounds = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.equal(bounds.viewport, width);
    assert.ok(bounds.document <= width, `Photo library overflows at ${width}px`);
    await page.screenshot({ path: `${dir}/photos-${width}.png` });
  }
  page.once('dialog', (dialog) => dialog.accept());
  await image.locator('..').getByRole('button', { name: 'Trajno izbriši', exact: true }).click();
  await expect(image).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS Photo upload appears exactly once, persists after reload, has no article-only controls, reflows at 320/390/768/1440px and deletes cleanly.',
  );
} finally {
  await browser.close();
}
