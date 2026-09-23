import { db } from '@/db';
import { media, posts, revisions, authors } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireUser, HttpError } from './security';

// A picture is public only while a live revision or an approved published author uses it.
// Editors may see every picture; everyone else gets the same 404 as for a missing one.
export async function servableMedia(id: string, headers: Headers) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(404, 'Slika nije pronađena.');
  const [m] = await db.select().from(media).where(eq(media.id, id));
  if (!m) throw new HttpError(404, 'Slika nije pronađena.');
  const published = await db
    .select({ id: posts.id })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(
      and(
        eq(posts.status, 'published'),
        sql`${revisions.content}->'media' @> ${JSON.stringify([{ id }])}::jsonb`,
      ),
    )
    .limit(1);
  const portrait = published.length
    ? []
    : await db
        .select({ id: authors.id })
        .from(authors)
        .where(
          and(
            eq(authors.portraitId, id),
            sql`(${authors.isEditor} or exists (select 1 from ${posts} inner join ${revisions} on ${posts.publishedRevisionId} = ${revisions.id} where ${posts.status} = 'published' and ${revisions.content}->>'authorId' = ${authors.id}))`,
          ),
        )
        .limit(1);
  if (!published.length && !portrait.length) {
    try {
      await requireUser(headers, 'editor');
    } catch {
      throw new HttpError(404, 'Slika nije pronađena.');
    }
  }
  return m;
}
