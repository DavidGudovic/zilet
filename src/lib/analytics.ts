import { getPost } from './data';
export type Analytics =
  | { available: false; message: string }
  | {
      available: true;
      pageviews: number;
      visitors: number;
      popular: { title: string; views: number }[];
      sources: { name: string; views: number }[];
    };
export async function analytics(days: number): Promise<Analytics> {
  const { UMAMI_URL, UMAMI_WEBSITE_ID, UMAMI_USERNAME, UMAMI_PASSWORD } = process.env;
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID || !UMAMI_USERNAME || !UMAMI_PASSWORD)
    return {
      available: false,
      message:
        'Statistika još nije povezana. Kada bude podešena, ovdje ćete vidjeti stvarne podatke o posjetama.',
    };
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
    const { token } = await login.json();
    const params = new URLSearchParams({
      startAt: String(Date.now() - days * 86400000),
      endAt: String(Date.now()),
    });
    const get = async (path: string) => {
      const r = await fetch(`${base}/api/websites/${UMAMI_WEBSITE_ID}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) throw new Error('service');
      return r.json();
    };
    const [stats, urls, sources] = await Promise.all([
      get(`stats?${params}`),
      get(`metrics/expanded?${params}&type=path&limit=10`),
      get(`metrics/expanded?${params}&type=referrer&limit=10`),
    ]);
    const number = (v: unknown) =>
      typeof v === 'number'
        ? v
        : typeof v === 'object' && v !== null && 'value' in v
          ? Number(v.value)
          : NaN;
    const pageviews = number(stats.pageviews),
      visitors = number(stats.visitors);
    if (
      !Number.isFinite(pageviews) ||
      !Number.isFinite(visitors) ||
      !Array.isArray(urls) ||
      !Array.isArray(sources)
    )
      throw new Error('shape');
    const titles = new Map(
      await Promise.all(
        urls
          .filter((r: { name: string }) => r.name.startsWith('/tekst/'))
          .map(
            async (r: { name: string }) =>
              [r.name, (await getPost(r.name.slice(7)))?.title] as const,
          ),
      ),
    );
    return {
      available: true,
      pageviews,
      visitors,
      popular: urls
        .filter((r: { name: string }) => r.name.startsWith('/tekst/'))
        .map((r: { name: string; pageviews: number }) => ({
          title: titles.get(r.name) || r.name,
          views: r.pageviews,
        }))
        .sort((a: { views: number }, b: { views: number }) => b.views - a.views),
      sources: sources.map((r: { name: string; pageviews: number }) => ({
        name: r.name || 'Direktna posjeta',
        views: r.pageviews,
      })),
    };
  } catch {
    return {
      available: false,
      message:
        'Podaci trenutno nijesu dostupni. Čitanje i objavljivanje rade nezavisno od statistike. Pokušajte kasnije.',
    };
  }
}
