import { db } from '@/db';
import { posts, revisions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';
import { savePost } from '@/lib/post-service';
import { deletePostPermanently } from '@/lib/storage-cleanup';
type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Ctx) {
  try {
    await requireUser(req.headers, 'editor');
    const { id } = await params;
    const [p] = await db.select().from(posts).where(eq(posts.id, id));
    if (!p) throw new HttpError(404, 'Tekst nije pronađen.');
    const revisionId = new URL(req.url).searchParams.get('revision') || p.draftRevisionId!;
    const [r] = await db
      .select()
      .from(revisions)
      .where(and(eq(revisions.id, revisionId), eq(revisions.postId, id)));
    const history = await db
      .select({ id: revisions.id, createdAt: revisions.createdAt })
      .from(revisions)
      .where(eq(revisions.postId, id))
      .orderBy(desc(revisions.createdAt))
      .limit(30);
    return Response.json(
      { post: p, content: r?.content, history },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request, { params }: Ctx) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers, 'editor');
    const input = await jsonBody(req);
    if (!Number.isInteger(input.version)) throw new HttpError(400, 'Nedostaje verzija.');
    return Response.json(await savePost(u.id, input.content, (await params).id, input.version));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const input = await jsonBody(req, 10000);
    if (!Number.isInteger(input.version)) throw new HttpError(400, 'Nedostaje verzija.');
    return Response.json(await deletePostPermanently((await params).id, input.version));
  } catch (e) {
    return failure(e);
  }
}
