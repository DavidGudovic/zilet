import { readFile } from 'node:fs/promises';
import { processImage } from '../src/lib/media-store';
import { media } from '../src/db/schema';
import { db } from '../src/db';
import { posts, revisions, user, placements } from '../src/db/schema';
import { demoPosts } from '../src/lib/fixtures';
import { eq } from 'drizzle-orm';
import { searchText } from '../src/lib/publishing';
import { insertOrResolveAuthor } from '../src/lib/author-service';

export async function importContent(approved = false) {
  const artworkId = '6a5cd1e0-8425-40c2-9555-98d0c5000001';
  const art = await processImage(await readFile('fixtures/strandgade.jpg'), artworkId);
  await db.transaction(async (tx) => {
    const owner = approved ? 'approved-content-import' : 'fixture-system';
    await tx
      .insert(user)
      .values({
        id: owner,
        name: approved ? 'Odobreni uvoz sadržaja' : 'Razvojni uvoz',
        email: `${owner}@zilet.invalid`,
        emailVerified: false,
        role: 'reader',
        suspended: true,
      })
      .onConflictDoNothing();
    await tx
      .insert(media)
      .values({
        id: artworkId,
        filename: 'strandgade.jpg',
        ...art,
        createdBy: owner,
        credit: 'Vilhelm Hammershøi · Cleveland Museum of Art · CC0',
      })
      .onConflictDoNothing();
    const { author } = await insertOrResolveAuthor(tx, demoPosts[0].author);
    for (const p of demoPosts) {
      const exists = await tx.select().from(posts).where(eq(posts.id, p.id));
      if (exists.length) continue;
      const revisionId = crypto.randomUUID();
      const content = {
        title: p.title,
        intro: p.intro,
        type: p.type,
        authorId: author.id,
        body: p.body,
        rubrics: p.rubrics,
        media:
          p.type === 'prose'
            ? [
                {
                  id: artworkId,
                  alt: 'Sunčeva svjetlost ulazi kroz prozor u tihu sobu.',
                  caption: approved
                    ? 'Strandgade, Sunshine, oko 1906.'
                    : 'Strandgade, Sunshine, oko 1906. Razvojna ilustracija.',
                  credit: 'Vilhelm Hammershøi · Cleveland Museum of Art · CC0',
                  placement: 'below' as const,
                  focalX: 50,
                  focalY: 50,
                },
              ]
            : [],
        commentsOpen: true,
      };
      await tx.insert(posts).values({
        id: p.id,
        slug: p.slug,
        status: 'published',
        createdBy: owner,
        publishedAt: approved ? new Date() : new Date(p.publishedAt),
        version: 1,
        searchText: searchText(content, author.name),
      });
      await tx
        .insert(revisions)
        .values({ id: revisionId, postId: p.id, content, createdBy: owner });
      await tx
        .update(posts)
        .set({ draftRevisionId: revisionId, publishedRevisionId: revisionId })
        .where(eq(posts.id, p.id));
      await tx
        .insert(placements)
        .values({ slot: p.type === 'poem' ? 'poem' : 'lead', postId: p.id })
        .onConflictDoNothing();
    }
  });
}
