import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { rubrics, rubricLabel } from '@/lib/content';
import { findPosts } from '@/lib/data';
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
  const slug = requested === 'price' ? 'proza' : requested;
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page)) || 1));
  const title = slug === 'umjetnost' ? 'Umjetnost' : rubricLabel(slug);
  return {
    title: page > 1 ? `${title} — stranica ${page}` : title,
    description: `${title} u Žiletu. Čitajte objavljene radove i otkrijte autore.`,
    alternates: { canonical: `/rubrika/${slug}${page > 1 ? `?page=${page}` : ''}` },
    ...(q.sort === 'oldest' ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  if (slug === 'price') permanentRedirect('/rubrika/proza');
  if (slug !== 'umjetnost' && !rubrics.some(([s]) => s === slug)) notFound();
  const q = await searchParams;
  const result = await findPosts({ rubric: slug, page: Number(q.page) || 1, sort: q.sort });
  if (result.page > 1 && !result.items.length) notFound();
  return (
    <div className="wrap archive-page">
      <header className="archive-heading rubric-heading">
        <InkLines className="rubric-lines" />
        <span className="eyebrow">Rubrike / Žilet</span>
        <h1>{slug === 'umjetnost' ? 'Umjetnost' : rubricLabel(slug)}</h1>
        {slug === 'citaoci' && (
          <div className="reader-invitation">
            <p>Vaše riječi, naše stranice.</p>
            <Link className="button secondary submission-link" href="/posalji">
              Pošaljite rad <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
        {slug === 'umjetnost' && (
          <div className="subrubrics">
            {['slikarstvo', 'muzika', 'film'].map((s) => (
              <Link key={s} href={`/rubrika/${s}`}>
                {rubricLabel(s)} ↗
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
        <button type="submit">Prikaži →</button>
      </form>
      {result.items.length ? (
        <ArchiveList items={result.items} />
      ) : (
        <section className="empty">
          <h2>Ova stranica čeka prve tekstove.</h2>
          <p>Do tada, pogledajte ostale rubrike.</p>
          <Link href="/">Povratak na početnu ↗</Link>
        </section>
      )}
      <Pagination {...result} path={`/rubrika/${slug}`} query={{ sort: q.sort || 'newest' }} />
    </div>
  );
}
