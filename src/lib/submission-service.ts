import { db } from '@/db';
import { authors, media, posts, revisions, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HttpError } from './security';
import { submissionBody } from './submission-content';
import { revisionSchema, slugify } from './publishing';
export async function reviewSubmission(
  id: string,
  actorId: string,
  version: number,
  action: 'accept' | 'reject',
  note: string,
) {
  return db.transaction(async (tx) => {
    // Same ordering as media cleanup: media first, then the referencing record.
    const [snapshot] = await tx.select().from(submissions).where(eq(submissions.id, id));
    if (!snapshot) throw new HttpError(404, 'Prilog nije pronađen.');
    const [photo] = snapshot.mediaId
      ? await tx.select().from(media).where(eq(media.id, snapshot.mediaId)).for('update')
      : [];
    const [item] = await tx.select().from(submissions).where(eq(submissions.id, id)).for('update');
    if (!item || item.version !== version || item.status !== 'pending')
      throw new HttpError(409, 'Prilog je već pregledan ili promijenjen. Osvježite stranicu.');
    if (action === 'reject') {
      await tx
        .update(submissions)
        .set({ status: 'rejected', reviewNote: note, reviewedBy: actorId, version: version + 1 })
        .where(eq(submissions.id, id));
      return { status: 'rejected' };
    }
    if (!note.trim()) throw new HttpError(400, 'Napišite bilješku uz rad prije prihvatanja.');
    const authorId = crypto.randomUUID();
    await tx.insert(authors).values({
      id: authorId,
      slug: `${slugify(item.authorName)}-${authorId.slice(0, 8)}`,
      name: item.authorName,
    });
    const body = submissionBody(item.text, item.rubric);
    const content = revisionSchema.parse({
      title: item.title,
      intro: '',
      editorialNote: note,
      authorId,
      type: body.kind,
      body,
      rubrics: ['citaoci', item.rubric],
      media: photo
        ? [
            {
              id: photo.id,
              alt: photo.alt,
              credit: photo.credit,
              caption: photo.caption,
              placement: 'below',
              focalX: 50,
              focalY: 50,
            },
          ]
        : [],
      commentsOpen: true,
    });
    const postId = crypto.randomUUID(),
      revisionId = crypto.randomUUID();
    await tx.insert(posts).values({
      id: postId,
      slug: `${slugify(item.title)}-${postId.slice(0, 8)}`,
      createdBy: actorId,
    });
    await tx
      .insert(revisions)
      .values({ id: revisionId, postId, content, createdBy: actorId, editorialNoteBy: actorId });
    await tx
      .update(posts)
      .set({ draftRevisionId: revisionId, version: 1 })
      .where(eq(posts.id, postId));
    await tx
      .update(submissions)
      .set({
        status: 'accepted',
        postId,
        reviewNote: '',
        reviewedBy: actorId,
        version: version + 1,
      })
      .where(eq(submissions.id, id));
    return { status: 'accepted', postId };
  });
}
