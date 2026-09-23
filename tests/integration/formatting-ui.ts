// Run after acceptance.ts against an explicitly disposable built container.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pasteVerse, verseText } from './verse';
import { browserLogin } from './login';
assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
);
const dir = process.env.ZILET_EVIDENCE_DIR || '/tmp/zilet-formatting-evidence';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const evidence: string[] = [];
async function save() {
  await page.getByRole('button', { name: 'Sačuvaj', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: /^Sačuvano$/ })
    .waitFor();
}
async function start(rubric: string, title: string) {
  await page.goto(base + '/redakcija/novi');
  await page.getByRole('combobox', { name: 'Rubrika', exact: true }).click();
  assert.equal(await page.getByRole('option', { name: 'Radovi čitalaca', exact: true }).count(), 0);
  await page.getByRole('option', { name: rubric, exact: true }).click();
  await page.getByLabel('Naslov', { exact: true }).fill(title);
  await page.getByRole('combobox', { name: 'Autor djela', exact: true }).click();
  await page.getByRole('option', { name: 'RAZVOJNI AUTOR (TEST)', exact: true }).first().click();
}
try {
  await browserLogin(page, base, account, '/redakcija');
  await page.getByRole('navigation', { name: 'Redakcija', exact: true }).waitFor();
  await start('Poezija', 'Kratka pjesma bez slike — Śutnja');
  const poem = page.getByLabel('Sadržaj pjesme', { exact: true });
  const text = '  Śutnja\n\nСоба\tса прозором\n\\ ~\u200b\n';
  await pasteVerse(poem, text);
  assert.equal(await verseText(poem), text);
  await poem.press('Control+Home');
  await poem.press('ArrowRight');
  await poem.press('ArrowRight');
  for (let i = 0; i < 6; i++) await poem.press('Shift+ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()), {
      message: 'Keyboard selection must cover the word before using the toolbar',
    })
    .toBe('Śutnja');
  await page.getByRole('button', { name: 'Kurziv', exact: true }).tap();
  assert.equal(await poem.locator('em').innerText(), 'Śutnja');
  assert.equal(
    await page.getByRole('button', { name: 'Kurziv', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Masno', exact: true }).tap();
  assert.equal(await poem.locator('strong em, em strong').innerText(), 'Śutnja');
  assert.equal(await verseText(poem), text);
  await save();
  await page.reload();
  assert.equal(await verseText(poem), text);
  assert.equal(await poem.locator('strong em, em strong').innerText(), 'Śutnja');
  assert.equal(await poem.locator('em, strong').count(), 2);
  await poem.scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + '/poem-formatting-390.png' });
  await page.getByRole('button', { name: 'Objavi', exact: true }).click();
  await page.getByText('Tekst je objavljen.', { exact: true }).waitFor();
  const poemUrl = await page
    .getByRole('link', { name: 'Otvori objavljeni tekst', exact: false })
    .getAttribute('href');
  evidence.push(
    'Poem touch formatting shows bold/italic in the verse itself and preserves exact canonical whitespace through save/reopen.',
  );
  await start('Proza', 'Citat, kurziv i masno u prozi');
  const prose = page.locator('[contenteditable=true]');
  await prose.click();
  await prose.pressSequentially('Svjetlost ostaje na prozoru.');
  await expect(prose).toHaveText('Svjetlost ostaje na prozoru.');
  for (const _ of 'Svjetlost ostaje na prozoru.') await prose.press('Shift+ArrowLeft');
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()), {
      message: 'Keyboard selection must cover the prose before using the toolbar',
    })
    .toBe('Svjetlost ostaje na prozoru.');
  await page.getByRole('button', { name: 'Masno', exact: true }).tap();
  assert.equal(await prose.locator('strong').innerText(), 'Svjetlost ostaje na prozoru.');
  await page.getByRole('button', { name: 'Kurziv', exact: true }).tap();
  assert.equal(
    await prose.locator('strong em, em strong').innerText(),
    'Svjetlost ostaje na prozoru.',
  );
  await page.getByRole('button', { name: 'Citat', exact: true }).tap();
  assert.equal(await prose.locator('blockquote').innerText(), 'Svjetlost ostaje na prozoru.');
  await expect(page.getByRole('button', { name: 'Citat', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await save();
  await page.reload();
  await prose.waitFor();
  assert.equal(
    await prose.locator('blockquote strong em, blockquote em strong').innerText(),
    'Svjetlost ostaje na prozoru.',
  );
  await prose.scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + '/prose-formatting-390.png' });
  await page.getByRole('button', { name: 'Objavi', exact: true }).click();
  await page.getByText('Tekst je objavljen.', { exact: true }).waitFor();
  const proseUrl = await page
    .getByRole('link', { name: 'Otvori objavljeni tekst', exact: false })
    .getAttribute('href');
  evidence.push(
    'Prose bold, italic and Citat work with real touch clicks, expose active state and survive save/reopen.',
  );
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  for (const width of [1440, 768, 390, 320]) {
    await publicPage.setViewportSize({ width, height: 900 });
    for (const [label, path] of [
      ['readers', '/rubrika/citaoci'],
      ['home', '/'],
      ['poem', poemUrl!],
      ['prose', proseUrl!],
    ]) {
      const response = await publicPage.goto(base + path);
      assert.equal(response?.status(), 200);
      await publicPage.evaluate(() => document.fonts.ready);
      assert.equal(await publicPage.evaluate(() => window.innerWidth), width);
      assert.equal(
        await publicPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
        false,
        `${label} at ${width}`,
      );
      if (label === 'readers')
        assert.equal(
          await publicPage
            .locator('.reader-invitation')
            .getByRole('link', { name: 'Pošaljite rad', exact: false })
            .getAttribute('href'),
          '/posalji',
        );
      if (label === 'poem') assert.equal(await publicPage.locator('.verse').innerText(), text);
      if (label === 'prose')
        assert.equal(
          await publicPage
            .locator('.reading-column blockquote strong em, .reading-column blockquote em strong')
            .innerText(),
          'Svjetlost ostaje na prozoru.',
        );
      await publicPage.screenshot({ path: `${dir}/${label}-${width}.png` });
      if (label === 'prose') {
        // Readers share the article's address; the menu must fit even the narrowest phone.
        const share = publicPage.getByRole('button', { name: 'Podijeli', exact: false });
        await share.click();
        assert.equal(await share.getAttribute('aria-expanded'), 'true');
        const address = encodeURIComponent(new URL(proseUrl!, base).href);
        const choices = publicPage.getByRole('group', { name: 'Podijelite tekst' });
        assert.equal(
          await choices.getByRole('link', { name: /Facebook/ }).getAttribute('href'),
          `https://www.facebook.com/sharer/sharer.php?u=${address}`,
        );
        assert.equal(
          await choices.getByRole('link', { name: /Viber/ }).getAttribute('href'),
          `viber://forward?text=${address}`,
        );
        assert.equal(
          await publicPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
          false,
          `open share menu at ${width}`,
        );
        await publicPage.locator('.article-rail').screenshot({ path: `${dir}/share-${width}.png` });
        await share.press('Escape');
        assert.equal(await share.getAttribute('aria-expanded'), 'false');
      }
    }
  }
  evidence.push(
    'Readers share an article to Facebook/Viber from one Podijeli button at 320–1440 px.',
  );
  await publicPage.goto(base + '/rubrika/citaoci');
  await publicPage
    .locator('.reader-invitation')
    .getByRole('link', { name: 'Pošaljite rad', exact: false })
    .click();
  await publicPage.waitForURL('**/posalji');
  await publicPage.emulateMedia({ reducedMotion: 'reduce' });
  await publicPage.goto(base + '/rubrika/citaoci');
  assert.equal(
    await publicPage
      .locator('.submission-link span')
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    '0s',
  );
  await publicPage.emulateMedia({ media: 'print' });
  assert.equal(await publicPage.locator('.reader-invitation').isVisible(), false);
  evidence.push(
    'Public home, reader rubric, poem and quoted prose fit 320/390/768/1440 px; submit link works; reduced motion and print verified.',
  );
  await page.goto(base + '/redakcija/novi');
  const draft = page.getByLabel('Sadržaj', { exact: true });
  await pasteVerse(draft, 'Prvi red vijesti.\nDrugi red.\n\nNovi pasus.');
  assert.equal(await verseText(draft), 'Prvi red vijesti.\nDrugi red.\n\nNovi pasus.');
  await page.getByRole('combobox', { name: 'Rubrika', exact: true }).click();
  await page.getByRole('option', { name: 'Novosti', exact: true }).click();
  const news = page.locator('[contenteditable=true]');
  await expect(news.locator('p')).toHaveCount(2);
  await expect(news.locator('p').first().locator('br')).toHaveCount(1);
  assert.equal(await page.getByLabel('Sadržaj pjesme', { exact: true }).count(), 0);
  evidence.push('Text pasted before choosing Novosti becomes paragraphs, not verse.');
  assert.deepEqual(errors, []);
  await writeFile(
    dir + '/checks.json',
    JSON.stringify({ date: new Date().toISOString(), evidence }, null, 2),
  );
  console.log('PASS formatting, public layouts, reduced motion and print');
} catch (error) {
  await page.screenshot({ path: dir + '/failure.png' });
  console.log('Failure page:', page.url(), (await page.locator('body').innerText()).slice(0, 800));
  throw error;
} finally {
  await browser.close();
}
