import { z } from 'zod';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser, assertOrigin, jsonBody, failure } from '@/lib/security';
export async function PATCH(req: Request) {
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers);
    const input = z
      .object({ name: z.string().trim().min(1).max(80) })
      .strict()
      .parse(await jsonBody(req, 1000));
    await db.update(user).set({ name: input.name, updatedAt: new Date() }).where(eq(user.id, u.id));
    return Response.json(
      { name: input.name },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
