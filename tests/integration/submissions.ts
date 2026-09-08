// Run only after acceptance.ts, against its disposable built local stack.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { db, sql } from '../../src/db';
import { submissions, user, limits, rateLimit } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
assert.equal(
  process.env.ZILET_DISPOSABLE_TEST,
  'true',
  'Set ZILET_DISPOSABLE_TEST=true only for an explicitly disposable local database.',
);
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const mail = process.env.MAILPIT_URL || 'http://localhost:8025';
async function call(path: string, method = 'GET', body?: unknown, cookie = '', origin = base) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(method !== 'GET' ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { r, data, text };
}
function cookie(r: Response) {
  return r.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
}
const account = JSON.parse(
  await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
);
const password = randomBytes(20).toString('hex');
const email = `submission-${Date.now()}@zilet.test`;
try {
  await db.delete(limits);
  await db.delete(rateLimit);
  const login = await call('/api/auth/sign-in/email', 'POST', account);
  assert.equal(login.r.status, 200);
  const editor = cookie(login.r);
  const signup = await call('/api/auth/sign-up/email', 'POST', {
    email,
    password,
    name: 'Čitalac za provjeru',
    callbackURL: base + '/nalog',
  });
  assert.equal(signup.r.status, 200);
  let msg;
  for (let i = 0; i < 15; i++) {
    const list = await (await fetch(mail + '/api/v1/messages')).json();
    msg = list.messages?.find((m: { To: { Address: string }[] }) =>
      m.To.some((t) => t.Address === email),
    );
    if (msg) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(msg);
  const content = await (await fetch(mail + '/api/v1/message/' + msg.ID)).json();
  await fetch(content.Text.match(/https?:\/\/[^\s]+\/api\/auth\/verify-email\?[^\s]+/)[0]);
  const readerLogin = await call('/api/auth/sign-in/email', 'POST', { email, password });
  assert.equal(readerLogin.r.status, 200);
  const reader = cookie(readerLogin.r);
  assert.equal((await call('/api/profile', 'PATCH', { name: 'Novo ime' }, reader)).r.status, 200);
  assert.equal(
    (await call('/api/profile', 'PATCH', { name: 'x', role: 'editor' }, reader)).r.status,
    400,
  );
  assert.equal(
    (await call('/api/profile', 'PATCH', { name: 'x' }, reader, 'https://foreign.test')).r.status,
    403,
  );
  assert.equal((await call('/api/profile', 'PATCH', { name: 'x' })).r.status, 401);
  assert.equal((await call('/')).text.includes('class="editor-entry"'), false);
  assert.equal(
    (await call('/', 'GET', undefined, reader)).text.includes('class="editor-entry"'),
    false,
  );
  assert.equal(
    (await call('/', 'GET', undefined, editor)).text.includes('class="editor-entry"'),
    true,
  );
  console.log('PASS Profile updates, privilege/origin guards and role-aware public header');
  async function submit(photos = 1, session = reader, origin = base) {
    const form = new FormData();
    form.set('title', 'Čitalačka pjesma za provjeru');
    form.set('text', '  Śutnja\n\nСоба и прозор\n\\ ~\u200b\n');
    form.set('rubric', 'poezija');
    form.set('consent', 'yes');
    form.set('alt', 'Soba sa prozorom');
    form.set('credit', 'Vilhelm Hammershøi · CC0');
    for (let i = 0; i < photos; i++)
      form.append(
        'photo',
        new Blob([await readFile('fixtures/strandgade.jpg')], { type: 'image/jpeg' }),
        'slika.jpg',
      );
    const r = await fetch(base + '/api/submissions', {
      method: 'POST',
      headers: { Origin: origin, Cookie: session },
      body: form,
    });
    return { r, data: await r.json() };
  }
  assert.equal((await submit(0, '')).r.status, 401);
  assert.equal((await submit(0, reader, 'https://foreign.test')).r.status, 403);
  assert.equal((await submit(2)).r.status, 400);
  const sent = await submit();
  assert.equal(sent.r.status, 201, JSON.stringify(sent.data));
  const [s] = await db.select().from(submissions).where(eq(submissions.id, sent.data.id));
  assert.equal(s.authorName, 'Novo ime');
  assert.equal(s.screening, 'manual');
  assert.ok(s.mediaId);
  assert.equal((await call('/media/' + s.mediaId)).r.status, 404);
  assert.equal((await call('/media/' + s.mediaId, 'GET', undefined, reader)).r.status, 404);
  assert.equal((await call('/media/' + s.mediaId, 'GET', undefined, editor)).r.status, 200);
  assert.equal((await call('/api/media/' + s.mediaId, 'DELETE', undefined, editor)).r.status, 409);
  assert.equal(
    (
      await call(
        '/api/submissions/' + s.id,
        'PATCH',
        { action: 'accept', version: 1, note: 'Bilješka' },
        reader,
      )
    ).r.status,
    403,
  );
  assert.equal(
    (
      await call(
        '/api/submissions/' + s.id,
        'PATCH',
        { action: 'accept', version: 1, note: '' },
        editor,
      )
    ).r.status,
    400,
  );
  const accepted = await call(
    '/api/submissions/' + s.id,
    'PATCH',
    { action: 'accept', version: 1, note: 'Bilješka urednika o ovom radu.' },
    editor,
  );
  assert.equal(accepted.r.status, 200, accepted.text);
  assert.equal(
    (
      await call(
        '/api/submissions/' + s.id,
        'PATCH',
        { action: 'accept', version: 1, note: 'drugi pokušaj' },
        editor,
      )
    ).r.status,
    409,
  );
  const post = await call('/api/posts/' + accepted.data.postId, 'GET', undefined, editor);
  assert.equal(post.data.content.body.text, s.text);
  assert.deepEqual(post.data.content.rubrics, ['citaoci', 'poezija']);
  assert.equal((await call('/tekst/' + post.data.post.slug)).r.status, 404);
  const noNote = await call(
    '/api/posts/' + post.data.post.id,
    'PUT',
    { version: 1, content: { ...post.data.content, editorialNote: '' } },
    editor,
  );
  assert.equal(noNote.r.status, 200);
  assert.equal(
    (
      await call(
        '/api/posts/' + post.data.post.id + '/publish',
        'POST',
        { version: noNote.data.version },
        editor,
      )
    ).r.status,
    400,
  );
  const restored = await call(
    '/api/posts/' + post.data.post.id,
    'PUT',
    { version: noNote.data.version, content: post.data.content },
    editor,
  );
  assert.equal(restored.r.status, 200);
  const published = await call(
    '/api/posts/' + post.data.post.id + '/publish',
    'POST',
    { version: restored.data.version },
    editor,
  );
  assert.equal(published.r.status, 200, published.text);
  assert.ok((await call('/rubrika/citaoci')).text.includes(s.title));
  assert.equal((await call('/media/' + s.mediaId)).r.status, 200);
  assert.equal(
    (
      await call(
        '/api/posts/' + post.data.post.id,
        'DELETE',
        { version: published.data.version },
        editor,
      )
    ).r.status,
    409,
  );
  assert.equal(
    (await call('/api/submissions/' + s.id, 'DELETE', { version: 2 }, reader)).r.status,
    409,
  );
  const withdrawn = await call(
    '/api/posts/' + post.data.post.id + '/unpublish',
    'POST',
    { version: published.data.version },
    editor,
  );
  assert.equal(withdrawn.r.status, 200);
  assert.equal(
    (
      await call(
        '/api/posts/' + post.data.post.id,
        'DELETE',
        { version: withdrawn.data.version },
        editor,
      )
    ).r.status,
    200,
  );
  assert.equal(
    (await call('/api/submissions/' + s.id, 'DELETE', { version: 2 }, editor)).r.status,
    200,
  );
  assert.equal((await call('/media/' + s.mediaId, 'GET', undefined, editor)).r.status, 404);
  console.log(
    'PASS Single-photo bounds, private review, unavailable-AI fallback, duplicate acceptance conflict, signed publication and permanent cleanup',
  );
  const rejected = await submit(0);
  assert.equal(rejected.r.status, 201);
  assert.equal(
    (
      await call(
        '/api/submissions/' + rejected.data.id,
        'PATCH',
        { action: 'reject', version: 1, note: 'Hvala na prilogu.' },
        editor,
      )
    ).r.status,
    200,
  );
  assert.ok((await call('/posalji', 'GET', undefined, reader)).text.includes('Hvala na prilogu.'));
  assert.equal(
    (await call('/api/submissions/' + rejected.data.id, 'DELETE', { version: 1 }, reader)).r.status,
    409,
  );
  assert.equal(
    (await call('/api/submissions/' + rejected.data.id, 'DELETE', { version: 2 }, reader)).r.status,
    200,
  );
  console.log(
    'PASS Reader sees editorial reply and can remove their rejected submission with version guard',
  );
  await writeFile(
    `/tmp/zilet-reader-account-${new URL(base).port || '80'}.json`,
    JSON.stringify({ email, password }),
    {
      mode: 0o600,
    },
  );
} finally {
  await sql.end();
}
