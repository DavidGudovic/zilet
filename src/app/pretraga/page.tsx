import { findPosts } from '@/lib/data';
import { ArchiveList, Pagination } from '@/components/archive';
import { rubrics } from '@/lib/content';
export const metadata = { title: 'Pretraga', robots: { index: false, follow: true } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rubrika?: string; page?: string }>;
}) {
  const q = await searchParams;
  const term = (q.q || '').slice(0, 200);
  const result = term
    ? await findPosts({ q: term, rubric: q.rubrika, page: Number(q.page) || 1 })
    : null;
  return (
    <div className="wrap archive-page search-page">
      <header className="archive-heading">
        <span className="eyebrow">Žilet / Indeks</span>
        <h1>Pretraga</h1>
      </header>
      <form className="search-form" action="/pretraga">
        <label htmlFor="search">Naslov, autor ili riječi iz teksta</label>
        <div>
          <input
            id="search"
            name="q"
            defaultValue={term}
            maxLength={200}
            type="search"
            placeholder="Šta želite da čitate?"
          />
          <button className="button">Pretraži ↗</button>
        </div>
        <label className="search-rubric">
          Rubrika
          <select name="rubrika" defaultValue={q.rubrika || ''}>
            <option value="">Sve rubrike</option>
            {rubrics.map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </form>
      {result ? (
        result.total ? (
          <>
            <p className="results-label">Pronađeno: {result.total}</p>
            <ArchiveList items={result.items} />
            <Pagination
              {...result}
              path="/pretraga"
              query={{ q: term, rubrika: q.rubrika || '' }}
            />
          </>
        ) : (
          <section className="empty">
            <h2>Nema rezultata za „{term}”.</h2>
            <p>Pokušajte kraći naslov, prezime autora ili drugu riječ.</p>
          </section>
        )
      ) : (
        <p className="search-intro">
          Pretražite objavljene tekstove. Možete pisati i bez dijakritičkih znakova.
        </p>
      )}
    </div>
  );
}
