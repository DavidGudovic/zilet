import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { Editor } from '@/components/editor';
export default async function Page() {
  await editorSession();
  return <Editor authors={await db.select().from(authors).orderBy(asc(authors.name))} />;
}
