import { db } from '@/db';
import { comments, posts, revisions, user } from '@/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireUser, assertOrigin, jsonBody, failure, takeLimit, HttpError } from '@/lib/security';
import { z } from 'zod';
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('postId') || '';
    const page = Math.max(
      1,
      Math.min(10000, Math.floor(Number(url.searchParams.get('page'))) || 1),
    );
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, 'published')));
    if (!post) throw new HttpError(404, 'Tekst nije pronađen.');
    const items = await db
      .select({
        id: comments.id,
        body: comments.body,
        name: user.name,
        userId: comments.userId,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(user, eq(user.id, comments.userId))
      .where(and(eq(comments.postId, id), eq(comments.status, 'visible')))
      .orderBy(asc(comments.createdAt))
      .limit(20)
      .offset((page - 1) * 20);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.postId, id), eq(comments.status, 'visible')));
    return Response.json({ items, count }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers);
    await takeLimit(`comment:${u.id}`, 5, 300);
    const input = z
      .object({
        postId: z.string(),
        body: z
          .string()
          .min(1)
          .max(4000)
          .refine((s) => s.trim().length > 0),
      })
      .strict()
      .parse(await jsonBody(req, 20000));
    const result = await db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(posts)
        .where(and(eq(posts.id, input.postId), eq(posts.status, 'published')))
        .for('share');
      if (!p) throw new HttpError(404, 'Tekst nije pronađen.');
      const [r] = await tx.select().from(revisions).where(eq(revisions.id, p.publishedRevisionId!));
      if (!r.content.commentsOpen)
        throw new HttpError(403, 'Komentari su zatvoreni za ovaj tekst.');
      const [item] = await tx
        .insert(comments)
        .values({
          id: crypto.randomUUID(),
          postId: p.id,
          userId: u.id,
          body: input.body,
          status: process.env.COMMENTS_REQUIRE_APPROVAL === 'true' ? 'pending' : 'visible',
        })
        .returning();
      return item;
    });
    return Response.json({ id: result.id, status: result.status }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
