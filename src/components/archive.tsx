import Link from 'next/link';
import { dateLabel, rubricLabel, bodyText, type PostView } from '@/lib/content';
export function ArchiveList({ items }: { items: PostView[] }) {
  return (
    <div className="archive-list">
      {items.map((p) => (
        <article key={p.id} className={`archive-entry ${p.type}`}>
          <div className="archive-meta">
            <span className="eyebrow">{rubricLabel(p.rubrics[0])}</span>
            <time dateTime={p.publishedAt}>{dateLabel(p.publishedAt)}</time>
          </div>
          <div>
            <h2>
              <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
            </h2>
            <p className="archive-byline">
              <Link href={`/autor/${p.author.slug}`}>{p.author.name}</Link>
            </p>
            {p.postedBy && (
              <p className="archive-posting-credit">Objavu pripremio/la: {p.postedBy}</p>
            )}
            <p className={p.type === 'poem' ? 'archive-verse' : 'archive-excerpt'}>
              {p.intro ||
                (p.type === 'poem'
                  ? bodyText(p.body).split('\n\n').slice(0, 2).join('\n\n')
                  : bodyText(p.body).slice(0, 210) + '…')}
            </p>
          </div>
          {p.media[0] && (
            <Link href={`/tekst/${p.slug}`} tabIndex={-1} aria-hidden="true">
              <img
                src={`${p.media[0].url}?size=small`}
                width={p.media[0].width}
                height={p.media[0].height}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
export function Pagination({
  page,
  total,
  limit,
  path,
  query = {},
}: {
  page: number;
  total: number;
  limit: number;
  path: string;
  query?: Record<string, string>;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const href = (n: number) => `${path}?${new URLSearchParams({ ...query, page: String(n) })}`;
  return (
    <nav className="pagination" aria-label="Stranice rezultata">
      {page > 1 ? <Link href={href(page - 1)}>← Prethodna</Link> : <span />}
      <span>
        Stranica {page} od {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)}>Sljedeća →</Link> : <span />}
    </nav>
  );
}
