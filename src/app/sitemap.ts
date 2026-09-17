import { siteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { posts, revisions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rubrics } from '@/lib/content';
import { getAuthors } from '@/lib/data';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const published = await db
    .select({ slug: posts.slug, date: posts.publishedUpdatedAt })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(eq(posts.status, 'published'));
  const names = await getAuthors();
  return [
    { url: base },
    { url: `${base}/o-casopisu` },
    { url: `${base}/autori` },
    { url: `${base}/pravila` },
    { url: `${base}/rubrika/umjetnost` },
    ...rubrics.filter(([s]) => s !== 'price').map(([s]) => ({ url: `${base}/rubrika/${s}` })),
    ...names.map((a) => ({ url: `${base}/autor/${a.slug}` })),
    ...published.map((p) => ({
      url: `${base}/tekst/${p.slug}`,
      lastModified: p.date || undefined,
    })),
  ];
}
