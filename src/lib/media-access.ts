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

// Picture files never change once written, so a browser may keep them and only ask again:
// the access rules above run on every request, and an unchanged picture answers 304.
export function mediaResponse(
  req: Request,
  tag: string,
  type: string,
  load: () => Promise<Buffer>,
) {
  const etag = `"${tag}"`;
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'private, no-cache',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  };
  const known = (req.headers.get('if-none-match') || '')
    .split(',')
    .map((value) => value.trim().replace(/^W\//, ''));
  if (known.includes(etag) || known.includes('*'))
    return Promise.resolve(new Response(null, { status: 304, headers }));
  return load().then(
    (bytes) =>
      new Response(new Uint8Array(bytes), {
        headers: { ...headers, 'Content-Length': String(bytes.length) },
      }),
  );
}
