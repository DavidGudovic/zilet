import { requireUser, assertOrigin, jsonBody, failure, takeLimit } from '@/lib/security';
import { savePost } from '@/lib/post-service';
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers, 'editor');
    await takeLimit(`new:${u.id}`, 30, 3600);
    return Response.json(await savePost(u.id, await jsonBody(req)), { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
