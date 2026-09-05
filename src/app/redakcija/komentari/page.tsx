import { editorSession } from '@/lib/editor-session';
import Link from 'next/link';
import { db } from '@/db';
import { comments, user, posts, revisions } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { dateLabel } from '@/lib/content';
import { ModerationControls } from '@/components/moderation-controls';
import { Pagination } from '@/components/archive';
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await editorSession();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1));
  const items = await db
    .select({
      comment: comments,
      name: user.name,
      suspended: user.suspended,
      slug: posts.slug,
      title: sql<string>`${revisions.content}->>'title'`,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .innerJoin(posts, eq(comments.postId, posts.id))
    .leftJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .orderBy(desc(comments.createdAt))
    .limit(20)
    .offset((page - 1) * 20);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(comments);
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Razgovor uz djelo</span>
          <h1>Komentari</h1>
        </div>
      </div>
      {!items.length && (
        <section className="desk-empty">
          <h2>Još nema komentara.</h2>
          <p>Ovdje ćete moći da pročitate komentare, uklonite ih i vratite ako pogriješite.</p>
        </section>
      )}
      {items.map(({ comment: c, ...v }) => (
        <article className="moderation-entry" key={c.id}>
          <Link className="eyebrow" href={`/tekst/${v.slug}#komentari`}>
            {v.title || 'Povučen tekst'} ↗
          </Link>
          <header>
            <strong>{v.name}</strong>
            <time>{dateLabel(c.createdAt)}</time>
            <span className="status">
              {c.status === 'visible'
                ? 'Vidljiv'
                : c.status === 'removed'
                  ? 'Uklonjen'
                  : c.status === 'pending'
                    ? 'Čeka objavu'
                    : 'Autor je izbrisao'}
            </span>
          </header>
          <p>{c.status === 'deleted' ? 'Sadržaj je izbrisao autor.' : c.body}</p>
          <ModerationControls
            id={c.id}
            status={c.status}
            userId={c.userId}
            suspended={v.suspended}
          />
        </article>
      ))}
      <Pagination total={total} page={page} limit={20} path="/redakcija/komentari" />
    </>
  );
}
