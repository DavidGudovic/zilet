import { db } from '@/db';
import { authors } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const { id } = await params;
    const input = z
      .object({
        bio: z.string().max(3000),
        previousBio: z.string().max(3000),
      })
      .strict()
      .parse(await jsonBody(req, 30000));
    const [updated] = await db
      .update(authors)
      .set({ bio: input.bio || null })
      .where(and(eq(authors.id, id), sql`coalesce(${authors.bio}, '') = ${input.previousBio}`))
      .returning();
    if (!updated) {
      const [existing] = await db
        .select({ id: authors.id })
        .from(authors)
        .where(eq(authors.id, id));
      throw new HttpError(
        existing ? 409 : 404,
        existing
          ? 'Biografija je u međuvremenu izmijenjena. Otvorite stranicu ponovo i uporedite tekst.'
          : 'Autor nije pronađen.',
      );
    }
    return Response.json(updated);
  } catch (e) {
    return failure(e);
  }
}
