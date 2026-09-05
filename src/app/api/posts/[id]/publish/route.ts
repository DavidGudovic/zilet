import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';
import { publishPost } from '@/lib/post-service';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const input = await jsonBody(req, 10000);
    if (!Number.isInteger(input.version)) throw new HttpError(400, 'Nedostaje verzija.');
    return Response.json(
      await publishPost((await params).id, input.version, input.slot, input.slug),
    );
  } catch (e) {
    return failure(e);
  }
}
