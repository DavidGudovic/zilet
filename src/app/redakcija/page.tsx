import { editorSession } from '@/lib/editor-session';
import Link from 'next/link';
import { db } from '@/db';
import { posts, revisions, user, authors } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { dateLabel } from '@/lib/content';
import { Pagination } from '@/components/archive';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const editor = await editorSession();
  const q = await searchParams;
  const status = ['draft', 'published', 'unpublished'].includes(q.status || '')
    ? q.status
    : undefined;
  const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  const query = (q.q || '').trim().slice(0, 200);
  const where = and(
    status ? eq(posts.status, status) : undefined,
    query
      ? sql`${revisions.content}->>'title' ilike ${'%' + query.replace(/[\\%_]/g, '\\$&') + '%'}`
      : undefined,
  );
  const list = await db
    .select({
      post: posts,
      content: revisions.content,
      postedBy: user.name,
      authorName: authors.name,
    })
    .from(posts)
    .leftJoin(revisions, eq(posts.draftRevisionId, revisions.id))
    .leftJoin(user, eq(posts.createdBy, user.id))
    .leftJoin(authors, sql`${revisions.content}->>'authorId' = ${authors.id}`)
    .where(where)
    .orderBy(desc(posts.updatedAt))
    .limit(20)
    .offset((page - 1) * 20);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(posts)
    .leftJoin(revisions, eq(posts.draftRevisionId, revisions.id))
    .where(where);
  return (
    <>
      <div className="desk-welcome">
        <p>Dobro došli, {editor.name}.</p>
        <Link href="/redakcija/pomoc">Kako da objavim tekst? ↗</Link>
      </div>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Vaša radna bilježnica</span>
          <h1>Tekstovi</h1>
        </div>
        <span>
          {total} {total === 1 ? 'tekst' : 'tekstova'}
        </span>
      </div>
      <form className="desk-search">
        <label>
          Pretraži tekstove
          <input
            data-next-step
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Naslov teksta"
            maxLength={200}
          />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button className="button secondary">Pronađi</button>
      </form>
      <nav className="desk-tabs" aria-label="Status teksta">
        {[
          ['', 'Svi tekstovi'],
          ['draft', 'Nacrti'],
          ['published', 'Objavljeni'],
          ['unpublished', 'Povučeni'],
        ].map(([s, l]) => (
          <Link
            key={s}
            href={`/redakcija?${new URLSearchParams({ status: s, q: query })}#radni-prostor`}
            aria-current={(status || '') === s ? 'page' : undefined}
          >
            {l}
          </Link>
        ))}
      </nav>
      {list.length ? (
        <div className="desk-list">
          {list.map(({ post: p, content: c, postedBy, authorName }) => (
            <Link key={p.id} href={`/redakcija/tekst/${p.id}`}>
              <div>
                <span className={`status status-${p.status}`}>
                  {p.status === 'published'
                    ? p.draftRevisionId !== p.publishedRevisionId
                      ? 'Objavljeno · nove izmjene'
                      : 'Objavljeno'
                    : p.status === 'draft'
                      ? 'Nacrt'
                      : 'Povučeno'}
                </span>
                <h2>{c?.title || 'Novi tekst'}</h2>
                <p className="desk-post-credit">
                  Autor djela: {authorName || '—'}
                  <br />
                  Objavu pripremio/la:{' '}
                  {p.createdBy === 'approved-content-import'
                    ? 'Redakcija Žileta'
                    : postedBy || 'Redakcija Žileta'}
                </p>
              </div>
              <span>
                {dateLabel(p.updatedAt)} <b aria-hidden="true">↗</b>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="desk-empty">
          <h2>Ovdje počinje sljedeći tekst.</h2>
          <p>Izaberite rubriku i napišite tekst. Sve se najprije čuva kao nacrt.</p>
          <Link className="button" href="/redakcija/novi">
            + Novi tekst
          </Link>
        </section>
      )}
      <Pagination
        page={page}
        total={total}
        limit={20}
        path="/redakcija"
        query={{ status: status || '', q: query }}
      />
    </>
  );
}
