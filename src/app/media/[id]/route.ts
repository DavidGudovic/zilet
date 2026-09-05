import { db } from '@/db';
import { media, posts, revisions, authors } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireUser, failure, HttpError } from '@/lib/security';
import { readMedia } from '@/lib/media-store';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
        await requireUser(req.headers, 'editor');
      } catch {
        throw new HttpError(404, 'Slika nije pronađena.');
      }
    }
    const variant = new URL(req.url).searchParams.get('size');
    const bytes = await readMedia(variant === 'small' ? m.smallPath : m.path);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
