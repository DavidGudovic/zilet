import { Comments } from '@/components/comments';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPost, getRedirect } from '@/lib/data';
import { Article } from '@/components/article';
import { postMetadata, postStructuredData } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  return p ? postMetadata(p) : { title: 'Tekst nije pronađen', robots: { index: false } };
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
  const page = Math.max(1, Math.min(10000, Math.floor(Number((await searchParams).page)) || 1));
  const json = postStructuredData(p);
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
