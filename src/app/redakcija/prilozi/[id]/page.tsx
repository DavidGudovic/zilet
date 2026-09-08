import { DeleteSubmissionButton } from '@/components/delete-submission-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { media, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { editorSession } from '@/lib/editor-session';
import { dateLabel, rubricLabel } from '@/lib/content';
import { SubmissionReview } from '@/components/submission-review';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await editorSession();
  const [s] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, (await params).id));
  if (!s) notFound();
  const [photo] = s.mediaId ? await db.select().from(media).where(eq(media.id, s.mediaId)) : [];
  return (
    <article className="submission-review">
      <Link href="/redakcija/prilozi#radni-prostor">← Prilozi čitalaca</Link>
      <header className="archive-heading">
        <span className="eyebrow">
          {rubricLabel(s.rubric)} · {dateLabel(s.createdAt)}
        </span>
        <h1>{s.title}</h1>
        <p>{s.authorName}</p>
      </header>
      {s.screening === 'manual' && <p className="notice">{s.screeningReason}</p>}
      <div className="submitted-text">{s.text}</div>
      {photo && (
        <figure className="submission-photo">
          <a href={`/media/${photo.id}`} target="_blank" rel="noopener noreferrer">
            <img
              src={`/media/${photo.id}`}
              width={photo.width}
              height={photo.height}
              alt={photo.alt}
            />
          </a>
          <figcaption>{photo.credit}</figcaption>
        </figure>
      )}
      {s.status === 'pending' ? (
        <SubmissionReview id={s.id} version={s.version} />
      ) : (
        <section className="notice">
          <p>{s.status === 'accepted' ? 'Prilog je prihvaćen.' : 'Prilog nije izabran.'}</p>
          {s.reviewNote && <p>{s.reviewNote}</p>}
          {s.postId && (
            <Link href={`/redakcija/tekst/${s.postId}#radni-prostor`}>Otvori nacrt / objavu ↗</Link>
          )}
        </section>
      )}
      {(s.status !== 'accepted' || !s.postId) && (
        <DeleteSubmissionButton
          id={s.id}
          version={s.version}
          returnTo="/redakcija/prilozi#radni-prostor"
        />
      )}
    </article>
  );
}
