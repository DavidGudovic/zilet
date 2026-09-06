import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { authors, posts, revisions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { postingName } from '@/lib/data';
import { Editor } from '@/components/editor';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await editorSession();
  const { id } = await params;
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  if (!p) notFound();
  const [r] = await db.select().from(revisions).where(eq(revisions.id, p.draftRevisionId!));
  if (!r) notFound();
  return (
    <Editor
      initial={r.content}
      postedBy={await postingName(p.createdBy)}
      post={{ id: p.id, version: p.version, slug: p.slug, status: p.status }}
      authors={await db.select().from(authors).orderBy(asc(authors.name))}
    />
  );
}
