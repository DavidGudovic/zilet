import { cache } from 'react';
import { db } from '@/db';
import { authors, posts, revisions, media, placements, redirects, user } from '@/db/schema';
import { and, eq, ne, desc, asc, sql as dsql, ilike, inArray, type SQL } from 'drizzle-orm';
import { demoPosts } from './fixtures';
import { fold, type PostView } from './content';
import type { RevisionContent } from '@/db/schema';
export const isDemo = () =>
  process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
// What pages show of a post; search_text repeats the whole text, so it is not read.
const postColumns = {
  id: posts.id,
  slug: posts.slug,
  createdBy: posts.createdBy,
  createdAt: posts.createdAt,
  publishedAt: posts.publishedAt,
  publishedUpdatedAt: posts.publishedUpdatedAt,
  version: posts.version,
};
type PostRow = {
  post: Pick<typeof posts.$inferSelect, keyof typeof postColumns>;
  content: RevisionContent;
  editorialNoteBy?: string | null;
};
const publishedRows = (where: SQL | undefined) =>
  db
    .select({
      post: postColumns,
      content: revisions.content,
      editorialNoteBy: revisions.editorialNoteBy,
    })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(where);
async function viewPosts(rows: PostRow[]): Promise<PostView[]> {
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.map((r) => r.content.authorId))];
  const accountIds = [
    ...new Set(
      rows.flatMap((r) => [r.post.createdBy, ...(r.editorialNoteBy ? [r.editorialNoteBy] : [])]),
    ),
  ];
  const mediaIds = [...new Set(rows.flatMap((r) => r.content.media.map((m) => m.id)))];
  const [names, accounts, images] = await Promise.all([
    db.select().from(authors).where(inArray(authors.id, authorIds)),
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, accountIds)),
    mediaIds.length
      ? db
          .select({ id: media.id, width: media.width, height: media.height })
          .from(media)
          .where(inArray(media.id, mediaIds))
      : [],
  ]);
  const authorMap = new Map(names.map((a) => [a.id, a]));
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const imageMap = new Map(images.map((m) => [m.id, m]));
  const name = (id: string) =>
    ['approved-content-import', 'fixture-system'].includes(id)
      ? 'Redakcija Žileta'
      : accountMap.get(id) || 'Redakcija Žileta';
  return rows.map(({ post, content, editorialNoteBy }) => ({
    id: post.id,
    slug: post.slug,
    title: content.title,
    intro: content.intro,
    postedBy: name(post.createdBy),
    editorialNote: content.editorialNote,
    editorialNoteBy: editorialNoteBy ? name(editorialNoteBy) : undefined,
    type: content.type,
    body: content.body,
    rubrics: content.rubrics,
    author: authorMap.get(content.authorId)!,
    publishedAt: (post.publishedAt || post.createdAt).toISOString(),
    modifiedAt: (post.publishedUpdatedAt || post.publishedAt || post.createdAt).toISOString(),
    media: content.media.flatMap((ref) => {
      const m = imageMap.get(ref.id);
      return m ? [{ ...ref, url: `/media/${m.id}`, width: m.width, height: m.height }] : [];
    }),
    commentsOpen: content.commentsOpen,
    version: post.version,
    demo: post.id.startsWith('sample-'),
  }));
}
export async function viewPost(
  post: typeof posts.$inferSelect,
  content: RevisionContent,
  editorialNoteBy?: string | null,
): Promise<PostView> {
  return (await viewPosts([{ post, content, editorialNoteBy }]))[0];
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
  const [[{ total }], items] = await Promise.all([
    db
      .select({ total: dsql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
      .where(where),
    publishedRows(where)
      .orderBy(sort === 'oldest' ? asc(posts.publishedAt) : desc(posts.publishedAt), asc(posts.id))
      .limit(limit)
      .offset((page - 1) * limit)
      .then(viewPosts),
  ]);
  return { items, total, page, limit };
}
// Rubrics with at least one published text; "umjetnost" gathers painting, music and film.
export async function publishedRubrics() {
  const keys = isDemo()
    ? demoPosts.flatMap((p) => p.rubrics)
    : (
        await db
          .selectDistinct({
            rubric: dsql<string>`jsonb_array_elements_text(${revisions.content}->'rubrics')`,
          })
          .from(posts)
          .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
          .where(eq(posts.status, 'published'))
      ).map((row) => row.rubric);
  const used = new Set(keys.map((key) => (key === 'price' ? 'proza' : key)));
  if (['slikarstvo', 'muzika', 'film'].some((key) => used.has(key))) used.add('umjetnost');
  return used;
}
// The 24 newest texts, then placed texts older than those. The front page needs no total, and
// the placed texts are read alongside the newest instead of after them.
export async function getFrontPage() {
  if (isDemo()) return { posts: (await findPosts({ limit: 24 })).items, choices: [] };
  const published = eq(posts.status, 'published');
  const placed = db.select({ id: placements.postId }).from(placements);
  const [recent, selected, choices] = await Promise.all([
    publishedRows(published).orderBy(desc(posts.publishedAt), asc(posts.id)).limit(24),
    publishedRows(and(published, inArray(posts.id, placed))),
    getPlacements(),
  ]);
  const older = selected.filter((r) => !recent.some((p) => p.post.id === r.post.id));
  return { posts: await viewPosts([...recent, ...older]), choices };
}
export const getPost = cache(async (slug: string) => {
  if (isDemo()) return demoPosts.find((p) => p.slug === slug);
  const [row] = await publishedRows(and(eq(posts.slug, slug), eq(posts.status, 'published')));
  return row ? (await viewPosts([row]))[0] : undefined;
});
// "Još od autora" shows only titles, so it fetches no whole texts.
export async function moreByAuthor(authorId: string, exceptId: string, limit = 3) {
  if (isDemo())
    return demoPosts
      .filter((p) => p.author.id === authorId && p.id !== exceptId)
      .slice(0, limit)
      .map(({ id, slug, title }) => ({ id, slug, title }));
  return db
    .select({ id: posts.id, slug: posts.slug, title: dsql<string>`${revisions.content}->>'title'` })
    .from(posts)
    .innerJoin(revisions, eq(posts.publishedRevisionId, revisions.id))
    .where(
      and(
        eq(posts.status, 'published'),
        dsql`${revisions.content}->>'authorId' = ${authorId}`,
        ne(posts.id, exceptId),
      ),
    )
    .orderBy(desc(posts.publishedAt), asc(posts.id))
    .limit(limit);
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
export const getAuthors = cache(async () => {
  if (isDemo()) return [demoPosts[0].author];
  return db
    .select()
    .from(authors)
    .where(
      dsql`${authors.isEditor} or exists (select 1 from ${posts} inner join ${revisions} on ${posts.publishedRevisionId} = ${revisions.id} where ${posts.status} = 'published' and ${revisions.content}->>'authorId' = ${authors.id})`,
    )
    .orderBy(asc(authors.name));
});
export async function getPlacements() {
  if (isDemo()) return [];
  return db.select().from(placements);
}
// Cached for the request: an author page reads it for its metadata and for its body.
export const getPortrait = cache(async (id?: string | null) => {
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
});

export async function postingName(id: string) {
  const [account] = await db.select({ name: user.name }).from(user).where(eq(user.id, id));
  return id === 'approved-content-import' || id === 'fixture-system'
    ? 'Redakcija Žileta'
    : account?.name || 'Redakcija Žileta';
}
