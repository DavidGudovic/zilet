import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
);
const login = await fetch(base + '/api/auth/sign-in/email', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify(account),
});
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((s) => s.split(';')[0])
  .join('; ');
async function call(path: string, method = 'GET', data?: unknown) {
  const r = await fetch(base + path, {
    method,
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  assert.ok(r.ok, `${method} ${path}: ${r.status}`);
  return r.json();
}
const author = await call('/api/authors', 'POST', { name: 'SEO provjera' });
const content = {
  title: 'Provjera mape sajta',
  intro: '',
  editorialNote: '',
  authorId: author.id,
  type: 'poem',
  body: { kind: 'poem', text: 'Riječi\n\nna papiru.', emphasis: [], align: 'left' },
  rubrics: ['poezija'],
  media: [],
  commentsOpen: true,
};
const post = await call('/api/posts', 'POST', content);
async function sitemap() {
  const r = await fetch(base + '/sitemap.xml');
  assert.equal(r.status, 200);
  const xml = await r.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!urls.some((u) => u.includes('/rubrika/price')));
  assert.ok(urls.includes(base + '/rubrika/umjetnost'));
  return xml;
}
assert.ok(!(await sitemap()).includes('/tekst/' + post.slug));
let current = await call(`/api/posts/${post.id}/publish`, 'POST', { version: post.version });
const published = await sitemap();
assert.ok(published.includes('/tekst/' + post.slug));
current = await call('/api/posts/' + post.id, 'PUT', {
  version: current.version,
  content: { ...content, title: 'Privatni nacrt' },
});
assert.equal(await sitemap(), published, 'Autosave must not change public sitemap lastModified');
await call(`/api/posts/${post.id}/unpublish`, 'POST', { version: current.version });
assert.ok(!(await sitemap()).includes('/tekst/' + post.slug));
await call('/api/posts/' + post.id, 'DELETE', { version: current.version + 1 });
const home = await (await fetch(base)).text();
assert.ok(home.includes(`rel="canonical" href="${base}"`));
const paginationPosts = [];
for (let i = 0; i < 13; i++) {
  const draft = await call('/api/posts', 'POST', { ...content, title: `Stranica arhive ${i}` });
  const live = await call(`/api/posts/${draft.id}/publish`, 'POST', { version: draft.version });
  paginationPosts.push({ id: draft.id, version: live.version });
}
const rubricResponse = await fetch(base + '/rubrika/poezija?page=2');
assert.equal(rubricResponse.status, 200);
const rubric = await rubricResponse.text();
assert.ok(rubric.includes(`rel="canonical" href="${base}/rubrika/poezija?page=2"`));
for (const item of paginationPosts) {
  await call(`/api/posts/${item.id}/unpublish`, 'POST', { version: item.version });
  await call('/api/posts/' + item.id, 'DELETE', { version: item.version + 1 });
}
assert.equal((await fetch(base + '/autor/' + author.slug + '?page=999')).status, 404);
const robots = await (await fetch(base + '/robots.txt')).text();
assert.ok(robots.includes('Sitemap: ' + base + '/sitemap.xml'));
const font = await fetch(base + '/fonts/source-serif-4-latin-wght-normal.woff2', {
  method: 'HEAD',
});
assert.equal(font.headers.get('cache-control'), 'public, max-age=604800');
const logo = await fetch(base + '/identity/wordmark-generated.webp');
assert.equal(logo.headers.get('content-type'), 'image/webp');
assert.equal(logo.headers.get('cache-control'), 'public, max-age=86400');
const privateResponse = await fetch(base + '/redakcija', { headers: { Cookie: cookie } });
assert.match(privateResponse.headers.get('cache-control') || '', /no-store/);
console.log(
  'PASS canonical URLs, live-only sitemap with stable draft dates, author 404s, robots, font/logo caching and private no-store',
);
