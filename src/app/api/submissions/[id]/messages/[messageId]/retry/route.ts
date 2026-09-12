import { db } from '@/db';
import { submissions, submissionMessages } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireUser, assertOrigin, failure, HttpError, takeLimit } from '@/lib/security';
import { deliverSubmissionMessage } from '@/lib/submission-correspondence';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    assertOrigin(req);
    const actor = await requireUser(req.headers);
    const { id, messageId } = await params;
    const [entry] = await db
      .select({
        ownerId: submissions.userId,
        actorId: submissionMessages.actorId,
        kind: submissionMessages.kind,
      })
      .from(submissionMessages)
      .innerJoin(submissions, eq(submissionMessages.submissionId, submissions.id))
      .where(and(eq(submissions.id, id), eq(submissionMessages.id, messageId)));
    const editor = ['editor', 'maintainer'].includes(actor.role);
    if (
      !entry ||
      (!editor &&
        (entry.ownerId !== actor.id || entry.actorId !== actor.id || entry.kind !== 'reply'))
    )
      throw new HttpError(404, 'Poruka nije pronađena.');
    await takeLimit(`submission-mail:${actor.id}`, 20, 3600);
    const deliveryStatus = await deliverSubmissionMessage(messageId);
    return Response.json({ deliveryStatus }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
