import { db } from '@/db';
import { requireUser, assertOrigin, jsonBody, failure } from '@/lib/security';
import { findOrCreateAuthor } from '@/lib/author-service';
import { z } from 'zod';
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const input = z
      .object({ name: z.string().trim().min(1).max(120), bio: z.string().max(3000).default('') })
      .strict()
      .parse(await jsonBody(req, 20000));
    const { author, created } = await findOrCreateAuthor(db, input.name, input.bio);
    return Response.json(author, { status: created ? 201 : 200 });
  } catch (e) {
    return failure(e);
  }
}
