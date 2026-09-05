import { readFileSync } from 'node:fs';
import { notFound } from 'next/navigation';
import poem from '../../../fixtures/poem.json';
export const metadata = { robots: { index: false, follow: false } };
export default function Specimen() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="wrap specimen">
      <style>{readFileSync('fixtures/literata.css', 'utf8')}</style>
      <h1>Tipografske i identitetske studije</h1>
      <div className="specimen-grid">
        {['Source Serif 4 Variable', 'Literata Variable'].map((font) => (
          <section key={font} style={{ fontFamily: `'${font}',serif` }}>
            <p className="eyebrow">{font} + Source Sans 3</p>
            <h2>ŠTA JE PRAVA POEZIJA</h2>
            <h3>{poem.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{poem.text.slice(0, 400)}</p>
            <p>
              <i>Ž ž Č č Ć ć Š š Đ đ Ś ś Ź ź — Ž Ś Ź</i>
            </p>
            <p>Пјесма остаје у свом изворном писму.</p>
            <p className="meta">Zoran Đurović · Književna kritika · 5. septembar 2026.</p>
          </section>
        ))}
      </div>
      <div className="specimen-grid">
        {['a', 'b'].map((s) => (
          <section key={s}>
            <h2>Studija {s.toUpperCase()}</h2>
            <img src={`/identity/study-${s}.svg`} width="380" height="168" alt={`Studija ${s}`} />
          </section>
        ))}
      </div>
      <p>Monogram / 16, 24, 32 px</p>
      {[16, 24, 32].map((n) => (
        <img
          key={n}
          src="/icon.svg"
          width={n}
          height={n}
          alt={`Ž na ${n} px`}
          style={{ marginRight: 24 }}
        />
      ))}
      <img src="/identity/avatar.svg" width="120" height="120" alt="Kružni avatar" />
    </div>
  );
}
