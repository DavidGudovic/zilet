import Link from 'next/link';
import { editorSession } from '@/lib/editor-session';
import { analytics } from '@/lib/analytics';
export default async function Page({ searchParams }: { searchParams: Promise<{ dani?: string }> }) {
  await editorSession();
  const days = (await searchParams).dani === '30' ? 30 : 7;
  const data = await analytics(days);
  return (
    <>
      <div className="desk-title">
        <div>
          <span className="eyebrow">Posjete časopisu</span>
          <h1>Statistika</h1>
        </div>
      </div>
      <nav className="desk-tabs" aria-label="Period statistike">
        <Link href="?dani=7" aria-current={days === 7 ? 'page' : undefined}>
          Posljednjih 7 dana
        </Link>
        <Link href="?dani=30" aria-current={days === 30 ? 'page' : undefined}>
          Posljednjih 30 dana
        </Link>
      </nav>
      {!data.available ? (
        <section className="desk-empty">
          <span className="analytics-symbol" aria-hidden="true">
            —
          </span>
          <h2>Bez podataka za prikaz</h2>
          <p>{data.message}</p>
        </section>
      ) : (
        <>
          <div className="stat-totals">
            <div>
              <span>Prikazi</span>
              <strong>{data.pageviews}</strong>
            </div>
            <div>
              <span>Posjetioci (procjena)</span>
              <strong>{data.visitors}</strong>
            </div>
          </div>
          <p className="hint">Otvaranje stranice ne znači da je tekst pročitan do kraja.</p>
          <h2>Najčitaniji tekstovi</h2>
          <p className="hint">Poredak prema broju prikaza.</p>
          <table>
            <thead>
              <tr>
                <th>Tekst</th>
                <th>Prikazi</th>
              </tr>
            </thead>
            <tbody>
              {data.popular.map((r, i) => (
                <tr key={i}>
                  <td>{r.title}</td>
                  <td>{r.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Odakle dolaze posjete</h2>
          <table>
            <thead>
              <tr>
                <th>Izvor</th>
                <th>Prikazi</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
