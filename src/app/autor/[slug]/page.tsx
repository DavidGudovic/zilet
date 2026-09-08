import { notFound } from 'next/navigation';
import { getAuthors, findPosts, getPortrait } from '@/lib/data';
import { ArchiveList, Pagination } from '@/components/archive';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const author = (await getAuthors()).find((a) => a.slug === slug);
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page)) || 1));
  return {
    title: author ? `${author.name}${page > 1 ? ` — stranica ${page}` : ''}` : 'Autor',
    description: author
      ? (author.bio || `Objavljeni radovi autora ${author.name} u Žiletu.`).slice(0, 160)
      : undefined,
    alternates: { canonical: `/autor/${slug}${page > 1 ? `?page=${page}` : ''}` },
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const author = (await getAuthors()).find((a) => a.slug === slug);
  if (!author) notFound();
  const portrait = await getPortrait(author.portraitId);
  const q = await searchParams;
  const result = await findPosts({ author: author.id, page: Number(q.page) || 1 });
  if (result.page > 1 && !result.items.length) notFound();
  return (
    <div className="wrap archive-page">
      <header className="archive-heading">
        <span className="eyebrow">{author.isEditor ? 'Redakcija / O meni' : 'Autor'}</span>
        <h1>{author.name}</h1>
        {portrait && (
          <figure className="author-portrait">
            <img
              src={portrait.url}
              width={portrait.width}
              height={portrait.height}
              alt={portrait.alt}
            />
            <figcaption>{portrait.credit}</figcaption>
          </figure>
        )}
        {author.bio && (
          <div className="author-bio">
            {author.bio.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </header>
      <div className="section-rule">
        <span>Objavljeni radovi</span>
        <span>{result.total}</span>
      </div>
      <ArchiveList items={result.items} />
      {!result.total && <p className="empty">Još nema objavljenih radova.</p>}
      <Pagination {...result} path={`/autor/${slug}`} />
    </div>
  );
}
