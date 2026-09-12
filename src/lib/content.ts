import { z } from 'zod';
export const rubrics = [
  ['poezija', 'Poezija'],
  ['proza', 'Proza'],
  ['price', 'Proza'],
  ['eseji', 'Eseji'],
  ['knjizevna-kritika', 'Književna kritika'],
  ['novosti', 'Novosti'],
  ['zanimljivosti-o-poznatim-licnostima', 'Zanimljivosti o poznatim ličnostima'],
  ['zabava', 'Zabava'],
  ['slikarstvo', 'Slikarstvo'],
  ['muzika', 'Muzika'],
  ['film', 'Film'],
  ['citaoci', 'Radovi čitalaca'],
] as const;
export const rubricLabel = (key: string) => rubrics.find(([k]) => k === key)?.[1] || key;
const markSchema = z
  .object({
    type: z.enum(['bold', 'italic', 'link']),
    attrs: z.object({ href: z.string().max(2000) }).optional(),
  })
  .strict();
export type RichNode = {
  type: string;
  text?: string;
  attrs?: { level?: number; href?: string; start?: number };
  marks?: z.infer<typeof markSchema>[];
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
const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        'doc',
        'paragraph',
        'text',
        'heading',
        'blockquote',
        'hardBreak',
        'bulletList',
        'orderedList',
        'listItem',
      ]),
      text: z.string().optional(),
      attrs: z
        .object({
          level: z.number().int().min(2).max(3).optional(),
          href: z.string().optional(),
          start: z.number().int().min(1).max(1000000).optional(),
        })
        .strict()
        .optional(),
      marks: z.array(markSchema).max(10).optional(),
      content: z.array(nodeSchema).max(2000).optional(),
    })
    .strict(),
);
export const bodySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('poem'),
      text: z.string().max(100000),
      align: z.enum(['left', 'center']),
      emphasis: z
        .array(
          z.object({
            from: z.number().int().min(0),
            to: z.number().int().min(1),
            style: z.enum(['italic', 'bold']),
          }),
        )
        .max(500),
    })
    .superRefine((v, c) => {
      for (const m of v.emphasis)
        if (m.to > v.text.length || m.from >= m.to)
          c.addIssue({ code: 'custom', message: 'Neispravan opseg naglašavanja.' });
    }),
  z.object({ kind: z.literal('prose'), doc: nodeSchema }),
  z.object({ kind: z.literal('gallery'), doc: nodeSchema }),
]);
export type Body = z.infer<typeof bodySchema>;
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
export function fold(s: string) {
  return s
    .toLowerCase()
    .replaceAll('đ', 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
export function safeReturn(s: unknown) {
  return typeof s === 'string' &&
    s.startsWith('/') &&
    !s.startsWith('//') &&
    !s.includes('\\') &&
    !/[\r\n]/.test(s)
    ? s
    : '/';
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

// Derivatives fit inside 640 × 640; a portrait thumbnail is narrower than 640 px.
export function mediaSrcSet(media: Pick<MediaView, 'url' | 'width' | 'height'>) {
  const longest = Math.max(media.width, media.height);
  if (longest <= 640) return undefined;
  const smallWidth = Math.max(1, Math.round((media.width * 640) / longest));
  return `${media.url}${media.url.includes('?') ? '&' : '?'}size=small ${smallWidth}w, ${media.url} ${media.width}w`;
}
