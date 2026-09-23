import { siteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { posts, revisions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rubrics } from '@/lib/content';
import { getAuthors, publishedRubrics } from '@/lib/data';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const published = await db
    .select({ slug: posts.slug, date: posts.publishedUpdatedAt, publishedAt: posts.publishedAt })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(eq(posts.status, 'published'));
  const names = await getAuthors();
  const used = await publishedRubrics();
  return [
    { url: base },
    { url: `${base}/o-casopisu` },
    { url: `${base}/autori` },
    { url: `${base}/pravila` },
    ...['umjetnost', ...rubrics.map(([s]) => s)]
      .filter((s) => used.has(s))
      .map((s) => ({ url: `${base}/rubrika/${s}` })),
    ...names.map((a) => ({ url: `${base}/autor/${a.slug}` })),
    ...published.map((p) => ({
      url: `${base}/tekst/${p.slug}`,
      lastModified: p.date || p.publishedAt || undefined,
    })),
  ];
}
