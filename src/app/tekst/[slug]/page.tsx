import { Comments } from '@/components/comments';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPost, getRedirect } from '@/lib/data';
import { Article } from '@/components/article';
import { bodyText } from '@/lib/content';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  return p
    ? {
        title: p.title,
        description: bodyText(p.body).slice(0, 160),
        alternates: { canonical: `/tekst/${p.slug}` },
        openGraph: {
          title: p.title,
          type: 'article',
          authors: [p.author.name],
          publishedTime: p.publishedAt,
          images: [p.media[0]?.url || '/identity/social-preview.png'],
        },
        twitter: {
          card: 'summary_large_image',
          title: p.title,
          images: [p.media[0]?.url || '/identity/social-preview.png'],
        },
      }
    : { title: 'Tekst nije pronađen' };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) {
    const moved = await getRedirect(slug);
    if (moved) permanentRedirect(`/tekst/${moved}`);
    notFound();
  }
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1));
  const json = {
    '@context': 'https://schema.org',
    '@type': p.type === 'poem' ? 'CreativeWork' : 'Article',
    headline: p.title,
    author: { '@type': 'Person', name: p.author.name },
    datePublished: p.publishedAt,
    url: `${process.env.APP_URL}/tekst/${p.slug}`,
    inLanguage: 'cnr-Latn',
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
      />
      <Article post={p}>
        <Comments post={p} page={page} />
      </Article>
    </>
  );
}
