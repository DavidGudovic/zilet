import Link from 'next/link';
import { getFrontPage } from '@/lib/data';
import { InkLines } from '@/components/ink-lines';
import { bodyText, rubricLabel, mediaSrcSet } from '@/lib/content';
export const metadata = { alternates: { canonical: '/' } };
export const dynamic = 'force-dynamic';
export default async function Home() {
  const { posts, choices: placements } = await getFrontPage();
  const placed = (slot: string) =>
    posts.find((p) => p.id === placements.find((x) => x.slot === slot)?.postId);
  const lead = placed('lead') || posts.find((p) => p.type === 'prose') || posts[0];
  const poem =
    (placed('poem')?.id !== lead?.id && placed('poem')) ||
    posts.find((p) => p.type === 'poem' && p.id !== lead?.id);
  const art =
    posts.find((p) => p.id === placed('art')?.id && p.id !== lead?.id && p.id !== poem?.id) ||
    posts.find((p) => p.type === 'gallery' && p.id !== lead?.id && p.id !== poem?.id);
  const rest = posts.filter((p) => ![lead?.id, poem?.id, art?.id].includes(p.id));
  const poetryGroup = rest.length >= 4 ? rest.filter((p) => p.type === 'poem').slice(0, 3) : [];
  const proseGroup = rest.length >= 4 ? rest.filter((p) => p.type === 'prose').slice(0, 3) : [];
  const recent = rest
    .filter((p) => ![...poetryGroup, ...proseGroup].some((x) => x.id === p.id))
    .slice(0, 8);
  return (
    <div className="wrap homepage">
      <div className="section-rule">
        <span>U fokusu</span>
        <span>Žilet / izbor tekstova</span>
      </div>
      {lead ? (
        <div className="front-spread">
          <article className="lead-story">
            <Link href={`/rubrika/${lead.rubrics[0]}`} className="eyebrow">
              {rubricLabel(lead.rubrics[0])}
            </Link>
            <h1>
              <Link href={`/tekst/${lead.slug}`}>{lead.title}</Link>
            </h1>
            <p className="lead-byline">{lead.author.name}</p>
            <p className="lead-excerpt">
              {lead.intro ||
                bodyText(lead.body).split('\n\n')[0].split('. ').slice(0, 2).join('. ') + '.'}
            </p>
            <Link className="read-link" href={`/tekst/${lead.slug}`}>
              Pročitajte tekst <span aria-hidden="true">↗</span>
            </Link>
            {lead.media[0] ? (
              <figure className="front-art">
                <img
                  src={lead.media[0].url}
                  srcSet={mediaSrcSet(lead.media[0])}
                  sizes="(max-width: 767px) 100vw, 65vw"
                  decoding="async"
                  width={lead.media[0].width}
                  height={lead.media[0].height}
                  alt={lead.media[0].alt}
                />
                <figcaption>
                  {lead.media[0].caption} · {lead.media[0].credit}
                </figcaption>
              </figure>
            ) : null}
          </article>
          {poem && (
            <article className="poem-selection">
              <div className="poem-label">
                <Link href="/rubrika/poezija" className="eyebrow">
                  Poezija
                </Link>
                <span aria-hidden="true">↓</span>
              </div>
              <h2>
                <Link href={`/tekst/${poem.slug}`}>{poem.title}</Link>
              </h2>
              <p className="lead-byline">{poem.author.name}</p>
              <div className="poem-excerpt">
                {bodyText(poem.body).split('\n\n').slice(0, 8).join('\n\n')}
              </div>
              <Link className="read-link" href={`/tekst/${poem.slug}`}>
                Pročitajte pjesmu <span aria-hidden="true">↗</span>
              </Link>
              <div className="poetry-index">
                <span className="eyebrow">Iz rubrike</span>
                <Link href="/rubrika/poezija">
                  Sva poezija <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          )}
        </div>
      ) : (
        <section className="empty">
          <h1>Žilet</h1>
          <p>Prvi tekstovi su u pripremi.</p>
          <Link href="/o-casopisu">O časopisu ↗</Link>
        </section>
      )}
      {art && (
        <section className="front-art-feature">
          <div className="section-rule">
            <h2>Umjetnost</h2>
            <Link href="/rubrika/umjetnost">Svi radovi ↗</Link>
          </div>
          <div>
            {art.media[0] && (
              <figure>
                <Link href={`/tekst/${art.slug}`}>
                  <img
                    src={art.media[0].url}
                    srcSet={mediaSrcSet(art.media[0])}
                    sizes="(max-width: 767px) 100vw, 65vw"
                    decoding="async"
                    width={art.media[0].width}
                    height={art.media[0].height}
                    alt={art.media[0].alt}
                    loading="lazy"
                  />
                </Link>
                <figcaption>
                  {art.media[0].caption}
                  <span>{art.media[0].credit}</span>
                </figcaption>
              </figure>
            )}
            <article>
              <span className="eyebrow">{rubricLabel(art.rubrics[0])}</span>
              <h2>
                <Link href={`/tekst/${art.slug}`}>{art.title}</Link>
              </h2>
              <p>{art.author.name}</p>
              {art.intro && <p className="intro">{art.intro}</p>}
              <Link className="read-link" href={`/tekst/${art.slug}`}>
                Otvori djelo ↗
              </Link>
            </article>
          </div>
        </section>
      )}
      {(poetryGroup.length > 0 || proseGroup.length > 0) && (
        <section className="reading-groups">
          {poetryGroup.length > 0 && (
            <div>
              <div className="section-rule">
                <h2>Poezija</h2>
                <Link href="/rubrika/poezija">Sve pjesme ↗</Link>
              </div>
              {poetryGroup.map((p) => (
                <article className="group-poem" key={p.id}>
                  <h3>
                    <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p className="group-byline">{p.author.name}</p>
                  <p className="group-verse">
                    {bodyText(p.body).split('\n\n').slice(0, 2).join('\n\n')}
                  </p>
                </article>
              ))}
            </div>
          )}
          {proseGroup.length > 0 && (
            <div>
              <div className="section-rule">
                <h2>Proza i kritika</h2>
                <Link href="/rubrika/proza">Proza ↗</Link>
              </div>
              {proseGroup.map((p) => (
                <article className="group-prose" key={p.id}>
                  <span className="eyebrow">{rubricLabel(p.rubrics[0])}</span>
                  <h3>
                    <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p className="group-byline">{p.author.name}</p>
                  {p.intro && <p className="group-intro">{p.intro}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {recent.length > 0 && (
        <section className="recent-section">
          <div className="section-rule">
            <h2>Još za čitanje</h2>
          </div>
          {recent.map((p) => (
            <article className="index-row" key={p.id}>
              <span className="eyebrow">{rubricLabel(p.rubrics[0])}</span>
              <h3>
                <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
              </h3>
              <span>{p.author.name}</span>
            </article>
          ))}
        </section>
      )}
      <div className="browse-strip">
        <InkLines className="browse-lines" />
        <p>Rubrike</p>
        <div>
          {[
            ['poezija', 'Poezija'],
            ['proza', 'Proza'],
            ['knjizevna-kritika', 'Književna kritika'],
            ['umjetnost', 'Umjetnost'],
            ['citaoci', 'Radovi čitalaca'],
          ].map(([slug, label]) => (
            <Link key={slug} href={`/rubrika/${slug}`}>
              {label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
