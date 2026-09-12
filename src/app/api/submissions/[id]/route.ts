import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { deleteUnusedMedia } from '@/lib/storage-cleanup';
import { HttpError } from '@/lib/security';
import { z } from 'zod';
import { requireUser, assertOrigin, failure, jsonBody } from '@/lib/security';
import { attemptSubmissionDelivery } from '@/lib/submission-correspondence';
import { reviewSubmission } from '@/lib/submission-service';
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers, 'editor');
    const body = z
      .object({
        action: z.enum(['accept', 'reject']),
        version: z.number().int().positive(),
        note: z.string().trim().max(4000),
      })
      .strict()
      .parse(await jsonBody(req, 20000));
    const result = await reviewSubmission(
      (await params).id,
      u.id,
      body.version,
      body.action,
      body.note,
    );
    const deliveryStatus = await attemptSubmissionDelivery(result.messageId);
    return Response.json(
      { ...result, deliveryStatus },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers);
    const { version } = z
      .object({ version: z.number().int().positive() })
      .strict()
      .parse(await jsonBody(req, 1000));
    const photoId = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(submissions)
        .where(eq(submissions.id, (await params).id))
        .for('update');
      if (!item || (item.userId !== u.id && !['editor', 'maintainer'].includes(u.role)))
        throw new HttpError(404, 'Prilog nije pronađen.');
      if (item.version !== version)
        throw new HttpError(409, 'Prilog je promijenjen. Osvježite stranicu.');
      if (item.status === 'accepted' && (item.postId || u.role === 'reader'))
        throw new HttpError(409, 'Prihvaćeni rad uređuje redakcija.');
      await tx.delete(submissions).where(eq(submissions.id, item.id));
      return item.mediaId;
    });
    if (photoId) {
      try {
        await deleteUnusedMedia(photoId);
      } catch (e) {
        if (!(e instanceof HttpError && [404, 409].includes(e.status)))
          console.error('Fotografiju priloga treba ukloniti iz biblioteke.');
      }
    }
    return Response.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
