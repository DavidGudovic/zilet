import { SubmissionConversation } from '@/components/submission-conversation';
import { DeleteSubmissionButton } from '@/components/delete-submission-button';
import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/db';
import { posts, submissions, submissionMessages, user } from '@/db/schema';
import { eq, desc, asc, inArray, and } from 'drizzle-orm';
import { requireUser } from '@/lib/security';
import { SubmissionForm } from '@/components/submission-form';
import { dateLabel } from '@/lib/content';
export const metadata = { title: 'Pošaljite svoj rad', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ prilog?: string }>;
}) {
  const { prilog } = await searchParams;
  const returnTo = prilog
    ? `/posalji?prilog=${encodeURIComponent(prilog)}#prilog-${encodeURIComponent(prilog)}`
    : '/posalji';
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
        .where(and(eq(submissions.userId, u.id), prilog ? eq(submissions.id, prilog) : undefined))
        .orderBy(desc(submissions.createdAt))
        .limit(50)
    : [];
  const messages = items.length
    ? await db
        .select({
          submissionId: submissionMessages.submissionId,
          id: submissionMessages.id,
          body: submissionMessages.body,
          kind: submissionMessages.kind,
          deliveryStatus: submissionMessages.deliveryStatus,
          createdAt: submissionMessages.createdAt,
          sender: user.name,
        })
        .from(submissionMessages)
        .innerJoin(user, eq(submissionMessages.actorId, user.id))
        .where(
          inArray(
            submissionMessages.submissionId,
            items.map(({ submission }) => submission.id),
          ),
        )
        .orderBy(asc(submissionMessages.createdAt), asc(submissionMessages.id))
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
            <h2>{prilog ? 'Vaš prilog' : 'Vaši prilozi'}</h2>
            {prilog && <Link href="/posalji">← Svi vaši prilozi</Link>}
            {!items.length && <p>Ovdje ćete pratiti odgovor redakcije.</p>}
            {items.map(({ submission: s, slug, postStatus }) => (
              <article key={s.id} id={`prilog-${s.id}`}>
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
                {s.reviewNote &&
                  !messages.some((m) => m.submissionId === s.id && m.kind === 'rejected') && (
                    <p>{s.reviewNote}</p>
                  )}
                <SubmissionConversation
                  id={s.id}
                  version={s.version}
                  pending={s.status === 'pending'}
                  messages={messages
                    .filter((m) => m.submissionId === s.id)
                    .map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
                />
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
            <Link className="button" href={`/nalog?returnTo=${encodeURIComponent(returnTo)}`}>
              Prijavi se
            </Link>
            <Link href={`/nalog?mode=register&returnTo=${encodeURIComponent(returnTo)}`}>
              Otvori nalog ↗
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
