import { Link } from '@/components/link';
import { getFrontPage } from '@/lib/data';
import { Arrow } from '@/components/arrow';
import { InkLines } from '@/components/ink-lines';
import { bodyText, excerpt, rubricLabel, mediaSrcSet } from '@/lib/content';
import { pageMetadata, siteTitle, siteDescription, absoluteUrl, publisherEntity } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(siteTitle, siteDescription, '/');
export const dynamic = 'force-dynamic';
// Picture widths as the page styles lay them out; the art feature splits into columns at 651 px.
const leadSizes =
  '(max-width: 767px) calc(100vw - 36px), (max-width: 1280px) 54vw, (max-width: 1599px) 690px, 737px';
const featureSizes =
  '(max-width: 650px) calc(100vw - 36px), (max-width: 1280px) 54vw, (max-width: 1599px) 690px, 737px';
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
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@graph': [
            publisherEntity(),
            {
              '@type': 'WebSite',
              '@id': absoluteUrl('/#sajt'),
              name: 'Žilet',
              alternateName: 'Zilet',
              url: absoluteUrl('/'),
              description: siteDescription,
              publisher: { '@id': absoluteUrl('/#izdavac') },
              inLanguage: 'cnr-Latn',
            },
          ],
        }}
      />
      <div className="section-rule">
        <p>U fokusu</p>
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
            <p className="lead-byline">
              <Link href={`/autor/${lead.author.slug}`}>{lead.author.name}</Link>
            </p>
            <p className="lead-excerpt">{lead.intro || excerpt(lead.body)}</p>
            <Link className="read-link" href={`/tekst/${lead.slug}`}>
              Pročitajte tekst{' '}
              <span aria-hidden="true">
                <Arrow />
              </span>
            </Link>
            {lead.media[0] ? (
              <figure className="front-art">
                <img
                  src={lead.media[0].url}
                  srcSet={mediaSrcSet(lead.media[0])}
                  sizes={leadSizes}
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
              <Link href="/rubrika/poezija" className="eyebrow">
                Poezija
              </Link>
              <h2>
                <Link href={`/tekst/${poem.slug}`}>{poem.title}</Link>
              </h2>
              <p className="lead-byline">
                <Link href={`/autor/${poem.author.slug}`}>{poem.author.name}</Link>
              </p>
              <div className="poem-excerpt">
                {bodyText(poem.body).split('\n\n').slice(0, 8).join('\n\n')}
              </div>
              <Link className="read-link" href={`/tekst/${poem.slug}`}>
                Pročitajte pjesmu{' '}
                <span aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
            </article>
          )}
        </div>
      ) : (
        <section className="empty">
          <h1>Žilet</h1>
          <p>Prvi tekstovi su u pripremi.</p>
          <Link href="/o-casopisu">
            O časopisu <Arrow />
          </Link>
        </section>
      )}
      {art && (
        <section className="front-art-feature">
          <div className="section-rule">
            <h2>Umjetnost</h2>
            <Link href="/rubrika/umjetnost">
              Svi radovi <Arrow />
            </Link>
          </div>
          <div>
            {art.media[0] && (
              <figure>
                <Link href={`/tekst/${art.slug}`}>
                  <img
                    src={art.media[0].url}
                    srcSet={mediaSrcSet(art.media[0])}
                    sizes={featureSizes}
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
              <Link href={`/rubrika/${art.rubrics[0]}`} className="eyebrow">
                {rubricLabel(art.rubrics[0])}
              </Link>
              <h2>
                <Link href={`/tekst/${art.slug}`}>{art.title}</Link>
              </h2>
              <p className="lead-byline">
                <Link href={`/autor/${art.author.slug}`}>{art.author.name}</Link>
              </p>
              {art.intro && <p className="intro">{art.intro}</p>}
              <Link className="read-link" href={`/tekst/${art.slug}`}>
                Otvori djelo{' '}
                <span aria-hidden="true">
                  <Arrow />
                </span>
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
                <Link href="/rubrika/poezija">
                  Sve pjesme <Arrow />
                </Link>
              </div>
              {poetryGroup.map((p) => (
                <article className="group-poem" key={p.id}>
                  <h3>
                    <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p className="group-byline">
                    <Link href={`/autor/${p.author.slug}`}>{p.author.name}</Link>
                  </p>
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
                <h2>Proza i eseji</h2>
                <Link href="/rubrika/proza">
                  Proza <Arrow />
                </Link>
              </div>
              {proseGroup.map((p) => {
                const teaser = p.intro || excerpt(p.body);
                return (
                  <article className="group-prose" key={p.id}>
                    <Link href={`/rubrika/${p.rubrics[0]}`} className="eyebrow">
                      {rubricLabel(p.rubrics[0])}
                    </Link>
                    <h3>
                      <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
                    </h3>
                    <p className="group-byline">
                      <Link href={`/autor/${p.author.slug}`}>{p.author.name}</Link>
                    </p>
                    {teaser && <p className="group-intro">{teaser}</p>}
                  </article>
                );
              })}
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
              <Link href={`/rubrika/${p.rubrics[0]}`} className="eyebrow">
                {rubricLabel(p.rubrics[0])}
              </Link>
              <h3>
                <Link href={`/tekst/${p.slug}`}>{p.title}</Link>
              </h3>
              <span className="index-byline">
                <Link href={`/autor/${p.author.slug}`}>{p.author.name}</Link>
              </span>
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
            ['eseji', 'Eseji'],
            ['umjetnost', 'Umjetnost'],
            ['citaoci', 'Radovi čitalaca'],
            ['zanimljivosti-o-poznatim-licnostima', 'Zanimljivosti o poznatim ličnostima'],
          ].map(([slug, label]) => (
            <Link key={slug} href={`/rubrika/${slug}`}>
              {label}
              <span aria-hidden="true">
                <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
