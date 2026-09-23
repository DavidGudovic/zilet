import { test } from 'node:test';
import assert from 'node:assert/strict';
import poem from '../fixtures/poem.json';
import {
  bodySchema,
  bodyText,
  excerpt,
  firstParams,
  fold,
  mediaSrcSet,
  safeReturn,
  type Body,
} from '../src/lib/content';
test('poetry preserves supplied zero-width characters, blank lines and final authored line', () => {
  const body = bodySchema.parse({ kind: 'poem', text: poem.text, emphasis: [], align: 'left' });
  assert.equal(bodyText(JSON.parse(JSON.stringify(body))), poem.text);
  assert.ok(poem.text.includes('rana, besprizorni'));
  assert.equal(poem.text.split('\n').filter(Boolean).length, 15);
});
test('whitespace and emphasis survive serialization without changing canonical text', () => {
  const text = '  Śuma\tŹora\n\n\nжена\n   kraj  ';
  const body = bodySchema.parse({
    kind: 'poem',
    text,
    align: 'left',
    emphasis: [{ from: 2, to: 6, style: 'italic' }],
  });
  assert.equal(bodyText(JSON.parse(JSON.stringify(body))), text);
  assert.throws(() =>
    bodySchema.parse({ ...body, emphasis: [{ from: 0, to: 999, style: 'italic' }] }),
  );
});
test('search folds diacritics without changing display text', () =>
  assert.equal(fold('Žilet Đurović Ś Ź'), 'zilet djurovic s z'));
test('account return paths stay on this site', () => {
  for (const unsafe of [
    '//evil.test',
    '/\\evil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    '/\r\n/evil.test',
    '\t/tekst',
    '/tekst\u0000',
    '/tekst\u007f',
    'https://evil.test/',
    'tekst/pjesma',
    '',
    undefined,
    ['/tekst/pjesma'],
  ])
    assert.equal(safeReturn(unsafe), '/', JSON.stringify(unsafe));
  for (const path of [
    '/',
    '/tekst/pjesma',
    '/tekst/pjesma#komentari',
    '/posalji?prilog=abc#prilog-abc',
    '/pretraga?q=%C5%BEilet&rubrika=poezija',
    '/tekst/a?next=//evil.test',
    // Percent-encoded tab stays a literal path segment on this site.
    '/%09/evil.test',
  ]) {
    assert.equal(safeReturn(path), path);
    assert.equal(new URL(path, 'https://zilet.me').origin, 'https://zilet.me');
  }
});
test('a repeated query parameter is read as its first value', () =>
  assert.deepEqual(firstParams({ q: ['a', 'b'], page: '2', rubrika: undefined }), {
    q: 'a',
    page: '2',
    rubrika: undefined,
  }));
const prose = (...blocks: [string, string][]): Body => ({
  kind: 'prose',
  doc: {
    type: 'doc',
    content: blocks.map(([type, text]) =>
      type === 'heading'
        ? { type, attrs: { level: 2 }, content: [{ type: 'text', text }] }
        : { type, content: [{ type: 'text', text }] },
    ),
  },
});
test('front-page teasers skip subtitles and stop at a word with one ellipsis', () => {
  const opening = 'Prva rečenica teksta. Druga rečenica, nešto duža od prve.';
  assert.equal(
    excerpt(
      prose(
        ['heading', 'Uvod'],
        ['paragraph', 'PJESNIK POETSKIH MEDALjONA.'],
        ['paragraph', opening],
        ['paragraph', 'Treći pasus.'],
      ),
    ),
    `${opening} Treći pasus.`,
  );
  assert.equal(excerpt(prose(['paragraph', 'Ljubav je bila ogromna.'])), 'Ljubav je bila ogromna.');
  const long = excerpt(prose(['paragraph', 'riječ '.repeat(100)]), 40);
  assert.ok(long.length <= 41 && long.endsWith('riječ…'), long);
  assert.equal(excerpt(prose(['paragraph', 'SVE VELIKIM SLOVIMA.'])), 'SVE VELIKIM SLOVIMA.');
});
test('picture srcsets list each smaller size the display picture has', () => {
  assert.equal(mediaSrcSet({ url: '/media/a', width: 600, height: 400 }), undefined);
  assert.equal(
    mediaSrcSet({ url: '/media/a', width: 900, height: 600 }),
    '/media/a?size=small 640w, /media/a 900w',
  );
  assert.equal(
    mediaSrcSet({ url: '/media/a', width: 1800, height: 1200 }),
    '/media/a?size=small 640w, /media/a?size=medium 1080w, /media/a 1800w',
  );
  // A portrait picture's sizes are bounded by its height, so they are narrower than the bound.
  assert.equal(
    mediaSrcSet({ url: '/dev-art?kind=portrait', width: 1572, height: 1800 }),
    '/dev-art?kind=portrait&size=small 559w, /dev-art?kind=portrait&size=medium 943w, /dev-art?kind=portrait 1572w',
  );
});
