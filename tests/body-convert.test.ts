import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertBody, kindForRubric } from '../src/lib/body-convert';
import { bodySchema, bodyText, type Body } from '../src/lib/content';

test('each rubric has one way of writing: verse only for poetry', () => {
  assert.equal(kindForRubric('poezija'), 'poem');
  assert.equal(kindForRubric('slikarstvo'), 'gallery');
  for (const rubric of ['novosti', 'proza', 'price', 'eseji', 'film', 'muzika'])
    assert.equal(kindForRubric(rubric), 'prose');
});

test('text pasted before choosing Novosti becomes paragraphs without losing words or emphasis', () => {
  const text = 'Naslov vijesti\nPrvi red.\n\n\nDrugi pasus sa **naglaskom**.\n';
  const from = text.indexOf('naglaskom');
  const poem: Body = {
    kind: 'poem',
    text,
    align: 'left',
    emphasis: [{ from, to: from + 'naglaskom'.length, style: 'bold' }],
  };
  const { body, lossy } = convertBody(poem, 'prose');
  assert.equal(lossy, false);
  assert.ok(bodySchema.safeParse(body).success);
  if (body.kind !== 'prose') return assert.fail('Novosti must be formatted text');
  assert.equal(body.doc.content?.length, 2);
  assert.deepEqual(body.doc.content?.[0], {
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Naslov vijesti' },
      { type: 'hardBreak' },
      { type: 'text', text: 'Prvi red.' },
    ],
  });
  const bold = body.doc.content?.[1].content?.find((n) => n.marks?.length);
  assert.deepEqual(bold, { type: 'text', text: 'naglaskom', marks: [{ type: 'bold' }] });
  assert.equal(bodyText(body), 'Naslov vijesti\nPrvi red.\n\nDrugi pasus sa **naglaskom**.\n');
});

test('prose moved to poetry keeps lines and emphasis; only structure is reported as lost', () => {
  const plain: Body = {
    kind: 'prose',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Prvi ' },
            { type: 'text', text: 'stih', marks: [{ type: 'italic' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'drugi' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Strofa' }] },
      ],
    },
  };
  const verse = convertBody(plain, 'poem');
  assert.equal(verse.lossy, false);
  assert.deepEqual(verse.body, {
    kind: 'poem',
    text: 'Prvi stih\ndrugi\n\nStrofa',
    align: 'left',
    emphasis: [{ from: 5, to: 9, style: 'italic' }],
  });
  assert.ok(bodySchema.safeParse(verse.body).success);
  assert.deepEqual(convertBody(verse.body, 'prose').body, plain);
  const structured: Body = {
    kind: 'prose',
    doc: {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'X' }] }],
    },
  };
  assert.equal(convertBody(structured, 'poem').lossy, true);
  assert.deepEqual(convertBody(structured, 'gallery'), {
    body: { kind: 'gallery', doc: structured.doc },
    lossy: false,
  });
});
