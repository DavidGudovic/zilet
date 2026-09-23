import { articleMetadata, articleStructuredData, breadcrumbData } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import type { Metadata } from 'next';
import { Comments } from '@/components/comments';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPost, getRedirect, moreByAuthor } from '@/lib/data';
import { Article } from '@/components/article';
import { rubricLabel } from '@/lib/content';
import { Link } from '@/components/link';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return { title: 'Tekst nije pronađen', robots: { index: false } };
  return articleMetadata(p);
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) {
    const moved = await getRedirect(slug);
    if (moved) permanentRedirect(`/tekst/${moved}`);
    notFound();
  }
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page)) || 1));
  const more = await moreByAuthor(p.author.id, p.id);
  const crumbs = [
    { name: 'Žilet', path: '/' },
    { name: rubricLabel(p.rubrics[0]), path: `/rubrika/${p.rubrics[0]}` },
    { name: p.title, path: `/tekst/${p.slug}` },
  ];
  return (
    <>
      <StructuredData value={articleStructuredData(p)} />
      <StructuredData value={breadcrumbData(crumbs)} />
      <Article post={p}>
        {more.length > 0 && (
          <section className="related-reading" aria-labelledby="related-heading">
            <h2 id="related-heading">Još od autora</h2>
            <ul>
              {more.map((item) => (
                <li key={item.id}>
                  <Link href={`/tekst/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Comments post={p} page={page} />
      </Article>
    </>
  );
}
