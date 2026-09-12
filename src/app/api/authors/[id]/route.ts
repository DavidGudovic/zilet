import { db } from '@/db';
import { authors } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { requireUser, assertOrigin, jsonBody, failure, HttpError } from '@/lib/security';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(req);
    await requireUser(req.headers, 'editor');
    const { id } = await params;
    const input = z
      .union([
        z.object({ bio: z.string().max(3000), previousBio: z.string().max(3000) }).strict(),
        z
          .object({
            bio: z.string().max(3000),
            previousBioHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      ])
      .parse(await jsonBody(req, 30000));
    let previousBio: string;
    if ('previousBioHash' in input) {
      const [snapshot] = await db
        .select({ bio: authors.bio })
        .from(authors)
        .where(eq(authors.id, id));
      if (!snapshot) throw new HttpError(404, 'Autor nije pronađen.');
      previousBio = snapshot.bio || '';
      if (createHash('sha256').update(previousBio).digest('hex') !== input.previousBioHash)
        throw new HttpError(
          409,
          'Biografija je u međuvremenu izmijenjena. Otvorite stranicu ponovo i uporedite tekst.',
        );
    } else previousBio = input.previousBio;
    const [updated] = await db
      .update(authors)
      .set({ bio: input.bio || null })
      .where(and(eq(authors.id, id), sql`coalesce(${authors.bio}, '') = ${previousBio}`))
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
