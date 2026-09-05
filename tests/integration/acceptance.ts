import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import { db, sql } from '../../src/db';
import { user, limits, rateLimit, posts, comments } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import poem from '../../fixtures/poem.json';
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Local-only acceptance suite',
);
const password = randomBytes(20).toString('base64url');
const stamp = Date.now();
const evidence: string[] = [];
async function request(path: string, method = 'GET', body?: unknown, cookie = '', origin = base) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let data;
  const text = await r.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { r, data, text };
}
const ok = (label: string) => {
  evidence.push(label);
  console.log(`PASS ${label}`);
};
async function signup(prefix: string, role = 'reader') {
  const email = `${prefix}-${stamp}@zilet.test`;
  const signup = await request('/api/auth/sign-up/email', 'POST', {
    name: `Provjera ${prefix}`,
    email,
    password,
    role,
    callbackURL: `${base}/nalog`,
  });
  assert.equal(signup.r.status, 200, JSON.stringify(signup.data));
  let messageId = '';
  for (let tries = 0; tries < 15; tries++) {
    const messages = await (await fetch('http://localhost:8025/api/v1/messages')).json();
    messageId = messages.messages?.find((m: { To: { Address: string }[] }) =>
      m.To?.some((to) => to.Address === email),
    )?.ID;
    if (messageId) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(messageId, 'Verification mail delivered to local mail sink');
  const mail = await (await fetch(`http://localhost:8025/api/v1/message/${messageId}`)).json();
  const url = mail.Text.match(/https?:\/\/[^\s]+\/api\/auth\/verify-email\?[^\s]+/)?.[0];
  assert.ok(url, mail.Text);
  const verification = await fetch(url, { redirect: 'manual' });
  assert.ok([200, 302].includes(verification.status));
  const login = await request('/api/auth/sign-in/email', 'POST', { email, password });
  assert.equal(login.r.status, 200, JSON.stringify(login.data));
  const cookie = login.r.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
  assert.ok(cookie);
  return { id: login.data.user.id, email, cookie };
}
try {
  await db.delete(rateLimit);
  await db.delete(limits);
  const editor = await signup('editor');
  await db.update(user).set({ role: 'editor' }).where(eq(user.id, editor.id));
  const reader = await signup('reader');
  const other = await signup('other', 'maintainer');
  const [otherRow] = await db.select().from(user).where(eq(user.id, other.id));
  assert.equal(otherRow.role, 'reader');
  ok('Registration, real sink mail, verification, sign-in; client role escalation rejected');
  await writeFile(
    '/tmp/zilet-browser-account.json',
    JSON.stringify({ email: editor.email, password }),
    { mode: 0o600 },
  );
  assert.equal((await request('/api/posts/sample-poem')).r.status, 401);
  assert.equal(
    (await request('/api/posts/sample-poem', 'GET', undefined, reader.cookie)).r.status,
    403,
  );
  ok('Anonymous and reader cannot read editorial drafts');
  const testAuthor = await request(
    '/api/authors',
    'POST',
    { name: 'Razvojni autor (test)' },
    editor.cookie,
  );
  assert.equal(testAuthor.r.status, 201);
  const content = {
    title: 'Provjera: pjesma i izvorni redovi',
    intro: '',
    authorId: testAuthor.data.id,
    type: 'poem',
    body: {
      kind: 'poem',
      text: poem.text,
      align: 'left',
      emphasis: [{ from: 1, to: 9, style: 'italic' }],
    },
    rubrics: ['poezija'],
    media: [],
    commentsOpen: true,
  };
  const created = await request('/api/posts', 'POST', content, editor.cookie);
  assert.equal(created.r.status, 201, JSON.stringify(created.data));
  let post = created.data;
  const loaded = await request(`/api/posts/${post.id}`, 'GET', undefined, editor.cookie);
  assert.equal(loaded.data.content.body.text, poem.text);
  assert.deepEqual(loaded.data.content.body.emphasis, content.body.emphasis);
  ok(
    'Poetry source, zero-width characters, authored line breaks and emphasis round-trip through PostgreSQL',
  );
  assert.equal((await request(`/tekst/${post.slug}`)).r.status, 404);
  assert.equal(
    (await request(`/api/posts/${post.id}`, 'PUT', { version: 0, content }, editor.cookie)).r
      .status,
    409,
  );
  ok('Unpublished article is absent; stale editor revision rejected');
  const imageForm = new FormData();
  imageForm.set(
    'file',
    new Blob([await readFile('fixtures/strandgade.jpg')], { type: 'image/jpeg' }),
    'strandgade.jpg',
  );
  const uploaded = await fetch(`${base}/api/media`, {
    method: 'POST',
    headers: { Origin: base, Cookie: editor.cookie },
    body: imageForm,
  });
  assert.equal(uploaded.status, 201);
  const media = await uploaded.json();
  assert.equal((await request(`/media/${media.id}`)).r.status, 404);
  assert.equal(
    (await request(`/media/${media.id}`, 'GET', undefined, reader.cookie)).r.status,
    404,
  );
  ok('Image upload decoded and stored; unpublished media cannot be read anonymously or by reader');
  const withArt = {
    ...content,
    media: [
      {
        id: media.id,
        alt: 'Razvojna slika sobe',
        caption: 'Samo za test',
        credit: 'Vilhelm Hammershøi · CMA · CC0',
        placement: 'below',
        focalX: 50,
        focalY: 50,
      },
    ],
  };
  const saved = await request(
    `/api/posts/${post.id}`,
    'PUT',
    { version: post.version, content: withArt },
    editor.cookie,
  );
  assert.equal(saved.r.status, 200, JSON.stringify(saved.data));
  post = saved.data;
  const published = await request(
    `/api/posts/${post.id}/publish`,
    'POST',
    { version: post.version },
    editor.cookie,
  );
  assert.equal(published.r.status, 200, JSON.stringify(published.data));
  post = { ...post, version: published.data.version };
  const publicPage = await request(`/tekst/${post.slug}`);
  assert.equal(publicPage.r.status, 200);
  assert.ok(publicPage.text.includes('Provjera: pjesma'));
  assert.equal((await request(`/media/${media.id}`)).r.status, 200);
  assert.ok((await request('/rubrika/poezija')).text.includes('Provjera: pjesma'));
  ok('Publishing with image appears in SSR article and archive without rebuild');
  const changed = {
    ...withArt,
    title: 'Privatna izmjena koja čeka objavu',
    body: { ...withArt.body, text: '  Nova\tstrofa\n\n\nDrugi red  ', emphasis: [] },
  };
  const pending = await request(
    `/api/posts/${post.id}`,
    'PUT',
    { version: post.version, content: changed },
    editor.cookie,
  );
  assert.equal(pending.r.status, 200);
  post = pending.data;
  assert.ok(!(await request(`/tekst/${post.slug}`)).text.includes(changed.title));
  const preview = await request(`/redakcija/pregled/${post.id}`, 'GET', undefined, editor.cookie);
  assert.ok(preview.text.includes(changed.title));
  assert.ok(!(await request(`/redakcija/pregled/${post.id}`)).text.includes(changed.title));
  assert.ok(!(await request('/sitemap.xml')).text.includes('redakcija'));
  ok(
    'Published revision stays unchanged while private preview shows pending revision; private material absent anonymously',
  );
  const comment = await request(
    '/api/comments',
    'POST',
    { postId: post.id, body: 'Stvarni probni komentar\n<script>alert(1)</script>' },
    reader.cookie,
  );
  assert.equal(comment.r.status, 201, JSON.stringify(comment.data));
  const commentId = comment.data.id;
  assert.equal(
    (await request(`/api/comments/${commentId}`, 'PATCH', { action: 'delete' }, other.cookie)).r
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        '/api/comments',
        'POST',
        { postId: post.id, body: 'Cross-origin' },
        reader.cookie,
        'https://invalid.test',
      )
    ).r.status,
    403,
  );
  ok('Verified reader posts; cross-account deletion and cross-origin submission forbidden');
  const visible = await request(`/tekst/${post.slug}`);
  assert.ok(visible.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(
    (await request(`/api/comments/${commentId}`, 'PATCH', { action: 'remove' }, editor.cookie)).r
      .status,
    200,
  );
  assert.ok(!(await request(`/tekst/${post.slug}`)).text.includes('Stvarni probni komentar'));
  assert.equal((await request(`/api/comments?postId=${post.id}`)).data.count, 0);
  assert.equal(
    (await request(`/api/comments/${commentId}`, 'PATCH', { action: 'restore' }, editor.cookie)).r
      .status,
    200,
  );
  assert.equal((await request(`/api/comments?postId=${post.id}`)).data.count, 1);
  ok('Plain-text comment escaping; removal and count update immediately; restoration works');
  const promo = await request(
    `/api/posts/${post.id}/publish`,
    'POST',
    { version: post.version },
    editor.cookie,
  );
  assert.equal(promo.r.status, 200);
  post = { ...post, version: promo.data.version };
  assert.ok((await request(`/tekst/${post.slug}`)).text.includes(changed.title));
  ok('Objavi izmjene deliberately promotes the new public revision');
  const analytics = await request('/redakcija/statistika', 'GET', undefined, editor.cookie);
  assert.ok(analytics.text.includes('Statistika još nije povezana'));
  ok('Unconnected analytics truthfully renders unavailable state');
  const badForm = new FormData();
  badForm.set(
    'file',
    new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], {
      type: 'image/jpeg',
    }),
    'fake.jpg',
  );
  const bad = await fetch(`${base}/api/media`, {
    method: 'POST',
    headers: { Origin: base, Cookie: editor.cookie },
    body: badForm,
  });
  assert.equal(bad.status, 400);
  ok('Disguised executable SVG is rejected by decoded-format validation');
  const recovery = await request('/api/auth/request-password-reset', 'POST', {
    email: reader.email,
    redirectTo: `base/nova-lozinka`.replace('base', base),
  });
  assert.equal(recovery.r.status, 200);
  ok('Password recovery request succeeds through configured local mail path');
  const inbox = await (await fetch('http://localhost:8025/api/v1/messages')).json();
  let resetURL = '';
  for (const msg of inbox.messages.filter((m: any) =>
    m.To?.some((to: any) => to.Address === reader.email),
  )) {
    const mail = await (await fetch(`http://localhost:8025/api/v1/message/${msg.ID}`)).json();
    resetURL = mail.Text.match(/https?:\/\/[^\s]+\/api\/auth\/reset-password\/[^\s]+/)?.[0] || '';
    if (resetURL) break;
  }
  assert.ok(resetURL, 'Recovery link actually arrives');
  const resetRedirect = await fetch(resetURL, { redirect: 'manual' });
  const token = new URL(resetRedirect.headers.get('location')!, base).searchParams.get('token');
  assert.ok(token);
  const nextPassword = randomBytes(20).toString('base64url');
  const reset = await request('/api/auth/reset-password', 'POST', {
    token,
    newPassword: nextPassword,
  });
  assert.equal(reset.r.status, 200, JSON.stringify(reset.data));
  assert.notEqual(
    (await request('/api/auth/reset-password', 'POST', { token, newPassword: password })).r.status,
    200,
  );
  assert.equal(
    (
      await request(
        '/api/comments',
        'POST',
        { postId: post.id, body: 'Stara sesija' },
        reader.cookie,
      )
    ).r.status,
    401,
  );
  assert.notEqual(
    (await request('/api/auth/sign-in/email', 'POST', { email: reader.email, password })).r.status,
    200,
  );
  const newLogin = await request('/api/auth/sign-in/email', 'POST', {
    email: reader.email,
    password: nextPassword,
  });
  assert.equal(newLogin.r.status, 200);
  reader.cookie = newLogin.r.headers
    .getSetCookie()
    .map((x) => x.split(';')[0])
    .join('; ');
  ok('Recovery token delivered, consumed once, old password rejected and prior sessions revoked');
  assert.equal(
    (await request('/api/moderation', 'POST', { userId: other.id, suspended: true }, editor.cookie))
      .r.status,
    200,
  );
  assert.equal(
    (
      await request(
        '/api/comments',
        'POST',
        { postId: post.id, body: 'Suspendovan nalog' },
        other.cookie,
      )
    ).r.status,
    401,
  );
  assert.notEqual(
    (await request('/api/auth/sign-in/email', 'POST', { email: other.email, password })).r.status,
    200,
  );
  assert.equal(
    (
      await request(
        '/api/moderation',
        'POST',
        { userId: other.id, suspended: false },
        editor.cookie,
      )
    ).r.status,
    200,
  );
  assert.equal(
    (await request('/api/auth/sign-in/email', 'POST', { email: other.email, password })).r.status,
    200,
  );
  ok('Suspension revokes sessions and prevents login; access can be restored');
  assert.equal(
    (await request(`/api/comments/${commentId}`, 'PATCH', { action: 'delete' }, reader.cookie)).r
      .status,
    200,
  );
  assert.equal(
    (await request(`/api/comments/${commentId}`, 'PATCH', { action: 'restore' }, editor.cookie)).r
      .status,
    409,
  );
  ok('Reader can delete their comment; editors cannot undo an author deletion');
  const closed = await request(
    `/api/posts/${post.id}`,
    'PUT',
    { version: post.version, content: { ...changed, commentsOpen: false } },
    editor.cookie,
  );
  assert.equal(closed.r.status, 200);
  const closePublish = await request(
    `/api/posts/${post.id}/publish`,
    'POST',
    { version: closed.data.version, slug: `provjera-premjestene-adrese-${stamp}`, slot: 'poem' },
    editor.cookie,
  );
  assert.equal(closePublish.r.status, 200);
  const oldSlug = post.slug;
  post = { ...post, version: closePublish.data.version, slug: closePublish.data.slug };
  assert.equal((await request(`/tekst/${oldSlug}`)).r.status, 308);
  assert.equal(
    (await request('/api/comments', 'POST', { postId: post.id, body: 'Zatvoreno' }, reader.cookie))
      .r.status,
    403,
  );
  ok('Slug change permanently redirects old route; published comment closure is enforced');

  await request(
    `/api/posts/${post.id}/unpublish`,
    'POST',
    { version: post.version },
    editor.cookie,
  );
  assert.equal((await request(`/tekst/${post.slug}`)).r.status, 404);
  assert.equal((await request(`/media/${media.id}`)).r.status, 404);
  ok('Unpublishing removes article and formerly public media without stale caches');
  await writeFile(
    'docs/verification/api-acceptance.json',
    JSON.stringify({ date: new Date().toISOString(), base, checks: evidence }, null, 2),
  );
} finally {
  await sql.end();
}
