import type { Body } from './body-schema';
// Client components import this module, so it must not import zod; the schemas are in
// body-schema.ts.
export type { Body };
export const rubrics = [
  ['poezija', 'Poezija'],
  ['proza', 'Proza'],
  ['price', 'Proza'],
  ['eseji', 'Eseji'],
  ['novosti', 'Novosti'],
  ['zanimljivosti-o-poznatim-licnostima', 'Zanimljivosti o poznatim ličnostima'],
  ['zabava', 'Zabava'],
  ['slikarstvo', 'Slikarstvo'],
  ['muzika', 'Muzika'],
  ['film', 'Film'],
  ['citaoci', 'Radovi čitalaca'],
] as const;
export const rubricLabel = (key: string) => rubrics.find(([k]) => k === key)?.[1] || key;
export type RichMark = { type: 'bold' | 'italic' | 'link'; attrs?: { href: string } };
export type RichNode = {
  type: string;
  text?: string;
  attrs?: { level?: number; href?: string; start?: number };
  marks?: RichMark[];
  content?: RichNode[];
};
// Tiptap attaches presentation defaults to links/lists. Retain authored values only.
export function canonicalRichNode(node: RichNode): RichNode {
  const attrs =
    node.type === 'heading'
      ? { level: node.attrs?.level || 2 }
      : node.type === 'orderedList'
        ? { start: node.attrs?.start || 1 }
        : undefined;
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(attrs ? { attrs } : {}),
    ...(node.marks?.length
      ? {
          marks: node.marks.map((m) =>
            m.type === 'link'
              ? { type: m.type, attrs: { href: m.attrs?.href || '' } }
              : { type: m.type },
          ),
        }
      : {}),
    ...(node.content ? { content: node.content.map(canonicalRichNode) } : {}),
  };
}
export function bodyText(body: Body): string {
  if (body.kind === 'poem') return body.text;
  const walk = (n: RichNode): string =>
    n.type === 'text'
      ? n.text || ''
      : n.type === 'hardBreak'
        ? '\n'
        : (n.content || [])
            .map(walk)
            .join(
              ['doc', 'blockquote', 'bulletList', 'orderedList'].includes(n.type) ? '\n\n' : '',
            );
  return walk(body.doc);
}
// A short all-capital line inside the text (e.g. "PJESNIK POETSKIH MEDALjONA.") is a subtitle.
const isSubtitle = (text: string) => {
  const letters = text.match(/\p{L}/gu) || [];
  const capitals = text.match(/\p{Lu}/gu) || [];
  return text.length <= 120 && letters.length > 0 && capitals.length / letters.length >= 0.8;
};
// Teaser for listings when the editor wrote no intro: the opening paragraphs without
// subheadings, cut at a word boundary. Pages may clamp it further to a few lines.
export function excerpt(body: Body, length = 320): string {
  const blocks =
    body.kind === 'poem'
      ? body.text.split(/\n\s*\n/)
      : (body.doc.content || [])
          .filter((node) => node.type === 'paragraph' || node.type === 'blockquote')
          .map((node) => bodyText({ kind: 'prose', doc: node }));
  const paragraphs = blocks.map((block) => block.replace(/\s+/gu, ' ').trim()).filter(Boolean);
  let text = '';
  for (const paragraph of paragraphs) {
    if (isSubtitle(paragraph)) continue;
    text = text ? `${text} ${paragraph}` : paragraph;
    if (text.length >= length) break;
  }
  // A text written entirely in capitals still gets its opening words.
  text ||= paragraphs.join(' ');
  if (text.length <= length) return text;
  return `${text
    .slice(0, length)
    .replace(/\s+\S*$/u, '')
    .replace(/[\s,;:–—-]+$/u, '')}…`;
}
export function fold(s: string) {
  return s
    .toLowerCase()
    .replaceAll('đ', 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
// Browsers drop tabs and newlines and read "\" as "/", so "/\t/host" leaves the site.
export function safeReturn(s: unknown) {
  if (typeof s !== 'string' || !s.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(s)) return '/';
  const origin = 'https://zilet.invalid';
  try {
    return new URL(s, origin).origin === origin ? s : '/';
  } catch {
    return '/';
  }
}
// Next passes a repeated query parameter (?q=a&q=b) as an array; pages read its first value.
export type SearchParams<K extends string> = Promise<Partial<Record<K, string | string[]>>>;
export function firstParams<K extends string>(params: Partial<Record<K, string | string[]>>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Partial<Record<K, string>>;
}
export function safeHref(s: string) {
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : undefined;
}
export const dateLabel = (s: string | Date) =>
  new Intl.DateTimeFormat('sr-Latn-ME', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Podgorica',
  }).format(new Date(s));
export type Author = {
  isEditor?: boolean;
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  portraitId?: string | null;
};
export type MediaView = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  placement: 'above' | 'beside' | 'below';
  focalX: number;
  focalY: number;
};
export type PostView = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  postedBy?: string;
  editorialNote?: string;
  editorialNoteBy?: string;
  type: 'poem' | 'prose' | 'gallery';
  body: Body;
  rubrics: string[];
  author: Author;
  publishedAt: string;
  modifiedAt?: string;
  media: MediaView[];
  commentsOpen: boolean;
  version: number;
  demo?: boolean;
};

// Derivatives fit inside 640 × 640 and 1080 × 1080, so a portrait one is narrower than its bound.
// Each is listed only when it is smaller than the display picture.
export function mediaSrcSet(media: Pick<MediaView, 'url' | 'width' | 'height'>) {
  const longest = Math.max(media.width, media.height);
  const join = media.url.includes('?') ? '&' : '?';
  const smaller = (
    [
      ['small', 640],
      ['medium', 1080],
    ] as const
  )
    .filter(([, bound]) => longest > bound)
    .map(
      ([size, bound]) =>
        `${media.url}${join}size=${size} ${Math.max(1, Math.round((media.width * bound) / longest))}w`,
    );
  return smaller.length ? [...smaller, `${media.url} ${media.width}w`].join(', ') : undefined;
}

export const authorName = (name: string) => name.trim().toUpperCase();
