import Link from 'next/link';
import { getAuthors } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Autori' };
export default async function Page() {
  const authors = await getAuthors();
  return (
    <div className="wrap archive-page">
      <header className="archive-heading">
        <span className="eyebrow">Žilet / Indeks</span>
        <h1>Autori</h1>
      </header>
      <div className="author-index">
        {authors.length ? (
          authors.map((a) => (
            <Link key={a.id} href={`/autor/${a.slug}`}>
              {a.name}
              <span>→</span>
            </Link>
          ))
        ) : (
          <p>Autorski indeks je u pripremi.</p>
        )}
      </div>
    </div>
  );
}
