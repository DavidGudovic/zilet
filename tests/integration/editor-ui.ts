// Run only against a disposable stack after acceptance.ts has created its test editor.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import poem from '../../fixtures/poem.json';
assert.equal(
  process.env.ZILET_DISPOSABLE_TEST,
  'true',
  'Set ZILET_DISPOSABLE_TEST=true only for an explicitly disposable local database.',
);
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Disposable local stack only',
);
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage();
const evidence: string[] = [];
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const dir = process.env.ZILET_EVIDENCE_DIR || 'docs/verification/editorial-reader-2026-09-08';
await mkdir(dir, { recursive: true });
try {
  await page.goto(`${base}/redakcija`);
  await page.getByLabel('Adresa e-pošte').fill(account.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Prijavi se', exact: true }).click();
  await page.waitForURL('**/redakcija*');
  await page
    .getByRole('navigation', { name: 'Redakcija', exact: true })
    .getByRole('link', { name: 'Tekstovi', exact: true })
    .click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'q');
  assert.equal(
    await page
      .getByRole('searchbox', { name: 'Pretraži tekstove' })
      .evaluate((el) => (el as HTMLElement).tabIndex),
    0,
  );

  await page
    .getByRole('navigation', { name: 'Redakcija', exact: true })
    .getByRole('link', { name: '+ Novi tekst', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Rubrika', exact: true }).click();
  await page.getByRole('option', { name: 'Poezija', exact: true }).click();
  await page.getByLabel('Naslov', { exact: true }).fill('Provjera bilješke i izbora');
  const author = page.getByRole('combobox', { name: 'Autor djela', exact: true });
  await author.tap();
  // The title's pending autosave causes a parent render while the menu is open.
  await page.waitForTimeout(2200);
  assert.equal(await author.getAttribute('aria-expanded'), 'true');
  await page.screenshot({ path: `${dir}/author-menu-390.png` });
  await page.getByRole('option', { name: 'Razvojni autor (test)', exact: true }).first().tap();
  assert.equal(await author.getAttribute('aria-expanded'), 'false');
  await page.getByLabel('Sadržaj pjesme', { exact: true }).fill(poem.text);
  const note = 'Ovo je zasebna urednička bilješka.\n\nPjesma ostaje u izvornom obliku.';
  await page.getByLabel('Bilješka urednika', { exact: true }).fill(note);
  await page.getByText('Dodatne mogućnosti', { exact: true }).click();
  const alignment = page.getByRole('combobox', { name: 'Poravnanje pjesme', exact: true });
  await alignment.click();
  await page.waitForTimeout(2200);
  assert.equal(await alignment.getAttribute('aria-expanded'), 'true');
  await alignment.press('End');
  await alignment.press('Enter');
  assert.match(await alignment.innerText(), /Centrirano/);
  await alignment.click();
  await alignment.press('Home');
  await alignment.press('Escape');
  assert.match(await alignment.innerText(), /Centrirano/);
  assert.equal(await alignment.evaluate((el) => el === document.activeElement), true);
  evidence.push(
    'Touch author menu survives parent autosave; keyboard alignment selects, Escape cancels and preserves focus',
  );
  const placement = page.getByRole('combobox', {
    name: 'Istakni na početnoj prilikom objave',
    exact: true,
  });
  await placement.click();
  await page.getByRole('option', { name: 'Prepusti automatskom izboru', exact: true }).click();
  await page.locator('.media-picker input[type=file]').setInputFiles('fixtures/strandgade.jpg');
  await page.locator('.selected-media').waitFor();
  await page.getByLabel('Opis slike za čitače ekrana').fill('Soba sa prozorom');
  await page.getByLabel('Autor fotografije / izvor i prava').fill('Vilhelm Hammershøi · CMA · CC0');
  const imagePosition = page.getByRole('combobox', { name: 'Položaj slike', exact: true });
  await imagePosition.tap();
  await page.waitForTimeout(1800);
  assert.equal(await imagePosition.getAttribute('aria-expanded'), 'true');
  await page.getByRole('option', { name: 'Iznad djela', exact: true }).tap();
  await page.getByRole('button', { name: 'Sačuvaj', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: /^Sačuvano$/ })
    .waitFor();
  await page.waitForURL('**/redakcija/tekst/*');
  const editorUrl = page.url();
  await page.reload();
  assert.equal(await page.getByLabel('Sadržaj pjesme', { exact: true }).inputValue(), poem.text);
  assert.equal(await page.getByLabel('Bilješka urednika', { exact: true }).inputValue(), note);
  assert.match(await imagePosition.innerText(), /Iznad djela/);
  evidence.push(
    'Image and homepage menus work with pointer/touch; exact verse, note and image placement survive save/reopen',
  );
  await page.getByRole('button', { name: 'Objavi', exact: true }).click();
  await page.getByText('Tekst je objavljen.', { exact: true }).waitFor();
  const publicPath = await page
    .getByRole('link', { name: 'Otvori objavljeni tekst', exact: false })
    .getAttribute('href');
  assert.ok(publicPath);
  await page.goto(base + publicPath);
  assert.equal(await page.locator('.verse').innerText(), poem.text);
  assert.equal(await page.locator('.editorial-note-text').innerText(), note);
  assert.match(await page.locator('.editorial-note-signature').innerText(), /Provjera editor/);
  assert.match(await page.locator('.posting-credit').innerText(), /Provjera editor/);
  assert.ok((await page.locator('.article-rail .byline').innerText()).includes('Razvojni autor'));
  await page.locator('.editorial-note').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${dir}/editorial-note-390.png` });
  await page.goto(editorUrl);
  await page.getByLabel('Bilješka urednika', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Sačuvaj', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: /^Sačuvano$/ })
    .waitFor();
  const readPage = await context.newPage();
  await readPage.goto(base + publicPath);
  assert.equal(await readPage.locator('.editorial-note-text').innerText(), note);
  await page.getByRole('button', { name: 'Objavi izmjene', exact: true }).click();
  await page.getByText('Tekst je objavljen.', { exact: true }).waitFor();
  await readPage.reload();
  assert.equal(await readPage.locator('.editorial-note').count(), 0);
  assert.equal(await readPage.locator('.verse').innerText(), poem.text);
  evidence.push(
    'UI publication renders distinct author, posting account and signed note; removing a note stays private until republishing',
  );
  await page.getByText('Dodatne mogućnosti', { exact: true }).click();
  await page.getByRole('button', { name: 'Povuci objavljeni tekst', exact: true }).click();
  await page
    .getByText('Tekst je povučen. Nacrt je sačuvan i može se ponovo objaviti.', { exact: true })
    .waitFor();
  assert.equal((await readPage.reload())?.status(), 404);
  assert.deepEqual(errors, []);
  await writeFile(
    `${dir}/editor-checks.json`,
    JSON.stringify({ date: new Date().toISOString(), evidence }, null, 2),
  );
  console.log(`PASS ${evidence.length} editor interaction workflows`);
} finally {
  await browser.close();
}
