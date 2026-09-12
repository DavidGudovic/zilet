import { z } from 'zod';
import { requireUser, assertOrigin, failure, jsonBody, takeLimit } from '@/lib/security';
import { addSubmissionMessage, attemptSubmissionDelivery } from '@/lib/submission-correspondence';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    const actor = await requireUser(req.headers);
    const body = z
      .object({ version: z.number().int().positive(), body: z.string().trim().min(1).max(4000) })
      .strict()
      .parse(await jsonBody(req, 20000));
    await takeLimit(`submission-message:${actor.id}`, 30, 3600);
    const result = await addSubmissionMessage((await params).id, actor, body.version, body.body);
    const deliveryStatus = await attemptSubmissionDelivery(result.messageId);
    return Response.json(
      { ...result, deliveryStatus },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
