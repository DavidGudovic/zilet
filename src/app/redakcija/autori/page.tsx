import { db } from '@/db';
import { authors } from '@/db/schema';
import { asc, desc } from 'drizzle-orm';
import { editorSession } from '@/lib/editor-session';
import { AuthorProfiles } from '@/components/author-profiles';
export default async function Page() {
  await editorSession();
  const list = await db.select().from(authors).orderBy(desc(authors.isEditor), asc(authors.name));
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Ljudi iza riječi</span>
          <h1>Autori i redakcija</h1>
        </div>
      </div>
      <p className="desk-intro">
        Ovdje uredite kratke biografije. Sačuvane izmjene odmah se vide na javnim stranicama
        urednika i objavljenih autora.
      </p>
      <AuthorProfiles authors={list} />
    </>
  );
}
