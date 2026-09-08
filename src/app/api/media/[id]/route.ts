import { assertOrigin, failure, requireUser } from '@/lib/security';
import { deleteUnusedMedia } from '@/lib/storage-cleanup';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    return Response.json(await deleteUnusedMedia((await params).id));
  } catch (e) {
    return failure(e);
  }
}
