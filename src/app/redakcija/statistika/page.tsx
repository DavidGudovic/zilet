import Link from 'next/link';
import { editorSession } from '@/lib/editor-session';
import { analytics } from '@/lib/analytics';
import styles from './statistika.module.css';

const countryNames = new Intl.DisplayNames(['sr-Latn'], { type: 'region' });

function number(value: number) {
  return new Intl.NumberFormat('sr-Latn').format(value);
}

function duration(seconds: number) {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded} s`;
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return remaining ? `${minutes} min ${remaining} s` : `${minutes} min`;
}

function country(value: string) {
  try {
    return /^[A-Z]{2}$/.test(value) ? countryNames.of(value) || value : value;
  } catch {
    return value;
  }
}

function Breakdown({
  title,
  rows,
  rename = (value) => value,
}: {
  title: string;
  rows: { name: string; views: number }[];
  rename?: (value: string) => string;
}) {
  return (
    <section className={styles.breakdown} aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`}>{title}</h2>
      {rows.length ? (
        <ol>
          {rows.map((row) => (
            <li key={row.name}>
              <span>{rename(row.name)}</span>
              <strong>{number(row.views)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p>Još nema zabilježenih podataka.</p>
      )}
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ dani?: string }> }) {
  await editorSession();
  const days = (await searchParams).dani === '30' ? 30 : 7;
  const data = await analytics(days);
  return (
    <div className={styles.statistics}>
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
          <p className={styles.intro}>
            Pregled za posljednjih {days} dana. Brojevi se prikupljaju bez kolačića i služe za
            urednički uvid, a ne za prepoznavanje čitalaca.
          </p>
          <dl className={styles.summary}>
            <div>
              <dt>Prikazi</dt>
              <dd>{number(data.pageviews)}</dd>
            </div>
            <div>
              <dt>Posjetioci</dt>
              <dd>{number(data.visitors)}</dd>
            </div>
            <div>
              <dt>Posjete</dt>
              <dd>{number(data.visits)}</dd>
            </div>
            <div>
              <dt>Prosječno trajanje stranice</dt>
              <dd>
                {data.averagePageSeconds === undefined ? '—' : duration(data.averagePageSeconds)}
              </dd>
            </div>
          </dl>
          <section className={styles.reading} aria-labelledby="reading-heading">
            <div>
              <span className="eyebrow">Šta se čitalo</span>
              <h2 id="reading-heading">Najčitaniji tekstovi</h2>
            </div>
            {data.popular.length ? (
              <ol>
                {data.popular.map((row) => (
                  <li key={row.href}>
                    <Link href={row.href}>{row.name}</Link>
                    <strong>
                      {number(row.views)} prikaza ·{' '}
                      {row.averagePageSeconds === undefined
                        ? '— trajanje'
                        : `${duration(row.averagePageSeconds)} po stranici`}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>U ovom periodu još nema prikaza objavljenih tekstova.</p>
            )}
          </section>
          <div className={styles.breakdowns}>
            <Breakdown title="Izvori posjeta" rows={data.sources} />
            <Breakdown title="Zemlje" rows={data.countries} rename={country} />
            <Breakdown
              title="Uređaji"
              rows={data.devices}
              rename={(name) =>
                ({ mobile: 'Telefon', laptop: 'Računar', desktop: 'Računar', tablet: 'Tablet' })[
                  name as 'mobile' | 'laptop' | 'desktop' | 'tablet'
                ] || 'Drugi uređaj'
              }
            />
          </div>
          <p className={styles.note}>
            Prikaz znači da je stranica otvorena. Umami trajanje računa između zabilježenih prikaza;
            za jednu otvorenu stranicu može ostati nula. Ne potvrđuje da je tekst pročitan do kraja.
          </p>
        </>
      )}
    </div>
  );
}
