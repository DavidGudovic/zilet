import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { authors, media, revisions, submissions } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { PhotoLibrary } from '@/components/photo-library';
import { Pagination } from '@/components/archive';
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await editorSession();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1));
  const limit = 24;
  const items = await db
    .select({
      id: media.id,
      filename: media.filename,
      width: media.width,
      height: media.height,
      inUse: sql<boolean>`
        exists (select 1 from ${revisions} where ${revisions.content}->'media' @> jsonb_build_array(jsonb_build_object('id', ${media.id})))
        or exists (select 1 from ${authors} where ${authors.portraitId} = ${media.id})
        or exists (select 1 from ${submissions} where ${submissions.mediaId} = ${media.id})
      `,
    })
    .from(media)
    .orderBy(desc(media.createdAt))
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
