import { db } from '@/db';
import { comments, moderation } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers);
    const { id } = await params;
    const { action } = await jsonBody(req, 5000);
    const editor = ['editor', 'maintainer'].includes(u.role);
    if (!['remove', 'restore', 'delete'].includes(action))
      throw new HttpError(400, 'Nepoznata radnja.');
    await db.transaction(async (tx) => {
      const [comment] = await tx.select().from(comments).where(eq(comments.id, id)).for('update');
      if (!comment) throw new HttpError(404, 'Komentar nije pronađen.');
      if ((action === 'delete' && comment.userId !== u.id) || (action !== 'delete' && !editor))
        throw new HttpError(403, 'Nemate pravo da mijenjate ovaj komentar.');
      if (comment.status === 'deleted')
        throw new HttpError(409, 'Autor je izbrisao ovaj komentar.');
      await tx
        .update(comments)
        .set({
          status: action === 'delete' ? 'deleted' : action === 'remove' ? 'removed' : 'visible',
          removedBy: action === 'restore' ? null : u.id,
        })
        .where(eq(comments.id, id));
      await tx
        .insert(moderation)
        .values({ id: crypto.randomUUID(), commentId: id, actorId: u.id, action });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
