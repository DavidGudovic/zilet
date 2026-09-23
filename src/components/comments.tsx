import { headers } from 'next/headers';
import { db } from '@/db';
import { comments, user } from '@/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { dateLabel, type PostView } from '@/lib/content';
import { isDemo } from '@/lib/data';
import { CommentForm, CommentDelete } from './comment-form';
import { Pagination } from './archive';
export async function Comments({ post, page = 1 }: { post: PostView; page?: number }) {
  const visible = and(eq(comments.postId, post.id), eq(comments.status, 'visible'));
  const [s, items, count] = await Promise.all([
    headers().then((h) => auth.api.getSession({ headers: h })),
    isDemo()
      ? []
      : db
          .select({
            id: comments.id,
            body: comments.body,
            userId: comments.userId,
            name: user.name,
            createdAt: comments.createdAt,
          })
          .from(comments)
          .innerJoin(user, eq(user.id, comments.userId))
          .where(visible)
          .orderBy(asc(comments.createdAt))
          .limit(20)
          .offset((page - 1) * 20),
    isDemo()
      ? 0
      : db
          .select({ count: sql<number>`count(*)::int` })
          .from(comments)
          .where(visible)
          .then(([row]) => row.count),
  ]);
  return (
    <section className="comments" id="komentari">
      <h2>
        Komentari <span className="comment-count">{count}</span>
      </h2>
      {!count && <p>Još nema komentara.</p>}
      {items.map((c) => (
        <article className="comment" key={c.id}>
          <header>
            <strong>{c.name}</strong>
            <time dateTime={c.createdAt.toISOString()}>{dateLabel(c.createdAt)}</time>
          </header>
          <p>{c.body}</p>
          {s?.user.id === c.userId && <CommentDelete id={c.id} />}
        </article>
      ))}
      <Pagination total={count} page={page} limit={20} path={`/tekst/${post.slug}`} query={{}} />
      <CommentForm
        postId={post.id}
        slug={post.slug}
        userId={s?.user.emailVerified ? s.user.id : undefined}
        open={post.commentsOpen && !isDemo()}
      />
    </section>
  );
}
