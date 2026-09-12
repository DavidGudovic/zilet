import { db } from '@/db';
import { authors, authorRedirects } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { slugify } from './publishing';

type AuthorDatabase = Pick<typeof db, 'insert' | 'select'>;

// Owner imports keep their supplied IDs and metadata for new profiles. A retry or
// a case-equivalent existing profile must return the stored identity before any
// revision is written; JSON author references have no database foreign key.
export async function insertOrResolveAuthor(
  tx: AuthorDatabase,
  input: typeof authors.$inferInsert,
) {
  const [created] = await tx.insert(authors).values(input).onConflictDoNothing().returning();
  if (created) return { author: created, created: true };
  const [existingId] = await tx.select().from(authors).where(eq(authors.id, input.id));
  if (existingId) return { author: existingId, created: false };
  const [author] = await tx
    .select()
    .from(authors)
    .where(sql`zilet_author_key(${authors.name}) = zilet_author_key(${input.name})`);
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
