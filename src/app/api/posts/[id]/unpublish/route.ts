import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';
import { unpublishPost } from '@/lib/post-service';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const input = await jsonBody(req, 10000);
    if (!Number.isInteger(input.version)) throw new HttpError(400, 'Nedostaje verzija.');
    return Response.json(await unpublishPost((await params).id, input.version));
  } catch (e) {
    return failure(e);
  }
}
