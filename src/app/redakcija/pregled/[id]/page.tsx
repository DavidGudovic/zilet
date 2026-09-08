import Link from 'next/link';
import { editorSession } from '@/lib/editor-session';
import { db } from '@/db';
import { posts, revisions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { viewPost } from '@/lib/data';
import { Article } from '@/components/article';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await editorSession();
  const { id } = await params;
  const [row] = await db
    .select({ post: posts, content: revisions.content, editorialNoteBy: revisions.editorialNoteBy })
    .from(posts)
    .innerJoin(revisions, eq(posts.draftRevisionId, revisions.id))
    .where(eq(posts.id, id));
  if (!row) notFound();
  return (
    <div className="private-preview">
      <Link className="button secondary" href={`/redakcija/tekst/${id}#radni-prostor`}>
        ← Nazad na uređivanje
      </Link>
      <Article post={await viewPost(row.post, row.content, row.editorialNoteBy)} preview>
        <p className="notice">Komentarisanje nije dostupno u privatnom pregledu.</p>
      </Article>
    </div>
  );
}
