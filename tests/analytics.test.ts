import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analytics } from '../src/lib/analytics';
import { analyticsReferrer, publicAnalyticsPath } from '../src/lib/analytics-privacy';

const analyticsEnv = ['UMAMI_URL', 'UMAMI_WEBSITE_ID', 'UMAMI_USERNAME', 'UMAMI_PASSWORD'] as const;

function restoreEnvironment(values: Record<(typeof analyticsEnv)[number], string | undefined>) {
  for (const key of analyticsEnv) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

test('decodes Umami expanded metrics and derives an honest page-duration estimate', async () => {
  const previousEnvironment = Object.fromEntries(
    analyticsEnv.map((key) => [key, process.env[key]]),
  ) as Record<(typeof analyticsEnv)[number], string | undefined>;
  const previousFetch = globalThis.fetch;
  Object.assign(process.env, {
    UMAMI_URL: 'http://analytics.test',
    UMAMI_WEBSITE_ID: 'website-id',
    UMAMI_USERNAME: 'reader',
    UMAMI_PASSWORD: 'secret',
  });
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(new URL(url));
    if (url.endsWith('/api/auth/login')) return Response.json({ token: 'token' });
    if (url.includes('/stats?'))
      return Response.json({
        pageviews: '8',
        visitors: 5,
        visits: 6,
        bounces: 2,
        totaltime: '180',
      });
    if (url.includes('type=path'))
      return Response.json([
        {
          name: '/',
          pageviews: '3',
          visitors: 2,
          visits: 2,
          bounces: 1,
          totaltime: '44',
        },
      ]);
    if (url.includes('type=referrer'))
      return Response.json([{ name: 'example.net', pageviews: 2, bounces: 1, totaltime: '30' }]);
    if (url.includes('type=country')) return Response.json([{ name: 'ME', pageviews: '4' }]);
    if (url.includes('type=device')) return Response.json([{ name: 'mobile', pageviews: 5 }]);
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await analytics(7);
    assert.equal(result.available, true);
    if (!result.available) return;
    assert.equal(result.averagePageSeconds, 30);
    assert.deepEqual(result.sources, [{ name: 'example.net', views: 2, averagePageSeconds: 30 }]);
    assert.deepEqual(result.countries, [{ name: 'ME', views: 4 }]);
    assert.deepEqual(result.devices, [{ name: 'mobile', views: 5 }]);
    assert.deepEqual(result.popular, []);
    assert.deepEqual(result.previous, { pageviews: 8, visitors: 5, visits: 6 });
    const articleQuery = requests.find((url) => url.searchParams.get('type') === 'path');
    assert.equal(articleQuery?.searchParams.get('search'), '/tekst/');
    assert.equal(articleQuery?.searchParams.get('limit'), '10');
    const periods = requests.filter((url) => url.pathname.endsWith('/stats'));
    assert.equal(periods.length, 2);
    assert.equal(
      Number(periods[0].searchParams.get('startAt')) - 1,
      Number(periods[1].searchParams.get('endAt')),
    );
    assert.equal(
      Number(periods[0].searchParams.get('endAt')) - Number(periods[1].searchParams.get('startAt')),
      14 * 86400000,
    );
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnvironment(previousEnvironment);
  }
});

test('keeps the unavailable state when required analytics settings are absent', async () => {
  const previousEnvironment = Object.fromEntries(
    analyticsEnv.map((key) => [key, process.env[key]]),
  ) as Record<(typeof analyticsEnv)[number], string | undefined>;
  for (const key of analyticsEnv) delete process.env[key];
  try {
    const result = await analytics(7);
    assert.deepEqual(result, {
      available: false,
      message:
        'Statistika još nije povezana. Kada bude podešena, ovdje ćete vidjeti stvarne podatke o posjetama.',
    });
  } finally {
    restoreEnvironment(previousEnvironment);
  }
});

test('analytics referrers retain only external HTTP origins and paths exclude private data', () => {
  assert.equal(
    analyticsReferrer(
      'https://example.net/private?email=reader@example.net#name',
      'https://zilet.me',
    ),
    'https://example.net',
  );
  assert.equal(
    analyticsReferrer('https://user:password@example.net/path', 'https://zilet.me'),
    'https://example.net',
  );
  for (const referrer of [
    'https://zilet.me/tekst/pjesma',
    'data:text/html,secret',
    'file:///secret',
    'javascript:alert(1)',
    'null',
    'invalid',
  ]) {
    assert.equal(analyticsReferrer(referrer, 'https://zilet.me'), '');
  }
  for (const pathname of [
    '/',
    '/tekst/pjesma',
    '/rubrika/poezija',
    '/autor/herman-hese',
    '/autori',
    '/o-casopisu',
  ])
    assert.equal(publicAnalyticsPath.test(pathname), true);
  for (const pathname of [
    '/redakcija',
    '/redakcija/tekst/123',
    '/nalog',
    '/prilog/secret',
    '/pretraga?q=name',
    '/tekst/pjesma?email=private',
    '/tekst/pjesma#private',
  ])
    assert.equal(publicAnalyticsPath.test(pathname), false);
});

test('failure of the optional comparison preserves current metrics, malformed counts do not become zero', async () => {
  const previousEnvironment = Object.fromEntries(
    analyticsEnv.map((key) => [key, process.env[key]]),
  ) as Record<(typeof analyticsEnv)[number], string | undefined>;
  const previousFetch = globalThis.fetch;
  Object.assign(process.env, {
    UMAMI_URL: 'http://analytics.test',
    UMAMI_WEBSITE_ID: 'website-id',
    UMAMI_USERNAME: 'reader',
    UMAMI_PASSWORD: 'secret',
  });
  let malformed = false;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/api/auth/login')) return Response.json({ token: 'token' });
    if (url.pathname.endsWith('/stats')) {
      if (!url.searchParams.has('limit')) return new Response(null, { status: 503 });
      return Response.json({
        pageviews: malformed ? -1 : 0,
        visitors: 0,
        visits: 0,
        bounces: 0,
        totaltime: 0,
      });
    }
    return Response.json([]);
  };
  try {
    const result = await analytics(30);
    assert.equal(result.available, true);
    if (result.available) {
      assert.equal(result.previous, undefined);
      assert.equal(result.pageviews, 0);
      assert.equal(result.averagePageSeconds, undefined);
    }
    malformed = true;
    assert.equal((await analytics(30)).available, false);
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnvironment(previousEnvironment);
  }
});
