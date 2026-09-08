import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analytics } from '../src/lib/analytics';

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
  globalThis.fetch = async (input) => {
    const url = String(input);
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
