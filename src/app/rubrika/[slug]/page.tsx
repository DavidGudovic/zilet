import { notFound, permanentRedirect } from 'next/navigation';
import {
  pageMetadata,
  rubricTitle,
  rubricSeoTitle,
  rubricDescriptions,
  breadcrumbData,
} from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { Link } from '@/components/link';
import { rubrics, rubricLabel } from '@/lib/content';
import { findPosts, publishedRubrics } from '@/lib/data';
import { Arrow } from '@/components/arrow';
import { InkLines } from '@/components/ink-lines';
import { ArchiveList, Pagination } from '@/components/archive';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug: requested } = await params;
  const slug =
    requested === 'price' ? 'proza' : requested === 'knjizevna-kritika' ? 'eseji' : requested;
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page)) || 1));
  const title = rubricSeoTitle(slug);
  const query = new URLSearchParams(q.sort === 'oldest' ? { sort: 'oldest' } : {});
  if (page > 1) query.set('page', String(page));
  const metadata = pageMetadata(
    page > 1 ? `${title} | stranica ${page}` : title,
    rubricDescriptions[slug] || `${title} u Žiletu.`,
    `/rubrika/${slug}${query.size ? `?${query}` : ''}`,
  );
  // Oldest-first lists and empty rubrics stay out of the index. Their canonical is the page
  // itself: the newest-first URL would name a page with different content.
  if (q.sort === 'oldest' || !(await publishedRubrics()).has(slug))
    metadata.robots = { index: false, follow: true };
  return metadata;
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  if (slug === 'knjizevna-kritika') permanentRedirect('/rubrika/eseji');
  if (slug === 'price') permanentRedirect('/rubrika/proza');
  if (slug !== 'umjetnost' && !rubrics.some(([s]) => s === slug)) notFound();
  const q = await searchParams;
  const result = await findPosts({ rubric: slug, page: Number(q.page) || 1, sort: q.sort });
  if (result.page > 1 && !result.items.length) notFound();
  return (
    <div className="wrap archive-page">
      <StructuredData
        value={breadcrumbData([
          { name: 'Žilet', path: '/' },
          { name: rubricTitle(slug), path: `/rubrika/${slug}` },
        ])}
      />
      <header className="archive-heading rubric-heading">
        <InkLines className="rubric-lines" />
        <span className="eyebrow">Rubrike / Žilet</span>
        <h1>{rubricTitle(slug)}</h1>
        <p className="archive-introduction">{rubricDescriptions[slug]}</p>
        {slug === 'citaoci' && (
          <div className="reader-invitation">
            <p>Vaše riječi, naše stranice.</p>
            <Link className="button secondary submission-link" href="/posalji">
              Pošaljite rad{' '}
              <span aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          </div>
        )}
        {slug === 'umjetnost' && (
          <div className="subrubrics">
            {['slikarstvo', 'muzika', 'film'].map((s) => (
              <Link key={s} href={`/rubrika/${s}`}>
                {rubricLabel(s)} <Arrow />
              </Link>
            ))}
          </div>
        )}
      </header>
      <form className="archive-filter">
        <span>
          {result.total} {result.total === 1 ? 'tekst' : 'tekstova'}
        </span>
        <label>
          Redosljed
          <select name="sort" defaultValue={q.sort || 'newest'}>
            <option value="newest">Najnovije prvo</option>
            <option value="oldest">Najstarije prvo</option>
          </select>
        </label>
        <button type="submit">
          Prikaži <Arrow to="right" />
        </button>
      </form>
      {result.items.length ? (
        <ArchiveList items={result.items} />
      ) : (
        <section className="empty">
          <h2>Ova stranica čeka prve tekstove.</h2>
          <p>Do tada, pogledajte ostale rubrike.</p>
          <Link href="/">
            Povratak na početnu <Arrow />
          </Link>
        </section>
      )}
      <Pagination
        {...result}
        path={`/rubrika/${slug}`}
        query={q.sort === 'oldest' ? { sort: 'oldest' } : {}}
      />
    </div>
  );
}
