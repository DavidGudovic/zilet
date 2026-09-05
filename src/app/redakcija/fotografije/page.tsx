import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { media } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { PhotoLibrary } from '@/components/photo-library';
export default async function Page() {
  await editorSession();
  const items = await db
    .select({ id: media.id, filename: media.filename, width: media.width, height: media.height })
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(100);
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Biblioteka</span>
          <h1>Fotografije</h1>
        </div>
      </div>
      <PhotoLibrary items={items} />
    </>
  );
}
