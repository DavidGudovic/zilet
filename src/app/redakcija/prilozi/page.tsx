import Link from 'next/link';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { editorSession } from '@/lib/editor-session';
import { dateLabel, rubricLabel } from '@/lib/content';
import { Pagination } from '@/components/archive';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await editorSession();
  const q = await searchParams;
  const status = ['accepted', 'rejected'].includes(q.status || '') ? q.status! : 'pending';
  const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page)) || 1));
  const where = eq(submissions.status, status);
  const items = await db
    .select()
    .from(submissions)
    .where(where)
    .orderBy(desc(submissions.createdAt))
    .limit(20)
    .offset((page - 1) * 20);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(submissions)
    .where(where);
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Čitaoci pišu Žiletu</span>
          <h1>Prilozi čitalaca</h1>
        </div>
      </div>
      <nav className="desk-tabs" aria-label="Status priloga">
        {[
          ['pending', 'Za pregled'],
          ['accepted', 'Prihvaćeni'],
          ['rejected', 'Nijesu izabrani'],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`?status=${value}#radni-prostor`}
            aria-current={status === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="desk-list">
        {items.map((s) => (
          <Link key={s.id} href={`/redakcija/prilozi/${s.id}#radni-prostor`}>
            <div>
              <span className="eyebrow">
                {rubricLabel(s.rubric)} ·{' '}
                {s.screening === 'manual' ? 'Ručna provjera' : 'Spremno za čitanje'}
              </span>
              <h2>{s.title}</h2>
              <p>{s.authorName}</p>
            </div>
            <span>{dateLabel(s.createdAt)} ↗</span>
          </Link>
        ))}
      </div>
      {!items.length && (
        <section className="desk-empty">
          <h2>Nema priloga u ovom pregledu.</h2>
          <p>Novi radovi čitalaca pojaviće se ovdje.</p>
        </section>
      )}
      <Pagination
        page={page}
        total={total}
        limit={20}
        path="/redakcija/prilozi"
        query={{ status }}
      />
    </>
  );
}
