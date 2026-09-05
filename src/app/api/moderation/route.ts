import { db } from '@/db';
import { user, session, moderation } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const actor = await requireUser(req.headers, 'editor');
    const { userId, suspended } = await jsonBody(req, 5000);
    if (typeof suspended !== 'boolean') throw new HttpError(400, 'Neispravna radnja.');
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(user).where(eq(user.id, userId)).for('update');
      if (!target || target.role !== 'reader')
        throw new HttpError(403, 'Ova radnja je dostupna samo za čitaoce.');
      await tx.update(user).set({ suspended }).where(eq(user.id, userId));
      if (suspended) await tx.delete(session).where(eq(session.userId, userId));
      await tx.insert(moderation).values({
        id: crypto.randomUUID(),
        targetUserId: userId,
        actorId: actor.id,
        action: suspended ? 'suspend' : 'unsuspend',
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
