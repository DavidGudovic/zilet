// Exercise the real title query with a disposable database and a simulated Umami response.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sql } from '../../src/db';
import { analytics } from '../../src/lib/analytics';

assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname));
const id = randomUUID();
const published = `analytics-live-${id}`;
const withdrawn = `analytics-withdrawn-${id}`;
const missing = `analytics-removed-${id}`;
const previousFetch = globalThis.fetch;
const previousDebug = sql.options.debug;
const keys = ['UMAMI_URL', 'UMAMI_WEBSITE_ID', 'UMAMI_USERNAME', 'UMAMI_PASSWORD'] as const;
const previousEnvironment = keys.map((key) => [key, process.env[key]] as const);
let titleQueries = 0;
let comparisonUnavailable = false;
try {
  const [editor] = await sql`SELECT id FROM "user" WHERE role IN ('editor', 'maintainer') LIMIT 1`;
  const [author] = await sql`SELECT id FROM authors LIMIT 1`;
  assert.ok(editor && author, 'Run acceptance.ts first to create disposable fixtures');
  const content = (title: string) =>
    JSON.stringify({
      title,
      intro: '',
      editorialNote: '',
      authorId: author.id,
      type: 'poem',
      body: { kind: 'poem', text: 'Probni stih.', emphasis: [], align: 'left' },
      rubrics: ['poezija'],
      media: [],
      commentsOpen: false,
    });
  await sql.begin(async (tx) => {
    await tx`INSERT INTO posts(id,slug,status,created_by) VALUES (${published},${published},'published',${editor.id}),(${withdrawn},${withdrawn},'unpublished',${editor.id})`;
    await tx`INSERT INTO revisions(id,post_id,content,created_by) VALUES
      (${published + '-live'},${published},${content('Objavljeni naslov za statistiku')}::jsonb,${editor.id}),
      (${published + '-draft'},${published},${content('PRIVATNI NESNIMLJENI NASLOV')}::jsonb,${editor.id}),
      (${withdrawn + '-live'},${withdrawn},${content('POVUČENI NASLOV')}::jsonb,${editor.id})`;
    await tx`UPDATE posts SET published_revision_id=${published + '-live'},draft_revision_id=${published + '-draft'} WHERE id=${published}`;
    await tx`UPDATE posts SET published_revision_id=${withdrawn + '-live'},draft_revision_id=${withdrawn + '-live'} WHERE id=${withdrawn}`;
  });
  Object.assign(process.env, {
    UMAMI_URL: 'http://umami.fixture.test',
    UMAMI_WEBSITE_ID: 'fixture',
    UMAMI_USERNAME: 'fixture',
    UMAMI_PASSWORD: 'fixture',
  });
  sql.options.debug = (_connection, query) => {
    if (query.startsWith('select') && query.includes('"posts"')) titleQueries++;
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, 'umami.fixture.test', 'No external analytics requests');
    if (url.pathname.endsWith('/auth/login')) return Response.json({ token: 'fixture-token' });
    if (url.pathname.endsWith('/stats')) {
      if (!url.searchParams.has('limit'))
        return comparisonUnavailable
          ? new Response(null, { status: 503 })
          : Response.json({ pageviews: 4, visitors: 0, visits: 3 });
      return Response.json({ pageviews: 20, visitors: 6, visits: 8, bounces: 5, totaltime: 450 });
    }
    if (url.searchParams.get('type') === 'path') {
      assert.equal(url.searchParams.get('search'), '/tekst/');
      return Response.json([
        { name: '/tekst/' + withdrawn, pageviews: 2 },
        { name: '/tekst/' + published, pageviews: 12, bounces: 2, totaltime: 200 },
        { name: '/tekst/' + missing, pageviews: 1 },
      ]);
    }
    if (url.searchParams.get('type') === 'referrer')
      return Response.json([{ name: '', pageviews: 20 }]);
    if (url.searchParams.get('type') === 'country')
      return Response.json([{ name: 'ME', pageviews: 20 }]);
    if (url.searchParams.get('type') === 'device')
      return Response.json([{ name: 'mobile', pageviews: 20 }]);
    throw new Error('Unexpected fixture request');
  };
  const data = await analytics(7);
  if (!data.available) throw new Error(data.message);
  assert.equal(titleQueries, 1, 'All titles are fetched in one query');
  assert.deepEqual(data.previous, { pageviews: 4, visitors: 0, visits: 3 });
  assert.equal(data.averagePageSeconds, 30);
  assert.deepEqual(data.popular, [
    {
      name: 'Objavljeni naslov za statistiku',
      href: '/tekst/' + published,
      views: 12,
      averagePageSeconds: 20,
    },
    { name: '/tekst/' + withdrawn, href: '/tekst/' + withdrawn, views: 2 },
    { name: '/tekst/' + missing, href: '/tekst/' + missing, views: 1 },
  ]);
  assert.ok(!JSON.stringify(data).includes('PRIVATNI'));
  assert.ok(!JSON.stringify(data).includes('POVUČENI'));
  comparisonUnavailable = true;
  const partial = await analytics(30);
  assert.equal(partial.available, true);
  if (partial.available) {
    assert.equal(partial.previous, undefined);
    assert.deepEqual(partial.popular, data.popular);
  }
  assert.equal(titleQueries, 2);
  console.log(
    'PASS Analytics hydrates published titles in one SQL query, hides draft/withdrawn titles, retains historical paths, decodes comparisons and preserves current data if comparison fails.',
  );
} finally {
  globalThis.fetch = previousFetch;
  sql.options.debug = previousDebug;
  for (const [key, value] of previousEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await sql`DELETE FROM posts WHERE id IN (${published},${withdrawn})`;
  await sql.end();
}
