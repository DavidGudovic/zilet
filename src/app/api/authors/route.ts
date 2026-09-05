import { db } from '@/db';
import { authors } from '@/db/schema';
import { requireUser, assertOrigin, jsonBody, failure } from '@/lib/security';
import { slugify } from '@/lib/publishing';
import { z } from 'zod';
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const input = z
      .object({ name: z.string().trim().min(1).max(120), bio: z.string().max(3000).default('') })
      .strict()
      .parse(await jsonBody(req, 20000));
    const id = crypto.randomUUID();
    const [author] = await db
      .insert(authors)
      .values({
        id,
        slug: `${slugify(input.name)}-${id.slice(0, 5)}`,
        name: input.name,
        bio: input.bio || null,
      })
      .returning();
    return Response.json(author, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
