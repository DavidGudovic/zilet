// Owner-only maintenance: addresses made at the first autosave from a half-typed title
// ("/tekst/a-df36f1" for "Anegdote o piscima") follow the published title; the old address
// keeps working as a permanent redirect. Addresses chosen by hand, without the id suffix, stay,
// and so do addresses that already describe the title.
// Dry run by default; pass --apply to change them.
import { db, sql } from '../src/db';
import { posts, revisions, redirects } from '../src/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { slugify } from '../src/lib/publishing';
const apply = process.argv.includes('--apply');
try {
  const live = await db
    .select({ id: posts.id, slug: posts.slug, content: revisions.content })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(and(eq(posts.status, 'published'), isNotNull(posts.publishedAt)));
  let changed = 0;
  for (const post of live) {
    const suffix = `-${post.id.slice(0, 6)}`;
    const title = slugify(post.content.title);
    const target = `${title}${suffix}`;
    // An address that already carries every word of the title (and perhaps more) is kept.
    if (!post.slug.endsWith(suffix) || post.slug.slice(0, -suffix.length).includes(title)) continue;
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(posts).where(eq(posts.id, post.id)).for('update');
      const taken = await tx.select({ id: posts.id }).from(posts).where(eq(posts.slug, target));
      const moved = await tx.select().from(redirects).where(eq(redirects.slug, target));
      if (!locked || locked.slug !== post.slug || taken.length || moved.length) {
        console.log(
          `preskočeno  /tekst/${post.slug} (adresa ${target} je zauzeta ili promijenjena)`,
        );
        return;
      }
      console.log(
        `${apply ? 'promijenjeno' : 'promijeniće se'}  /tekst/${post.slug}  →  /tekst/${target}`,
      );
      if (!apply) return;
      await tx.insert(redirects).values({ slug: post.slug, postId: post.id }).onConflictDoNothing();
      // The version stays: an editor with the text open keeps saving without a conflict.
      await tx.update(posts).set({ slug: target }).where(eq(posts.id, post.id));
      changed++;
    });
  }
  console.log(
    apply ? `Promijenjeno adresa: ${changed}.` : 'Probni prolaz; ništa nije promijenjeno.',
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Adrese nijesu promijenjene.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
