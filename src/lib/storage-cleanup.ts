import { db } from '@/db';
import {
  authors,
  comments,
  media,
  moderation,
  posts,
  redirects,
  revisions,
  submissions,
} from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import { mediaDirectory } from './media-store';
import { HttpError } from './security';

export async function deletePostPermanently(id: string, version: number) {
  return db.transaction(async (tx) => {
    const [post] = await tx.select().from(posts).where(eq(posts.id, id)).for('update');
    if (!post) throw new HttpError(404, 'Tekst nije pronađen.');
    if (post.version !== version)
      throw new HttpError(409, 'Verzija je promijenjena. Ponovo otvorite tekst.');
    if (!['draft', 'unpublished'].includes(post.status))
      throw new HttpError(409, 'Objavljeni tekst najprije povucite.');

    // Moderation records reference comments, so remove them before the post’s comments.
    await tx
      .delete(moderation)
      .where(
        sql`${moderation.commentId} in (select ${comments.id} from ${comments} where ${comments.postId} = ${id})`,
      );
    await tx.delete(comments).where(eq(comments.postId, id));
    await tx.delete(redirects).where(eq(redirects.postId, id));
    await tx.delete(posts).where(and(eq(posts.id, id), eq(posts.version, version)));
    return { id };
  });
}

/**
 * Deletes one media record only after serializing against every path that can create a reference.
 * Callers that attach media must lock its row with `FOR UPDATE` in the same transaction first.
 */
export async function deleteUnusedMedia(id: string) {
  const directory = mediaDirectory(id);
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(media).where(eq(media.id, id)).for('update');
    if (!item) throw new HttpError(404, 'Fotografija nije pronađena.');

    const [revisionReference] = await tx
      .select({ id: revisions.id })
      .from(revisions)
      .where(sql`${revisions.content}->'media' @> ${JSON.stringify([{ id }])}::jsonb`)
      .limit(1);
    const [portraitReference] = await tx
      .select({ id: authors.id })
      .from(authors)
      .where(eq(authors.portraitId, id))
      .limit(1);
    const [submissionReference] = await tx
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.mediaId, id))
      .limit(1);
    if (revisionReference || portraitReference || submissionReference)
      throw new HttpError(409, 'Fotografija je još vezana za sadržaj i ne može se izbrisati.');

    // Keep the database row and its files in one serialized deletion path. `force` also repairs a
    // previous interrupted upload where the row remained but one of its derived files is absent.
    await rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    await tx.delete(media).where(eq(media.id, id));
    return { id };
  });
}
