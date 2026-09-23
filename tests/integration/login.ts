import assert from 'node:assert/strict';
import type { Page } from '@playwright/test';
type Account = { email: string; password: string };
// The disposable stack has no proxy, so every test sign-in shares one limit of a few a
// minute; how many earlier suites used up depends on the runner's speed. A 429 is waited
// out once, for the time the server advertises.
const retryAfter = (value: string | null | undefined) => {
  const seconds = Number(value || 60);
  return Number.isFinite(seconds) ? Math.max(1, Math.min(60, Math.ceil(seconds))) : 60;
};
const wait = (seconds: number) => {
  console.log(`Waiting ${seconds}s for the shared disposable login rate limit before one retry.`);
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
export async function browserLogin(page: Page, base: string, account: Account, returnTo: string) {
  await page.goto(`${base}/nalog?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Adresa e-pošte').fill(account.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
  for (let attempt = 0; ; attempt++) {
    const request = page.waitForResponse((r) => r.url() === `${base}/api/auth/sign-in/email`);
    await page.getByRole('button', { name: 'Prijavi se', exact: true }).click();
    const response = await request;
    if (response.status() === 429 && !attempt) {
      await wait(retryAfter(response.headers()['retry-after']));
      continue;
    }
    assert.equal(response.status(), 200, 'Browser login succeeds using isolated credentials');
    break;
  }
  await page.waitForURL(base + returnTo);
}
export async function apiLogin(base: string, account: Account) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(base + '/api/auth/sign-in/email', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    if (response.status === 429 && !attempt) {
      await wait(retryAfter(response.headers.get('retry-after')));
      continue;
    }
    assert.equal(response.status, 200);
    return response.headers
      .getSetCookie()
      .map((item) => item.split(';')[0])
      .join('; ');
  }
}
