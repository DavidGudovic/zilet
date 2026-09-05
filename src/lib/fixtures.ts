import poem from '../../fixtures/poem.json';
import criticism from '../../fixtures/criticism.json';
import { type PostView, type RichNode } from './content';
const author = { id: 'zoran-djurovic', slug: 'zoran-djurovic', name: 'Zoran Đurović', bio: null };
export const demoPosts: PostView[] = [
  {
    id: 'sample-criticism',
    slug: 'sta-je-prava-poezija',
    title: criticism.title,
    intro: '',
    type: 'prose',
    body: {
      kind: 'prose',
      doc: {
        type: 'doc',
        content: criticism.text
          .split('\n\n')
          .map((text) =>
            text === 'ŠTA JE LAŽNA POEZIJA?'
              ? { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] }
              : { type: 'paragraph', content: [{ type: 'text', text }] },
          ) as RichNode[],
      },
    },
    rubrics: ['knjizevna-kritika'],
    author,
    publishedAt: '2026-09-05T12:00:00Z',
    media: [
      {
        id: 'development-art',
        url: '/dev-art',
        width: 900,
        height: 797,
        alt: 'Sunčeva svjetlost ulazi kroz prozor u tihu sobu.',
        caption: 'Strandgade, Sunshine, oko 1906. Razvojna ilustracija.',
        credit: 'Vilhelm Hammershøi · Cleveland Museum of Art · CC0',
        placement: 'below',
        focalX: 50,
        focalY: 50,
      },
    ],
    commentsOpen: true,
    version: 1,
    demo: true,
  },
  {
    id: 'sample-poem',
    slug: 'posle-30-godina-je-sretoh',
    title: poem.title,
    intro: '',
    type: 'poem',
    body: { kind: 'poem', text: poem.text, emphasis: [], align: 'left' },
    rubrics: ['poezija'],
    author,
    publishedAt: '2026-09-05T12:00:00Z',
    media: [],
    commentsOpen: true,
    version: 1,
    demo: true,
  },
];
