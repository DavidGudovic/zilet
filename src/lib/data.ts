import { db } from '@/db';
import { authors, posts, revisions, media, placements, redirects, user } from '@/db/schema';
import { and, eq, desc, asc, sql as dsql, ilike } from 'drizzle-orm';
import { demoPosts } from './fixtures';
import { fold, type PostView, type MediaView } from './content';
import type { RevisionContent } from '@/db/schema';
export const isDemo = () =>
  process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
export async function viewPost(
  post: typeof posts.$inferSelect,
  content: RevisionContent,
  editorialNoteBy?: string | null,
): Promise<PostView> {
  const [author] = await db.select().from(authors).where(eq(authors.id, content.authorId));
  const postedBy = await postingName(post.createdBy);
  const noteBy = editorialNoteBy ? await postingName(editorialNoteBy) : undefined;
  const images: MediaView[] = [];
  for (const ref of content.media) {
    const [m] = await db.select().from(media).where(eq(media.id, ref.id));
    if (m) images.push({ ...ref, url: `/media/${m.id}`, width: m.width, height: m.height });
  }
  return {
    id: post.id,
    slug: post.slug,
    title: content.title,
    intro: content.intro,
    postedBy,
    editorialNote: content.editorialNote,
    editorialNoteBy: noteBy,
    type: content.type,
    body: content.body,
    rubrics: content.rubrics,
    author,
    publishedAt: (post.publishedAt || post.createdAt).toISOString(),
    media: images,
    commentsOpen: content.commentsOpen,
    version: post.version,
    demo: post.id.startsWith('sample-'),
  };
}
export async function findPosts({
  q = '',
  rubric = '',
  author = '',
  page = 1,
  sort = 'newest',
  limit = 12,
}: {
  q?: string;
  rubric?: string;
  author?: string;
  page?: number;
  sort?: string;
  limit?: number;
} = {}) {
  page = Math.max(1, Math.min(10000, Math.floor(page) || 1));
  limit = Math.max(1, Math.min(24, limit));
  if (isDemo()) {
    let data = demoPosts.filter(
      (p) =>
        (!q || fold(`Žilet ${p.title} ${p.author.name}`).includes(fold(q))) &&
        (!author || p.author.id === author) &&
        (!rubric ||
          p.rubrics.includes(rubric) ||
          (rubric === 'umjetnost' &&
            p.rubrics.some((r) => ['slikarstvo', 'film', 'muzika'].includes(r))) ||
          (rubric === 'proza' && p.rubrics.includes('price'))),
    );
    if (sort === 'oldest') data = [...data].reverse();
    return { items: data.slice((page - 1) * limit, page * limit), total: data.length, page, limit };
  }
  const conditions = [eq(posts.status, 'published')];
  if (q) conditions.push(ilike(posts.searchText, `%${fold(q).replace(/[\\%_]/g, '\\$&')}%`));
  if (author) conditions.push(dsql`${revisions.content}->>'authorId' = ${author}`);
  if (rubric) {
    const keys =
      rubric === 'umjetnost'
        ? ['slikarstvo', 'muzika', 'film']
        : rubric === 'proza'
          ? ['proza', 'price']
          : [rubric];
    conditions.push(
      dsql`${revisions.content}->'rubrics' ?| ARRAY[${dsql.join(
        keys.map((r) => dsql`${r}`),
        dsql`, `,
      )}]::text[]`,
    );
  }
  const where = and(...conditions);
  const [{ total }] = await db
    .select({ total: dsql<number>`count(*)::int` })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(where);
  const rows = await db
    .select({ post: posts, content: revisions.content, editorialNoteBy: revisions.editorialNoteBy })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(where)
    .orderBy(sort === 'oldest' ? asc(posts.publishedAt) : desc(posts.publishedAt), asc(posts.id))
    .limit(limit)
    .offset((page - 1) * limit);
  return {
    items: await Promise.all(rows.map((r) => viewPost(r.post, r.content, r.editorialNoteBy))),
    total,
    page,
    limit,
  };
}
export async function getPosts() {
  return (await findPosts({ limit: 24 })).items;
}
export async function getFrontPage() {
  const recent = await getPosts();
  const choices = await getPlacements();
  if (isDemo()) return { posts: recent, choices };
  const selected = await db
    .select({ post: posts, content: revisions.content, editorialNoteBy: revisions.editorialNoteBy })
    .from(placements)
    .innerJoin(posts, eq(placements.postId, posts.id))
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(eq(posts.status, 'published'));
  const older = await Promise.all(
    selected
      .filter((r) => !recent.some((p) => p.id === r.post.id))
      .map((r) => viewPost(r.post, r.content, r.editorialNoteBy)),
  );
  return { posts: [...recent, ...older], choices };
}
export async function getPost(slug: string) {
  if (isDemo()) return demoPosts.find((p) => p.slug === slug);
  const [row] = await db
    .select({ post: posts, content: revisions.content, editorialNoteBy: revisions.editorialNoteBy })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, 'published')));
  return row ? viewPost(row.post, row.content, row.editorialNoteBy) : undefined;
}
export async function getRedirect(slug: string) {
  if (isDemo()) return;
  const [row] = await db
    .select({ slug: posts.slug })
    .from(redirects)
    .innerJoin(posts, eq(posts.id, redirects.postId))
    .where(and(eq(redirects.slug, slug), eq(posts.status, 'published')));
  return row?.slug;
}
export async function getAuthors() {
  if (isDemo()) return [demoPosts[0].author];
  return db
    .select()
    .from(authors)
    .where(
      dsql`${authors.isEditor} or exists (select 1 from ${posts} inner join ${revisions} on ${posts.publishedRevisionId} = ${revisions.id} where ${posts.status} = 'published' and ${revisions.content}->>'authorId' = ${authors.id})`,
    )
    .orderBy(asc(authors.name));
}
export async function getPlacements() {
  if (isDemo()) return [];
  return db.select().from(placements);
}
export async function getPortrait(id?: string | null) {
  if (!id) return;
  const [m] = await db.select().from(media).where(eq(media.id, id));
  return m?.alt && m.credit
    ? {
        id: m.id,
        url: `/media/${m.id}`,
        width: m.width,
        height: m.height,
        alt: m.alt,
        credit: m.credit,
      }
    : undefined;
}

export async function postingName(id: string) {
  const [account] = await db.select({ name: user.name }).from(user).where(eq(user.id, id));
  return id === 'approved-content-import' || id === 'fixture-system'
    ? 'Redakcija Žileta'
    : account?.name || 'Redakcija Žileta';
}
