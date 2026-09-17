import { authorName } from './content';
import { db } from '@/db';
import { authors, authorRedirects, revisions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { slugify } from './publishing';
import { HttpError } from './security';

type AuthorDatabase = Pick<typeof db, 'insert' | 'select'>;

// Owner imports keep their supplied IDs and metadata for new profiles. A retry or
// a case-equivalent existing profile must return the stored identity before any
// revision is written; JSON author references have no database foreign key.
export async function insertOrResolveAuthor(
  tx: AuthorDatabase,
  input: typeof authors.$inferInsert,
) {
  const [created] = await tx
    .insert(authors)
    .values({ ...input, name: authorName(input.name) })
    .onConflictDoNothing()
    .returning();
  if (created) return { author: created, created: true };
  const [existingId] = await tx
    .select()
    .from(authors)
    .where(eq(authors.id, input.id))
    .for('key share');
  if (existingId) return { author: existingId, created: false };
  const [author] = await tx
    .select()
    .from(authors)
    .where(sql`zilet_author_key(${authors.name}) = zilet_author_key(${input.name})`)
    .for('key share');
  if (!author) throw new Error('Autor nije sačuvan. Pokušajte ponovo.');
  return { author, created: false };
}

// The database key also protects imports and concurrent requests. Preserve spelling
// and accents; case and whitespace alone do not create another credited author.
export async function findOrCreateAuthor(tx: AuthorDatabase, name: string, bio = '') {
  const cleanName = name.normalize('NFC').replace(/\s+/gu, ' ').trim();
  const id = crypto.randomUUID();
  return insertOrResolveAuthor(tx, {
    id,
    slug: `${slugify(cleanName)}-${id.slice(0, 8)}`,
    name: cleanName,
    bio: bio || null,
  });
}

export async function getAuthorRedirect(slug: string) {
  const [target] = await db
    .select({ slug: authors.slug })
    .from(authorRedirects)
    .innerJoin(authors, eq(authorRedirects.authorId, authors.id))
    .where(eq(authorRedirects.slug, slug));
  return target?.slug;
}

export async function deleteAuthor(id: string) {
  return db.transaction(async (tx) => {
    // Saves/imports hold KEY SHARE until their JSON author reference is committed.
    const [author] = await tx
      .select({ id: authors.id })
      .from(authors)
      .where(eq(authors.id, id))
      .for('update');
    if (!author) throw new HttpError(404, 'Autor nije pronađen.');
    const [{ total }] = await tx
      .select({ total: sql<number>`count(distinct ${revisions.postId})::int` })
      .from(revisions)
      .where(sql`${revisions.content}->>'authorId' = ${id}`);
    if (total)
      throw new HttpError(
        409,
        `Autor ima povezane radove (${total}), uključujući nacrte ili ranije verzije. Nije moguće izbrisati autora.`,
      );
    await tx.delete(authors).where(eq(authors.id, id));
  });
}
