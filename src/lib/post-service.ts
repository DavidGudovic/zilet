import { db } from '@/db';
import { authors, posts, revisions, media, placements, redirects, submissions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { revisionSchema, slugify, searchText } from './publishing';
import { HttpError } from './security';
export async function savePost(actorId: string, input: unknown, id?: string, expected = 0) {
  const content = revisionSchema.parse(input);
  return db.transaction(async (tx) => {
    const [author] = await tx.select().from(authors).where(eq(authors.id, content.authorId));
    if (!author) throw new HttpError(400, 'Izaberite autora.');
    let post;
    if (id) {
      [post] = await tx.select().from(posts).where(eq(posts.id, id)).for('update');
      if (!post) throw new HttpError(404, 'Tekst nije pronađen.');
      if (post.version !== expected)
        throw new HttpError(
          409,
          'Drugi urednik je sačuvao novu verziju. Vaš tekst je ostao u ovom prozoru. Ponovo otvorite sačuvanu verziju prije nastavka.',
        );
    } else {
      if (content.rubrics.includes('citaoci'))
        throw new HttpError(
          400,
          'Radovi čitalaca nastaju isključivo prihvatanjem pristiglog rada.',
        );
      const postId = crypto.randomUUID();
      [post] = await tx
        .insert(posts)
        .values({
          id: postId,
          slug: `${slugify(content.title)}-${postId.slice(0, 6)}`,
          createdBy: actorId,
        })
        .returning();
    }
    if (content.rubrics.includes('citaoci')) {
      const [accepted] = await tx
        .select({ id: submissions.id })
        .from(submissions)
        .where(and(eq(submissions.postId, post.id), eq(submissions.status, 'accepted')));
      if (!accepted)
        throw new HttpError(400, 'U Radove čitalaca mogu samo prihvaćeni prilozi čitalaca.');
    }
    if (content.media.length) {
      // Keep this ordering (post, then sorted media IDs) aligned with publication and media
      // deletion. A media row lock makes an attachment and its deletion mutually exclusive.
      const ids = [...new Set(content.media.map((m) => m.id))].sort();
      const found = await tx
        .select({ id: media.id })
        .from(media)
        .where(inArray(media.id, ids))
        .orderBy(media.id)
        .for('update');
      if (found.length !== ids.length) throw new HttpError(400, 'Fotografija nije pronađena.');
    }
    const [previous] = post.draftRevisionId
      ? await tx.select().from(revisions).where(eq(revisions.id, post.draftRevisionId))
      : [];
    const note = content.editorialNote || '';
    const editorialNoteBy = note.trim()
      ? note === (previous?.content.editorialNote || '') && previous?.editorialNoteBy
        ? previous.editorialNoteBy
        : actorId
      : null;
    const revisionId = crypto.randomUUID();
    await tx
      .insert(revisions)
      .values({ id: revisionId, postId: post.id, content, createdBy: actorId, editorialNoteBy });
    const [updated] = await tx
      .update(posts)
      .set({ draftRevisionId: revisionId, version: post.version + 1, updatedAt: new Date() })
      .where(eq(posts.id, post.id))
      .returning();
    // Keep at most 30 recoverable autosaves plus the live revision.
    const all = await tx
      .select({ id: revisions.id })
      .from(revisions)
      .where(eq(revisions.postId, post.id))
      .orderBy(revisions.createdAt);
    const old = all
      .slice(0, -30)
      .filter((r) => r.id !== post.publishedRevisionId && r.id !== revisionId);
    if (old.length)
      await tx.delete(revisions).where(
        inArray(
          revisions.id,
          old.map((r) => r.id),
        ),
      );
    return updated;
  });
}
export async function publishPost(id: string, version: number, slot?: string, newSlug?: string) {
  return db.transaction(async (tx) => {
    const [post] = await tx.select().from(posts).where(eq(posts.id, id)).for('update');
    if (!post) throw new HttpError(404, 'Tekst nije pronađen.');
    if (post.version !== version)
      throw new HttpError(409, 'Verzija je promijenjena. Ponovo otvorite tekst.');
    const [revision] = await tx
      .select()
      .from(revisions)
      .where(eq(revisions.id, post.draftRevisionId!));
    if (!revision) throw new HttpError(400, 'Najprije sačuvajte tekst.');
    let content = revisionSchema.parse(revision.content);
    if (content.media.length) {
      const ids = [...new Set(content.media.map((m) => m.id))].sort();
      const found = await tx
        .select({ id: media.id })
        .from(media)
        .where(inArray(media.id, ids))
        .orderBy(media.id)
        .for('update');
      if (found.length !== ids.length) throw new HttpError(400, 'Fotografija nije pronađena.');
    }
    const [submission] = await tx
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.postId, id), eq(submissions.status, 'accepted')))
      .for('update');
    if (content.rubrics.includes('citaoci') && !submission)
      throw new HttpError(400, 'U Radove čitalaca mogu samo prihvaćeni prilozi čitalaca.');
    if (submission) {
      if (!content.editorialNote?.trim())
        throw new HttpError(400, 'Za tekst iz prijave dodajte uredničku bilješku prije objave.');
      if (!content.rubrics.includes('citaoci')) {
        content = {
          ...content,
          rubrics: [
            'citaoci',
            ...content.rubrics.filter((rubric) => rubric !== 'citaoci').slice(0, 3),
          ],
        };
        await tx.update(revisions).set({ content }).where(eq(revisions.id, revision.id));
      }
    }
    if (content.media.some((m) => !m.alt.trim() || !m.credit.trim()))
      throw new HttpError(400, 'Dodajte opis i potpis za svaku fotografiju.');
    if (slot === 'poem' && content.type !== 'poem')
      throw new HttpError(400, 'Izbor poezije je namijenjen pjesmama.');
    const [author] = await tx.select().from(authors).where(eq(authors.id, content.authorId));
    const slug = newSlug ? slugify(newSlug) : post.slug;
    if (slug !== post.slug) {
      const occupied = await tx.select().from(posts).where(eq(posts.slug, slug));
      const old = await tx.select().from(redirects).where(eq(redirects.slug, slug));
      if (occupied.length || old.length) throw new HttpError(409, 'Ta adresa je već korišćena.');
      await tx.insert(redirects).values({ slug: post.slug, postId: id }).onConflictDoNothing();
    }
    await tx
      .update(posts)
      .set({
        slug,
        status: 'published',
        publishedRevisionId: revision.id,
        publishedAt: post.publishedAt || new Date(),
        searchText: searchText(content, author.name),
        version: post.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));
    if (slot === 'auto') await tx.delete(placements).where(eq(placements.postId, id));
    if (slot && ['lead', 'poem', 'art'].includes(slot)) {
      await tx.delete(placements).where(eq(placements.postId, id));
      await tx
        .insert(placements)
        .values({ slot, postId: id })
        .onConflictDoUpdate({ target: placements.slot, set: { postId: id } });
    }
    return { slug, version: post.version + 1 };
  });
}
export async function unpublishPost(id: string, version: number) {
  const [post] = await db
    .update(posts)
    .set({ status: 'unpublished', version: version + 1, updatedAt: new Date() })
    .where(and(eq(posts.id, id), eq(posts.version, version)))
    .returning();
  if (!post) throw new HttpError(409, 'Verzija je promijenjena. Ponovo otvorite tekst.');
  return post;
}
