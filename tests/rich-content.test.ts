import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodySchema, canonicalRichNode, type RichNode } from '../src/lib/content';
test('Tiptap link defaults do not prevent a legitimate draft save', () => {
  const doc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Pročitajte',
            marks: [
              {
                type: 'link',
                attrs: {
                  href: 'https://example.org/djelo',
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  class: null,
                },
              },
            ],
          },
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 4, type: null },
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Četvrto' }] }],
          },
        ],
      },
    ],
  } as unknown as RichNode;
  const clean = canonicalRichNode(doc);
  assert.equal(bodySchema.safeParse({ kind: 'prose', doc: clean }).success, true);
  assert.equal(clean.content?.[1].attrs?.start, 4);
  assert.deepEqual(clean.content?.[0].content?.[0].marks?.[0].attrs, {
    href: 'https://example.org/djelo',
  });
});
test('all text colours meet AA contrast on the paper background', () => {
  const luminance = (hex: string) => {
    const c = hex
      .match(/\w\w/g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const ink of ['20251f', '173a2b', '4a181b', '626359'])
    assert.ok((luminance('f6f2e9') + 0.05) / (luminance(ink) + 0.05) >= 4.5, ink);
});
