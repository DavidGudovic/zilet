import { db } from '@/db';
import { posts, revisions } from '@/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

type Metric = { name: string; views: number; averagePageSeconds?: number };

export type Analytics =
  | { available: false; message: string }
  | {
      available: true;
      pageviews: number;
      visitors: number;
      visits: number;
      averagePageSeconds?: number;
      previous?: { pageviews: number; visitors: number; visits: number };
      updatedAt: string;
      popular: (Metric & { href: string })[];
      sources: Metric[];
      countries: Metric[];
      devices: Metric[];
    };

const unavailable = {
  available: false as const,
  message:
    'Statistika još nije povezana. Kada bude podešena, ovdje ćete vidjeti stvarne podatke o posjetama.',
};

function number(value: unknown) {
  const candidate =
    typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
  if (
    typeof candidate !== 'number' &&
    (typeof candidate !== 'string' || candidate.trim().length === 0)
  )
    return undefined;
  const result = Number(candidate);
  return Number.isFinite(result) && result >= 0 ? result : undefined;
}

function metrics(value: unknown, emptyName: string): Metric[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value.map((row) => {
    if (!row || typeof row !== 'object') return undefined;
    const metric = row as Record<string, unknown>;
    const views = number(metric.pageviews ?? metric.views ?? metric.value ?? metric.y);
    if (views === undefined) return undefined;
    const name = metric.name ?? metric.x;
    const bounces = number(metric.bounces);
    const totalTime = number(metric.totaltime);
    return {
      name: typeof name === 'string' && name ? name : emptyName,
      views,
      ...(bounces !== undefined && totalTime !== undefined && views > bounces
        ? { averagePageSeconds: totalTime / (views - bounces) }
        : {}),
    };
  });
  return rows.filter((row): row is Metric => Boolean(row));
}

export async function analytics(days: number): Promise<Analytics> {
  const { UMAMI_URL, UMAMI_WEBSITE_ID, UMAMI_USERNAME, UMAMI_PASSWORD } = process.env;
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID || !UMAMI_USERNAME || !UMAMI_PASSWORD) return unavailable;

  try {
    const base = UMAMI_URL.replace(/\/$/, '');
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    if (!login.ok) throw new Error('auth');
    const token = ((await login.json()) as { token?: unknown }).token;
    if (typeof token !== 'string' || !token) throw new Error('token');

    const endAt = Date.now();
    const period = (days === 30 ? 30 : 7) * 86400000;
    const startAt = endAt - period;
    const params = new URLSearchParams({
      startAt: String(startAt),
      endAt: String(endAt),
      limit: '10',
    });
    const get = async (path: string) => {
      const response = await fetch(`${base}/api/websites/${UMAMI_WEBSITE_ID}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error('service');
      return response.json() as Promise<unknown>;
    };
    const previousParams = new URLSearchParams({
      startAt: String(startAt - period),
      endAt: String(startAt - 1),
    });
    const [stats, paths, sources, countries, devices, previousStats] = await Promise.all([
      get(`stats?${params}`),
      get(`metrics/expanded?${params}&type=path&search=%2Ftekst%2F`),
      get(`metrics/expanded?${params}&type=referrer`),
      get(`metrics/expanded?${params}&type=country`),
      get(`metrics/expanded?${params}&type=device`),
      get(`stats?${previousParams}`).catch(() => undefined),
    ]);
    if (!stats || typeof stats !== 'object') throw new Error('stats');
    const summary = stats as Record<string, unknown>;
    const pageviews = number(summary.pageviews);
    const visitors = number(summary.visitors);
    const visits = number(summary.visits);
    const bounces = number(summary.bounces);
    const totalTime = number(summary.totaltime);
    const pathMetrics = metrics(paths, 'Nepoznata stranica');
    const sourceMetrics = metrics(sources, 'Direktna posjeta');
    const countryMetrics = metrics(countries, 'Nepoznata zemlja');
    const deviceMetrics = metrics(devices, 'Drugi uređaj');
    if (
      pageviews === undefined ||
      visitors === undefined ||
      visits === undefined ||
      bounces === undefined ||
      totalTime === undefined ||
      !pathMetrics ||
      !sourceMetrics ||
      !countryMetrics ||
      !deviceMetrics
    )
      throw new Error('shape');

    const articlePaths = pathMetrics.filter((row) => /^\/tekst\/[a-z0-9-]+$/.test(row.name));
    // Only the live title is needed here; avoid loading each article's full body,
    // authors, account credits and media for the dashboard.
    const titleRows = articlePaths.length
      ? await db
          .select({ slug: posts.slug, title: sql<string>`${revisions.content}->>'title'` })
          .from(posts)
          .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
          .where(
            and(
              eq(posts.status, 'published'),
              inArray(
                posts.slug,
                articlePaths.map((row) => row.name.slice(7)),
              ),
            ),
          )
      : [];
    const titles = new Map(titleRows.map((row) => [`/tekst/${row.slug}`, row.title]));
    const prior =
      previousStats && typeof previousStats === 'object'
        ? (previousStats as Record<string, unknown>)
        : {};
    const previousPageviews = number(prior.pageviews);
    const previousVisitors = number(prior.visitors);
    const previousVisits = number(prior.visits);

    return {
      available: true,
      pageviews,
      visitors,
      visits,
      updatedAt: new Date(endAt).toISOString(),
      ...(previousPageviews !== undefined &&
      previousVisitors !== undefined &&
      previousVisits !== undefined
        ? {
            previous: {
              pageviews: previousPageviews,
              visitors: previousVisitors,
              visits: previousVisits,
            },
          }
        : {}),
      averagePageSeconds: pageviews > bounces ? totalTime / (pageviews - bounces) : undefined,
      popular: articlePaths
        .map((row) => ({ ...row, href: row.name, name: titles.get(row.name) || row.name }))
        .sort((a, b) => b.views - a.views),
      sources: sourceMetrics,
      countries: countryMetrics,
      devices: deviceMetrics,
    };
  } catch {
    return {
      available: false,
      message:
        'Podaci trenutno nijesu dostupni. Čitanje i objavljivanje rade nezavisno od statistike. Pokušajte kasnije.',
    };
  }
}
