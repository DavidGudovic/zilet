import Link from 'next/link';
import { dateLabel, rubricLabel, type PostView } from '@/lib/content';
import { Poem, RichText, Artwork, Share } from './reading';
export function Article({
  post,
  preview = false,
  children,
}: {
  post: PostView;
  preview?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <article
        className={`article wrap ${post.type === 'poem' ? 'poem-article' : 'prose-article'}`}
      >
        {preview && <p className="notice">Privatni pregled — ove izmjene još nijesu objavljene.</p>}
        <header className="article-heading">
          <Link className="eyebrow" href={`/rubrika/${post.rubrics[0]}`}>
            {rubricLabel(post.rubrics[0])}
          </Link>
          <h1>{post.title}</h1>
          {post.intro && <p className="intro">{post.intro}</p>}
        </header>
        <div className="article-grid">
          <aside className="article-rail">
            <Link className="byline" href={`/autor/${post.author.slug}`}>
              {post.author.name}
            </Link>
            <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
            <div className="rail-actions">
              <Share />
              <a href="#komentari">Komentari ↓</a>
            </div>
            {post.demo && (
              <p className="demo-note">
                Razvojni primjer
                <br />
                Iz dostavljenog materijala
              </p>
            )}
          </aside>
          <div className="reading-column">
            <Artwork items={post.media.filter((m) => m.placement === 'above')} />
            {post.body.kind === 'poem' ? (
              <div
                className={post.media.some((m) => m.placement === 'beside') ? 'poem-with-art' : ''}
              >
                <Poem body={post.body} />
                <Artwork items={post.media.filter((m) => m.placement === 'beside')} />
              </div>
            ) : (
              <div className="prose">
                <RichText node={post.body.doc} />
              </div>
            )}
            <Artwork
              items={post.media.filter(
                (m) =>
                  m.placement === 'below' || (post.type !== 'poem' && m.placement === 'beside'),
              )}
            />
            {post.type !== 'poem' && (
              <span className="endmark" aria-hidden="true">
                ▪
              </span>
            )}
            <div className="article-colophon">
              <span>{post.author.name}</span>
              <Link href={`/autor/${post.author.slug}`}>Svi tekstovi autora ↗</Link>
            </div>
            {children || (
              <section className="comments" id="komentari">
                <h2>Komentari</h2>
                <p>Još nema komentara.</p>
                <Link href={`/nalog?returnTo=/tekst/${post.slug}%23komentari`}>
                  Prijavite se da ostavite komentar ↗
                </Link>
              </section>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
