import { notFound } from 'next/navigation';
import Link from 'next/link';
import { rubrics, rubricLabel } from '@/lib/content';
import { findPosts } from '@/lib/data';
import { InkLines } from '@/components/ink-lines';
import { ArchiveList, Pagination } from '@/components/archive';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: slug === 'umjetnost' ? 'Umjetnost' : rubricLabel(slug),
    alternates: { canonical: `/rubrika/${slug}` },
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
        {slug === 'umjetnost' && (
          <div className="subrubrics">
            {['slikarstvo', 'muzika', 'film'].map((s) => (
              <Link key={s} href={`/rubrika/${s}`}>
                {rubricLabel(s)} ↗
              </Link>
            ))}
          </div>
        )}
        {slug === 'proza' && <Link href="/rubrika/price">Priče ↗</Link>}
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
