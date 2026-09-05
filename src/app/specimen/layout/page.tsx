import { notFound } from 'next/navigation';
import { Article } from '@/components/article';
import type { PostView } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Razvojne provjere preloma',
  robots: { index: false, follow: false },
};
export default async function Page({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const kind = (await searchParams).case || 'gallery';
  const post: PostView = {
    id: 'layout-fixture',
    slug: 'razvojni-primjer',
    title:
      kind === 'short'
        ? 'Śuma'
        : kind === 'long'
          ? 'Razvojni primjer veoma dugog naslova: o čitanju, tišini i trajanju riječi u prostoru između dvije stranice, s posebnim osvrtom na Ž, Ś i Ź'
          : 'Razvojni primjer galerije',
    intro: 'Isključivo razvojna provjera preloma. Ovo nije objavljeni prilog.',
    author: {
      id: 'demo-author',
      slug: 'demo-author',
      name: 'Razvojni autor sa veoma dugim imenom i prezimenom za provjeru preloma',
      bio: null,
    },
    type: kind === 'gallery' ? 'gallery' : 'poem',
    body:
      kind === 'gallery'
        ? {
            kind: 'gallery',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Dva cjelovita djela različitih proporcija. Slike nijesu portreti saradnika časopisa.',
                    },
                  ],
                },
              ],
            },
          }
        : {
            kind: 'poem',
            text: '  Śuma\n\nTišina.\n\n  Један кратак развојни примјер.',
            align: 'left',
            emphasis: [{ from: 2, to: 6, style: 'italic' }],
          },
    rubrics: [kind === 'gallery' ? 'slikarstvo' : 'poezija'],
    publishedAt: '2026-09-05T12:00:00Z',
    media:
      kind === 'short'
        ? []
        : [
            {
              id: 'dev-portrait',
              url: '/dev-art?kind=portrait',
              width: 738,
              height: 900,
              alt: 'Portret žene u tamnoj odjeći s bijelim okovratnikom.',
              caption: 'Portrait of a Woman · Razvojni primjer',
              credit: 'Rembrandt van Rijn i atelje · Cleveland Museum of Art · CC0',
              placement: kind === 'long' ? 'beside' : 'below',
              focalX: 50,
              focalY: 50,
            },
            {
              id: 'dev-landscape',
              url: '/dev-art',
              width: 900,
              height: 797,
              alt: 'Sunčeva svjetlost na podu sobe.',
              caption: 'Strandgade, Sunshine · Razvojni primjer',
              credit: 'Vilhelm Hammershøi · Cleveland Museum of Art · CC0',
              placement: 'below',
              focalX: 50,
              focalY: 50,
            },
          ],
    commentsOpen: false,
    version: 0,
  };
  return (
    <Article post={post}>
      <p className="hint">Razvojni primjer — komentari nijesu dostupni.</p>
    </Article>
  );
}
