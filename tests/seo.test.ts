import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorName } from '../src/lib/content';
import { description, pageMetadata, siteDescription } from '../src/lib/seo';
import { revisionSchema } from '../src/lib/publishing';
import { submissionSchema } from '../src/lib/submission-content';
import { demoPosts } from '../src/lib/fixtures';

test('uppercase author names retain Latin diacritics and Cyrillic', () => {
  assert.equal(authorName('  Željko Đurić čćš śź  '), 'ŽELJKO ĐURIĆ ČĆŠ ŚŹ');
  assert.equal(authorName('Милена'), 'МИЛЕНА');
});

test('SEO descriptions flatten verse whitespace and fit a snippet without changing the source', () => {
  assert.equal(description('  Prvi stih\n\nDrugi\tstih  '), 'Prvi stih Drugi stih');
  assert.equal(description('   '), siteDescription);
  const text = description('Duga pjesma '.repeat(40));
  assert.ok(text.length <= 160);
  assert.ok(text.endsWith('…'));
  const meta = pageMetadata('Poezija', 'Pjesme u Žiletu.', '/rubrika/poezija?page=2');
  assert.equal(meta.alternates?.canonical, '/rubrika/poezija?page=2');
  assert.equal(meta.openGraph?.title, 'Poezija — Žilet');
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
