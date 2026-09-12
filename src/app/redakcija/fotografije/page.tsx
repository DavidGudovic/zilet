import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { authors, media, revisions, submissions } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { PhotoLibrary } from '@/components/photo-library';
import { Pagination } from '@/components/archive';
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await editorSession();
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page)) || 1));
  const limit = 24;
  // Keep the outer ID qualified inside subqueries: Drizzle strips direct column
  // qualifiers in single-table SELECT fields.
  const outerMediaId = sql`${media.id}`;
  const items = await db
    .select({
      id: media.id,
      filename: media.filename,
      width: media.width,
      height: media.height,
      postId: sql<string | null>`(
        select ${revisions.postId} from ${revisions}
        where ${revisions.content}->'media' @> jsonb_build_array(jsonb_build_object('id', ${outerMediaId}))
        order by ${revisions.createdAt} desc limit 1
      )`,
      inUse: sql<boolean>`
        exists (select 1 from ${revisions} where ${revisions.content}->'media' @> jsonb_build_array(jsonb_build_object('id', ${outerMediaId})))
        or exists (select 1 from ${authors} where ${authors.portraitId} = ${outerMediaId})
        or exists (select 1 from ${submissions} where ${submissions.mediaId} = ${outerMediaId})
      `,
    })
    .from(media)
    .orderBy(desc(media.createdAt), desc(media.id))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(media);
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Biblioteka</span>
          <h1>Fotografije</h1>
        </div>
      </div>
      <PhotoLibrary items={items} />
      <Pagination page={page} total={total} limit={limit} path="/redakcija/fotografije" />
    </>
  );
}
