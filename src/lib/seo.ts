import type { Metadata } from 'next';
import { bodyText, rubricLabel, type PostView } from './content';

export const siteDescription = 'Poezija, proza, književna kritika i umjetnost. Čitajte Žilet.';
export const socialImage = '/identity/social-preview.png';

export function siteUrl(path = '/') {
  return new URL(path, process.env.APP_URL || 'http://localhost:3000').toString();
}

// Collapse whitespace for search snippets only; the authored body stays untouched.
export function descriptionText(text: string, fallback = siteDescription) {
  const clean = text.replace(/\s+/gu, ' ').trim() || fallback;
  if (clean.length <= 160) return clean;
  const start = clean.slice(0, 157);
  const space = start.lastIndexOf(' ');
  return `${space > 100 ? start.slice(0, space) : start}…`;
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const summary = descriptionText(description);
  return {
    title,
    description: summary,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'Žilet',
      title,
      description: summary,
      url: path,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: 'Žilet — književnost, umjetnost i kultura',
        },
      ],
    },
    twitter: { card: 'summary_large_image', title, description: summary, images: [socialImage] },
  };
}

export function postMetadata(post: PostView): Metadata {
  const description = descriptionText(post.intro || bodyText(post.body));
  const metadata = pageMetadata(post.title, description, `/tekst/${post.slug}`);
  const image = post.media[0];
  return {
    ...metadata,
    authors: [{ name: post.author.name, url: siteUrl(`/autor/${post.author.slug}`) }],
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      authors: [siteUrl(`/autor/${post.author.slug}`)],
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt || post.publishedAt,
      section: rubricLabel(post.rubrics[0]),
      ...(image
        ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] }
        : {}),
    },
    twitter: { ...metadata.twitter, images: [image?.url || socialImage] },
  };
}

export function postStructuredData(post: PostView) {
  const url = siteUrl(`/tekst/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': post.type === 'poem' ? 'CreativeWork' : 'Article',
    '@id': url,
    headline: post.title,
    description: descriptionText(post.intro || bodyText(post.body)),
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: siteUrl(`/autor/${post.author.slug}`),
    },
    publisher: { '@type': 'Organization', name: 'Žilet', url: siteUrl() },
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt || post.publishedAt,
    image: post.media.length ? post.media.map((item) => siteUrl(item.url)) : [siteUrl(socialImage)],
    url,
    mainEntityOfPage: url,
    inLanguage: 'cnr-Latn',
    ...(post.type !== 'poem' ? { articleSection: post.rubrics.map(rubricLabel) } : {}),
  };
}
