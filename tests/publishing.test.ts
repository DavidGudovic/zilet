import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisionSchema } from '../src/lib/publishing';
import poem from '../fixtures/poem.json';
test('revision rejects an unknown rubric, missing author and unsafe media metadata', () => {
  const valid = {
    title: poem.title,
    intro: '',
    authorId: 'zoran',
    type: 'poem',
    body: { kind: 'poem', text: poem.text, emphasis: [], align: 'left' },
    rubrics: ['poezija'],
    media: [],
    commentsOpen: true,
  };
  assert.equal(revisionSchema.parse(valid).body.kind, 'poem');
  assert.throws(() => revisionSchema.parse({ ...valid, rubrics: ['unknown'] }));
  assert.throws(() => revisionSchema.parse({ ...valid, type: 'prose' }));
});
