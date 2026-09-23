import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorName } from '../src/lib/content';
import {
  description,
  pageMetadata,
  siteDescription,
  articleMetadata,
  articleStructuredData,
  articleSummary,
  absoluteUrl,
  authorEntity,
  breadcrumbData,
  jsonLd,
  rubricSeoTitle,
  rubricTitle,
} from '../src/lib/seo';
import { revisionSchema } from '../src/lib/publishing';
import { submissionSchema } from '../src/lib/submission-content';
import { demoPosts } from '../src/lib/fixtures';

test('uppercase author names retain Latin diacritics and Cyrillic', () => {
  assert.equal(authorName('  Željko Đurić čćš śź  '), 'ŽELJKO ĐURIĆ ČĆŠ ŚŹ');
  assert.equal(authorName('Милена'), 'МИЛЕНА');
});

test('descriptive browser titles preserve visible labels and authored title formatting', () => {
  assert.equal(rubricTitle('poezija'), 'Poezija');
  assert.equal(rubricSeoTitle('poezija'), 'Poezija: pjesme i stihovi autora');
  const post = { ...demoPosts[0], title: 'Šta je poezija\n\na šta nije\u200B' };
  const meta = articleMetadata(post);
  assert.equal(meta.title, `Šta je poezija a šta nije | ${post.author.name}`);
  // og:site_name already names the magazine; the <title> template adds "| Žilet" itself.
  assert.equal(meta.openGraph?.title, meta.title);
  assert.equal(meta.twitter?.title, meta.openGraph?.title);
  assert.equal((meta.openGraph as { locale: string }).locale, 'sr_ME');
  assert.equal(post.title, 'Šta je poezija\n\na šta nije\u200B');
});

test('SEO descriptions flatten verse whitespace and fit a snippet without changing the source', () => {
  assert.equal(description('  Prvi stih\n\nDrugi\tstih  '), 'Prvi stih Drugi stih');
  assert.equal(description('   '), siteDescription);
  const text = description('Duga pjesma '.repeat(40));
  assert.ok(text.length <= 160);
  assert.ok(text.endsWith('…'));
  const meta = pageMetadata('Poezija', 'Pjesme u Žiletu.', '/rubrika/poezija?page=2');
  assert.equal(meta.alternates?.canonical, '/rubrika/poezija?page=2');
  assert.equal(meta.openGraph?.title, 'Poezija');
  assert.equal(meta.twitter?.description, meta.description);
});

test('retired criticism cannot be selected in publishing or reader submissions', () => {
  const post = demoPosts[0];
  const content = {
    title: post.title,
    intro: post.intro,
    authorId: post.author.id,
    type: post.type,
    body: post.body,
    rubrics: post.rubrics,
    media: [],
    commentsOpen: true,
  };
  assert.ok(revisionSchema.safeParse(content).success);
  assert.equal(
    revisionSchema.safeParse({ ...content, rubrics: ['knjizevna-kritika'] }).success,
    false,
  );
  assert.equal(
    submissionSchema.safeParse({
      title: 'Rad',
      text: 'Tekst',
      rubric: 'knjizevna-kritika',
      consent: 'yes',
      alt: '',
      credit: '',
    }).success,
    false,
  );
});

test('publication SEO uses the work author, public dates and media without changing the work', () => {
  const post = {
    ...demoPosts[0],
    intro: 'Uvod za čitaoce.',
    modifiedAt: '2026-09-17T12:00:00.000Z',
  };
  const metadata = articleMetadata(post);
  assert.equal(metadata.title, `${post.title} | ${post.author.name}`);
  assert.equal(metadata.description, 'Uvod za čitaoce.');
  assert.equal(metadata.twitter?.description, metadata.description);
  assert.equal((metadata.openGraph as { modifiedTime: string }).modifiedTime, post.modifiedAt);
  const schema = articleStructuredData(post);
  assert.equal(schema.author.url, absoluteUrl(`/autor/${post.author.slug}`));
  assert.equal(schema.dateModified, post.modifiedAt);
  assert.equal(schema.datePublished, post.publishedAt);
  assert.equal(schema.mainEntityOfPage, absoluteUrl(`/tekst/${post.slug}`));
  assert.ok(schema.image.every((url) => /^https?:\/\//.test(url)));
  assert.equal(schema.image.at(-1), absoluteUrl(`/media/${post.media[0].id}/share.jpg`));
  assert.equal(post.body, demoPosts[0].body);
  const withoutImage = articleStructuredData({ ...post, media: [] });
  assert.deepEqual(withoutImage.image, [absoluteUrl('/identity/social-preview.png')]);
  for (const name of ['REDAKCIJA', 'Redakcija Žileta', 'INTERNET IZVORI', 'izvori'])
    assert.equal(authorEntity({ ...post.author, name })['@type'], 'Organization', name);
  for (const name of ['IZVORINA MARKOVIĆ', 'Redakcijanović', post.author.name])
    assert.equal(authorEntity({ ...post.author, name })['@type'], 'Person', name);
});

test('snippets quote verse with slashes and drop list glyphs and the repeated byline', () => {
  const poem = demoPosts[1];
  const verse = {
    ...poem,
    body: { ...poem.body, text: '□ Prvi stih\ndrugi stih\n\n— treći stih' },
  };
  assert.equal(articleSummary(verse as typeof poem), 'Prvi stih / drugi stih / — treći stih');
  const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const aphorisms = {
    ...demoPosts[0],
    body: {
      kind: 'prose' as const,
      doc: { type: 'doc', content: [paragraph('● Prva misao.'), paragraph('■ Druga - misao.')] },
    },
  };
  assert.equal(articleSummary(aphorisms), 'Prva misao. Druga - misao.');
  assert.equal(
    articleSummary({ ...verse, intro: 'Uvod\nu dva reda.' } as typeof poem),
    'Uvod u dva reda.',
  );
  const long = articleSummary({
    ...poem,
    body: { ...poem.body, text: 'riječ riječ\n'.repeat(40) },
  } as typeof poem);
  assert.ok(long.length <= 160 && long.endsWith('riječ…'), long);
});

test('structured data text is single-line and safe inside a script tag', () => {
  const post = { ...demoPosts[0], title: 'Razgovor sa \nMešom Selimovićem\u200B' };
  const article = JSON.parse(jsonLd(articleStructuredData(post)));
  assert.equal(article.headline, 'Razgovor sa Mešom Selimovićem');
  const crumbs = JSON.parse(
    jsonLd(breadcrumbData([{ name: 'Šta je prava poezija\na šta nije', path: '/tekst/x' }])),
  );
  assert.equal(crumbs.itemListElement[0].name, 'Šta je prava poezija a šta nije');
  assert.ok(!jsonLd({ name: '</script><b>' }).includes('<'));
});

test('shared links preview the work’s first picture as a landscape JPEG', () => {
  const picture = {
    id: '8fceffc9-f6ca-4f02-9599-0ddafe034d9a',
    url: '/media/8fceffc9-f6ca-4f02-9599-0ddafe034d9a',
    width: 823,
    height: 621,
    alt: 'Plakat festivala',
    caption: '',
    credit: 'Arhiva',
    placement: 'above' as const,
    focalX: 50,
    focalY: 50,
  };
  const metadata = articleMetadata({ ...demoPosts[0], media: [picture, { ...picture, id: 'x' }] });
  const images = (metadata.openGraph as { images: { url: string; type: string }[] }).images;
  assert.deepEqual(images, [
    {
      url: absoluteUrl(`/media/${picture.id}/share.jpg`),
      width: 1200,
      height: 630,
      type: 'image/jpeg',
      alt: 'Plakat festivala',
    },
  ]);
  assert.deepEqual((metadata.twitter as { images: unknown }).images, images);
  const fallback = articleMetadata({ ...demoPosts[0], media: [] });
  assert.equal(
    (fallback.openGraph as { images: { url: string }[] }).images[0].url,
    absoluteUrl('/identity/social-preview.png'),
  );
});
