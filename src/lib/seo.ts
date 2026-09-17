import type { Metadata } from 'next';
import { bodyText, rubricLabel, type Author, type PostView } from './content';

export const siteTitle = 'Žilet | poezija, književnost, umjetnost i kultura';
export const siteDescription =
  'Poezija, proza, eseji i književna kritika. Žilet je časopis za književnost, umjetnost i kulturu, otvoren autorima i čitaocima širom regiona.';
export const siteUrl = () => new URL(process.env.APP_URL || 'https://zilet.me').origin;
export const absoluteUrl = (path: string) => new URL(path, siteUrl()).href;
export function description(text: string, fallback = siteDescription) {
  const clean =
    text
      .replace(/[\u200B-\u200D\uFEFF]/gu, '')
      .replace(/\s+/gu, ' ')
      .trim() || fallback;
  if (clean.length <= 160) return clean;
  return `${clean
    .slice(0, 157)
    .replace(/\s+\S*$/, '')
    .trimEnd()}…`;
}
export function pageMetadata(title: string, summary: string, path: string): Metadata {
  const cleanTitle = title
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .replace(/—/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
  const fullTitle = cleanTitle === siteTitle ? cleanTitle : `${cleanTitle} | Žilet`;
  const text = description(summary);
  return {
    title: cleanTitle === siteTitle ? { absolute: cleanTitle } : cleanTitle,
    description: text,
    alternates: { canonical: path },
    robots: {
      index: true,
      follow: true,
      googleBot: { 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    openGraph: {
      type: 'website',
      siteName: 'Žilet',
      title: fullTitle,
      description: text,
      url: path,
      images: [
        {
          url: '/identity/social-preview.png',
          width: 1200,
          height: 630,
          alt: 'Žilet | književnost, umjetnost i kultura',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: text,
      images: ['/identity/social-preview.png'],
    },
  };
}

export const rubricDescriptions: Record<string, string> = {
  poezija:
    'Poezija u Žiletu: pjesme, stihovi i različiti pjesnički glasovi. Čitajte objavljene radove i upoznajte njihove autore.',
  proza:
    'Proza u Žiletu: priče, pripovijedanje i književni zapisi. Otkrijte autorske glasove i njihove objavljene tekstove.',
  eseji:
    'Eseji i književna kritika u Žiletu: čitanja poezije i proze, osvrti na djela i promišljanja o književnosti, umjetnosti i kulturi.',
  'zanimljivosti-o-poznatim-licnostima':
    'Zanimljivosti o poznatim ličnostima: život, stvaralaštvo i priče o ljudima koji su obilježili književnost, umjetnost i kulturu.',
  novosti:
    'Novosti iz književnosti, umjetnosti i kulture. Pratite nove priloge i objave u časopisu Žilet.',
  zabava: 'Zabava u Žiletu: kraće forme i vedrija strana književnosti i kulture.',
  umjetnost:
    'Umjetnost u Žiletu: slikarstvo, muzika i film. Otkrijte umjetnička djela, njihove stvaraoce i tekstove o kulturi.',
  slikarstvo: 'Slikarstvo u Žiletu: slikarska djela, umjetnici i prilozi o vizuelnoj umjetnosti.',
  muzika:
    'Muzika u Žiletu: muzičko stvaralaštvo, autori i razmišljanja o muzici kao dijelu kulture.',
  film: 'Film u Žiletu: filmska umjetnost, osvrti i tekstovi o pokretnim slikama i njihovim stvaraocima.',
  citaoci:
    'Radovi čitalaca Žileta: izabrane pjesme, proza i drugi prilozi, objavljeni uz potpis autora i bilješku urednika.',
};
export const rubricTitle = (slug: string) =>
  slug === 'eseji'
    ? 'Eseji i književna kritika'
    : slug === 'umjetnost'
      ? 'Umjetnost'
      : rubricLabel(slug);

// Browser/search titles provide context without lengthening visible rubric headings.
const rubricSeoTitles: Record<string, string> = {
  poezija: 'Poezija: pjesme i stihovi autora',
  proza: 'Proza: priče i pripovijedanje',
  eseji: 'Eseji i književna kritika: osvrti na djela',
  novosti: 'Novosti iz književnosti, umjetnosti i kulture',
  'zanimljivosti-o-poznatim-licnostima': 'Poznate ličnosti: život i stvaralaštvo',
  zabava: 'Zabava: kratke forme i književne zanimljivosti',
  umjetnost: 'Umjetnost: slikarstvo, muzika i film',
  slikarstvo: 'Slikarstvo: slike, slikari i umjetnička djela',
  muzika: 'Muzika: muzičari, djela i osvrti',
  film: 'Film: filmska umjetnost i osvrti',
  citaoci: 'Radovi čitalaca: pjesme, proza i prilozi',
};
export const rubricSeoTitle = (slug: string) => rubricSeoTitles[slug] || rubricTitle(slug);

export const authorEntity = (author: Author) => ({
  '@type': /^(redakcija(?: žileta)?|izvori)$/iu.test(author.name.trim())
    ? 'Organization'
    : 'Person',
  '@id': absoluteUrl(`/autor/${author.slug}#autor`),
  name: author.name,
  url: absoluteUrl(`/autor/${author.slug}`),
});
export const publisherEntity = () => ({
  '@type': 'Organization',
  '@id': absoluteUrl('/#izdavac'),
  name: 'Žilet',
  alternateName: 'Zilet',
  url: absoluteUrl('/'),
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/identity/wordmark-generated.webp'),
    width: 1881,
    height: 836,
  },
});
export function articleSummary(post: PostView) {
  return description(`${post.author.name}: ${post.intro.trim() || bodyText(post.body)}`);
}
export function articleMetadata(post: PostView): Metadata {
  const metadata = pageMetadata(
    `${post.title} | ${post.author.name}`,
    articleSummary(post),
    `/tekst/${post.slug}`,
  );
  const images = post.media.length
    ? post.media
        .slice(0, 3)
        .map((m) => ({ url: m.url, width: m.width, height: m.height, alt: m.alt }))
    : [{ url: '/identity/social-preview.png', width: 1200, height: 630, alt: 'Žilet' }];
  return {
    ...metadata,
    authors: [{ name: post.author.name, url: absoluteUrl(`/autor/${post.author.slug}`) }],
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      authors: [absoluteUrl(`/autor/${post.author.slug}`)],
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt || post.publishedAt,
      section: post.rubrics.map(rubricLabel).join(', '),
      images,
    },
    twitter: { ...metadata.twitter, card: 'summary_large_image', images },
  };
}
export function articleStructuredData(post: PostView) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': absoluteUrl(`/tekst/${post.slug}#djelo`),
    headline: post.title,
    author: authorEntity(post.author),
    description: articleSummary(post),
    image: post.media.length
      ? post.media.map((m) => absoluteUrl(m.url))
      : [absoluteUrl('/identity/social-preview.png')],
    publisher: publisherEntity(),
    mainEntityOfPage: absoluteUrl(`/tekst/${post.slug}`),
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt || post.publishedAt,
    articleSection: post.rubrics.map(rubricLabel),
    url: absoluteUrl(`/tekst/${post.slug}`),
    inLanguage: 'cnr-Latn',
  };
}
export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
