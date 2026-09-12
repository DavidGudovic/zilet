// Run after submissions.ts against its explicitly disposable built local stack.
import { chromium, expect, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { db, sql } from '../../src/db';
import { submissions } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
const origin = new URL(base);
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname));
const mailBase = process.env.MAILPIT_URL || 'http://localhost:8025';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(mailBase).hostname));
const editor = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${origin.port || '80'}.json`, 'utf8'),
);
const reader = JSON.parse(
  await readFile(`/tmp/zilet-reader-account-${origin.port || '80'}.json`, 'utf8'),
);
const dir = process.env.ZILET_EVIDENCE_DIR || `/tmp/zilet-correspondence-${origin.port || '80'}`;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const editorContext = await browser.newContext({
  viewport: { width: 390, height: 900 },
  reducedMotion: 'reduce',
});
const readerContext = await browser.newContext({
  viewport: { width: 390, height: 900 },
  reducedMotion: 'reduce',
});
const editorPage = await editorContext.newPage();
const readerPage = await readerContext.newPage();
const mailPage = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errors: string[] = [];
for (const page of [editorPage, readerPage, mailPage])
  page.on('pageerror', (error) => errors.push(error.message));
const evidence: { label: string; viewport: number; document: number }[] = [];
let submissionId: string | undefined;
const title = `Razgovor o radu — razvojna provjera ${Date.now()}`;
const question = `Možete li pojasniti naslov i potvrditi izvor?\n\nhttps://example.test/${'dugalinkbezzrazmaka'.repeat(55)}`;
const reply = 'Naslov opisuje tišinu sobe. Izvor je moj rukopis. Hvala na pitanju.';
const decision = 'Hvala na odgovoru i povjerenju. Ovog puta nijesmo izabrali rad za objavu.';
async function login(page: Page, account: { email: string; password: string }, returnTo: string) {
  await page.goto(`${base}/nalog?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Adresa e-pošte').fill(account.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
  const request = page.waitForResponse((r) => r.url() === `${base}/api/auth/sign-in/email`);
  await page.getByRole('button', { name: 'Prijavi se', exact: true }).click();
  let response = await request;
  if (response.status() === 429) {
    const supplied = Number(response.headers()['retry-after'] || 60);
    const seconds = Number.isFinite(supplied) ? Math.max(1, Math.min(60, Math.ceil(supplied))) : 60;
    console.log(`Waiting ${seconds}s for the shared disposable login rate limit before one retry.`);
    await page.waitForTimeout(seconds * 1000);
    const retry = page.waitForResponse((r) => r.url() === `${base}/api/auth/sign-in/email`);
    await page.getByRole('button', { name: 'Prijavi se', exact: true }).click();
    response = await retry;
  }
  assert.equal(response.status(), 200, 'Browser login succeeds using isolated credentials');
  await page.waitForURL(base + returnTo);
}
async function measure(page: Page, label: string, width: number) {
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.equal(dimensions.viewport, width);
  assert.ok(dimensions.document <= width + 1, `${label}: ${JSON.stringify(dimensions)}`);
  evidence.push({ label, ...dimensions });
}
async function snapshotThread(page: Page, label: string) {
  const thread = page.getByRole('region', { name: 'Razgovor o prilogu', exact: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(thread).toBeVisible();
    await measure(page, label, width);
    if (label.endsWith('-reply') || label.endsWith('-decision'))
      await thread.locator('li').last().scrollIntoViewIfNeeded();
    else await thread.getByRole('heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/${label}-${width}.png` });
  }
}
async function getMail(subject: string, body: string) {
  const inbox = await (await fetch(mailBase + '/api/v1/messages')).json();
  for (const item of inbox.messages.filter(
    (m: { Subject: string; To: { Address: string }[] }) =>
      m.Subject === subject && m.To.some((t) => t.Address === reader.email),
  )) {
    const message = await (await fetch(mailBase + '/api/v1/message/' + item.ID)).json();
    if (message.Text.includes(title) && message.Text.replace(/\r\n/g, '\n').includes(body))
      return message as { HTML: string; Text: string };
  }
  assert.fail(`Missing local message: ${subject}`);
}
async function snapshotMail(html: string, label: string) {
  await mailPage.setContent(html, { waitUntil: 'networkidle' });
  const logo = mailPage.getByRole('img', { name: 'Žilet', exact: true });
  await expect(logo).toBeVisible();
  assert.ok(
    await logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  );
  await expect(
    mailPage.getByRole('link', { name: 'Pogledaj svoj prilog', exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await mailPage.setViewportSize({ width, height: 1000 });
    await measure(mailPage, label, width);
    await mailPage.screenshot({ path: `${dir}/${label}-${width}.png`, fullPage: true });
  }
}
try {
  await login(readerPage, reader, '/posalji');
  await expect(
    readerPage.getByRole('heading', { name: 'Pošaljite svoj rad', exact: true }),
  ).toBeVisible();
  await readerPage.getByRole('combobox', { name: 'Rubrika', exact: true }).click();
  await readerPage.getByRole('option', { name: 'Poezija', exact: true }).click();
  await readerPage.getByLabel('Naslov', { exact: true }).fill(title);
  await readerPage
    .getByLabel('Vaš tekst', { exact: true })
    .fill('  Śutnja\n\nSoba čuva svjetlost.\n');
  await readerPage.locator('input[name=consent]').check();
  const submissionRequest = readerPage.waitForResponse(
    (r) => r.url() === `${base}/api/submissions` && r.request().method() === 'POST',
  );
  await readerPage.getByRole('button', { name: 'Pošalji redakciji', exact: true }).click();
  const submitted = await submissionRequest;
  assert.equal(submitted.status(), 201);
  submissionId = (await submitted.json()).id;
  assert.ok(submissionId);
  await expect(readerPage.getByRole('heading', { name: title, exact: true })).toBeVisible();

  await login(editorPage, editor, `/redakcija/prilozi/${submissionId}`);
  await expect(editorPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await editorPage.getByLabel('Pitanje ili zahtjev prije odluke', { exact: true }).fill(question);
  const questionRequest = editorPage.waitForResponse(
    (r) =>
      r.url() === `${base}/api/submissions/${submissionId}/messages` &&
      r.request().method() === 'POST',
  );
  await editorPage.getByRole('button', { name: 'Pošalji poruku čitaocu', exact: true }).click();
  const asked = await questionRequest;
  assert.equal(asked.status(), 201);
  assert.equal((await asked.json()).deliveryStatus, 'sent');
  await expect(
    editorPage.getByRole('region', { name: 'Razgovor o prilogu' }).locator('li'),
  ).toHaveCount(1);
  await snapshotThread(editorPage, 'conversation-editor-question');
  const questionMail = await getMail('Žilet — poruka redakcije', question);
  await snapshotMail(questionMail.HTML, 'email-question');
  const href = await mailPage
    .getByRole('link', { name: 'Pogledaj svoj prilog', exact: true })
    .getAttribute('href');
  assert.ok(href);
  assert.equal(new URL(href).searchParams.get('prilog'), submissionId);
  await readerPage.goto(href);
  await expect(readerPage.getByLabel('Vaš odgovor redakciji', { exact: true })).toBeVisible();
  await snapshotThread(readerPage, 'conversation-reader-question');
  await readerPage.getByLabel('Vaš odgovor redakciji', { exact: true }).fill(reply);
  const replyRequest = readerPage.waitForResponse(
    (r) =>
      r.url() === `${base}/api/submissions/${submissionId}/messages` &&
      r.request().method() === 'POST',
  );
  await readerPage.getByRole('button', { name: 'Pošalji odgovor', exact: true }).click();
  const answered = await replyRequest;
  assert.equal(answered.status(), 201);
  assert.equal((await answered.json()).deliveryStatus, 'sent');
  await expect(
    readerPage.getByRole('region', { name: 'Razgovor o prilogu' }).locator('li'),
  ).toHaveCount(2);
  await snapshotThread(readerPage, 'conversation-reader-reply');

  await editorPage.reload();
  await expect(editorPage.getByText(reply, { exact: true })).toBeVisible();
  await editorPage
    .getByLabel('Bilješka uz prihvaćeni rad ili odgovor čitaocu', { exact: true })
    .fill(decision);
  const decisionRequest = editorPage.waitForResponse(
    (r) =>
      r.url() === `${base}/api/submissions/${submissionId}` && r.request().method() === 'PATCH',
  );
  await editorPage.getByRole('button', { name: 'Ne izaberi ovaj rad', exact: true }).click();
  const decided = await decisionRequest;
  assert.equal(decided.status(), 200);
  assert.equal((await decided.json()).deliveryStatus, 'sent');
  await expect(editorPage.getByText('Prilog nije izabran.', { exact: true })).toBeVisible();
  await expect(
    editorPage.getByLabel('Pitanje ili zahtjev prije odluke', { exact: true }),
  ).toHaveCount(0);
  await snapshotThread(editorPage, 'conversation-editor-decision');
  const decisionMail = await getMail('Žilet — odluka o vašem radu', decision);
  await snapshotMail(decisionMail.HTML, 'email-decision');
  await readerPage.reload();
  await expect(readerPage.getByLabel('Vaš odgovor redakciji', { exact: true })).toHaveCount(0);
  await expect(
    readerPage.getByRole('region', { name: 'Razgovor o prilogu' }).locator('li'),
  ).toHaveCount(3);
  await snapshotThread(readerPage, 'conversation-reader-decision');
  readerPage.once('dialog', (dialog) => dialog.accept());
  await readerPage.getByRole('button', { name: 'Trajno izbriši prilog', exact: true }).click();
  await expect(readerPage.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  assert.deepEqual(errors, []);
  await writeFile(`${dir}/correspondence-results.json`, JSON.stringify(evidence, null, 2));
  console.log(
    'PASS Real browser submission, private question/reply/decision, branded Mailpit HTML, 320/390/768/1440px reflow and reader deletion.',
  );
} finally {
  if (submissionId) {
    const [fixture] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (fixture) {
      assert.equal(fixture.title, title, 'Cleanup is limited to this browser fixture');
      const deleted = await readerContext.request.delete(
        `${base}/api/submissions/${submissionId}`,
        { headers: { Origin: base }, data: { version: fixture.version } },
      );
      assert.equal(deleted.status(), 200, 'Remove only the retained browser-test submission');
    }
  }
  await browser.close();
  await sql.end();
}
