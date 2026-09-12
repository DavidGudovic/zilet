import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  descriptionText,
  pageMetadata,
  postMetadata,
  postStructuredData,
  siteUrl,
} from '../src/lib/seo';
import { demoPosts } from '../src/lib/fixtures';

test('search snippets collapse whitespace without changing canonical verse', () => {
  const text = '  Śuma\n\nriječi\tna papiru.\u200b';
  assert.equal(descriptionText(text), 'Śuma riječi na papiru.\u200b');
  const long = 'Jedna riječ '.repeat(30);
  assert.ok(descriptionText(long).length <= 160);
  assert.ok(descriptionText(long).endsWith('…'));
  assert.equal(descriptionText('', 'Rezervni opis'), 'Rezervni opis');
});

test('article search and sharing metadata use the public author, image and revision date', () => {
  const post = {
    ...demoPosts[0],
    intro: 'Uvod za pretraživače i dijeljenje.',
    modifiedAt: '2026-09-12T12:00:00.000Z',
  };
  const metadata = postMetadata(post);
  assert.equal(metadata.description, post.intro);
  assert.equal(metadata.alternates?.canonical, `/tekst/${post.slug}`);
  assert.equal(metadata.openGraph?.description, post.intro);
  assert.equal(metadata.twitter?.description, post.intro);
  assert.equal(metadata.openGraph?.url, `/tekst/${post.slug}`);
  assert.equal((metadata.openGraph as { modifiedTime: string }).modifiedTime, post.modifiedAt);
  const json = postStructuredData(post);
  assert.equal(json.author.url, siteUrl(`/autor/${post.author.slug}`));
  assert.equal(json.dateModified, post.modifiedAt);
  assert.equal(json.mainEntityOfPage, siteUrl(`/tekst/${post.slug}`));
  assert.ok(json.image.every((image) => /^https?:\/\//.test(image)));
  assert.equal(post.body, demoPosts[0].body);
});

test('author and archive previews identify the exact page, including pagination', () => {
  const metadata = pageMetadata(
    'Poezija — stranica 2',
    'Objavljene pjesme.',
    '/rubrika/poezija?page=2',
  );
  assert.equal(metadata.openGraph?.title, 'Poezija — stranica 2');
  assert.equal(metadata.twitter?.title, 'Poezija — stranica 2');
  assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
});
