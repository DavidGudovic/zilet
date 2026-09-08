import { notFound } from 'next/navigation';
import { getAuthors, findPosts, getPortrait } from '@/lib/data';
import { ArchiveList, Pagination } from '@/components/archive';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  return { title: (await getAuthors()).find((a) => a.slug === slug)?.name || 'Autor' };
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
