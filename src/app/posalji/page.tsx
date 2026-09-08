import { DeleteSubmissionButton } from '@/components/delete-submission-button';
import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/db';
import { posts, submissions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireUser } from '@/lib/security';
import { SubmissionForm } from '@/components/submission-form';
import { dateLabel } from '@/lib/content';
export const metadata = { title: 'Pošaljite svoj rad', robots: { index: false, follow: false } };
export default async function Page() {
  let u;
  try {
    u = await requireUser(await headers());
  } catch {}
  const facebook = process.env.FACEBOOK_URL;
  const facebookUrl =
    facebook && /^https:\/\/(www\.)?facebook\.com\//.test(facebook) ? facebook : undefined;
  const items = u
    ? await db
        .select({ submission: submissions, slug: posts.slug, postStatus: posts.status })
        .from(submissions)
        .leftJoin(posts, eq(submissions.postId, posts.id))
        .where(eq(submissions.userId, u.id))
        .orderBy(desc(submissions.createdAt))
        .limit(50)
    : [];
  return (
    <div className="wrap submission-page">
      <header className="archive-heading">
        <span className="eyebrow">Otvorena stranica Žileta</span>
        <h1>Pošaljite svoj rad</h1>
        <p>
          Pjesma, priča, esej ili umjetnički rad — redakcija čita svaki prilog. Izabrane radove
          objavljujemo u rubrici <Link href="/rubrika/citaoci">Radovi čitalaca</Link>, uz uredničku
          bilješku.
        </p>
      </header>
      {u ? (
        <>
          <p className="hint">
            Potpis: <strong>{u.name}</strong>. <Link href="/nalog">Promijenite ime u nalogu ↗</Link>
          </p>
          <SubmissionForm facebookUrl={facebookUrl} screening={Boolean(process.env.INTEL_KEY)} />
          <section className="submission-history">
            <h2>Vaši prilozi</h2>
            {!items.length && <p>Ovdje ćete pratiti odgovor redakcije.</p>}
            {items.map(({ submission: s, slug, postStatus }) => (
              <article key={s.id}>
                <span className="eyebrow">
                  {s.status === 'pending'
                    ? 'Na pregledu'
                    : s.status === 'rejected'
                      ? 'Nije izabrano'
                      : postStatus === 'published'
                        ? 'Objavljeno'
                        : 'Prihvaćeno — u pripremi'}
                </span>
                <h3>{s.title}</h3>
                <p className="hint">{dateLabel(s.createdAt)}</p>
                {s.status !== 'accepted' && (
                  <DeleteSubmissionButton id={s.id} version={s.version} />
                )}
                {s.reviewNote && <p>{s.reviewNote}</p>}
                {postStatus === 'published' && slug && (
                  <Link href={`/tekst/${slug}`}>Pročitajte objavljeni rad ↗</Link>
                )}
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="account-panel">
          <h2>Prijavite se da pošaljete rad</h2>
          <p>Potreban je nalog sa potvrđenom adresom e-pošte.</p>
          <div className="account-links">
            <Link className="button" href="/nalog?returnTo=/posalji">
              Prijavi se
            </Link>
            <Link href="/nalog?mode=register&returnTo=/posalji">Otvori nalog ↗</Link>
          </div>
        </section>
      )}
    </div>
  );
}
