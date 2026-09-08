import { db } from '@/db';
import { media, submissions, user } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import {
  assertOrigin,
  boundedForm,
  failure,
  HttpError,
  requireUser,
  takeLimit,
} from '@/lib/security';
import { submissionSchema } from '@/lib/submission-content';
import { screenSubmission } from '@/lib/submission-screening';
import { processImage, mediaRoot } from '@/lib/media-store';
import { rm } from 'node:fs/promises';
import path from 'node:path';
export async function POST(req: Request) {
  let imageId: string | undefined;
  let committed = false;
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers);
    await takeLimit(`submission:${u.id}`, 5, 86400);
    const form = await boundedForm(req, 6 * 1024 * 1024);
    const input = submissionSchema.parse(
      Object.fromEntries(
        ['title', 'text', 'rubric', 'consent', 'alt', 'credit'].map((k) => [k, form.get(k) || '']),
      ),
    );
    const files = form.getAll('photo').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 1) throw new HttpError(400, 'Dodajte samo jednu fotografiju.');
    const file = files[0];
    if (file && (file.size > 5 * 1024 * 1024 || !input.alt || !input.credit))
      throw new HttpError(
        400,
        'Fotografija može imati najviše 5 MB. Dodajte njen opis i autora / izvor.',
      );
    const screening = await screenSubmission(input.title, input.text);
    if (screening.status === 'blocked')
      return Response.json(
        {
          error: `Naš sistem je označio ovaj sadržaj kao neprikladan: ${screening.reason}. Ako mislite da je ovo greška, javite nam se na Facebooku.`,
          flagged: true,
        },
        { status: 422, headers: { 'Cache-Control': 'no-store' } },
      );
    let image: Awaited<ReturnType<typeof processImage>> | undefined;
    if (file) {
      imageId = crypto.randomUUID();
      image = await processImage(Buffer.from(await file.arrayBuffer()), imageId);
    }
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      // Serialize quota checks for this account, including concurrent sends.
      const [currentUser] = await tx.select().from(user).where(eq(user.id, u.id)).for('update');
      if (!currentUser || currentUser.suspended || !currentUser.emailVerified)
        throw new HttpError(403, 'Pristup nalogu nije dostupan.');
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(submissions)
        .where(and(eq(submissions.userId, u.id), eq(submissions.status, 'pending')));
      if (count >= 5)
        throw new HttpError(429, 'Već imate pet priloga na pregledu. Sačekajte odgovor redakcije.');
      if (image && imageId && file)
        await tx.insert(media).values({
          id: imageId,
          filename: 'prilog-citaoca.webp',
          ...image,
          alt: input.alt,
          credit: input.credit,
          createdBy: u.id,
        });
      await tx.insert(submissions).values({
        id,
        userId: u.id,
        authorName: currentUser.name,
        title: input.title,
        text: input.text,
        rubric: input.rubric,
        mediaId: imageId,
        screening: screening.status === 'passed' ? 'passed' : 'manual',
        screeningReason: screening.reason,
      });
    });
    committed = true;
    return Response.json(
      { id, message: 'Rad je poslat redakciji. Status možete pratiti ovdje.' },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return failure(e);
  } finally {
    if (imageId && !committed)
      await rm(path.join(mediaRoot(), imageId), { recursive: true, force: true }).catch(() => {});
  }
}
